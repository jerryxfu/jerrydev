"""
Figures for MEDIVE devlog #1: the frozen SapBERT embedding map, clean vs typos.

Reads the caches of the experiment repo (git-ignored there, so this script lives with the blog):
    data/processed/embeddings/sapbert/test/tier{0,3}.npy   mean-pooled SapBERT vectors, [10000, 768]
    data/processed/rendered/test/tier{0,3}.jsonl           the rendered notes with labels
    experiments/predictions/{m1_text,b1_tfidf}_s0_t3.npy   seed-0 probabilities at tier 3

Run from anywhere with the experiment repo's environment:
    uv run --with umap-learn --project ~/code/repos/medive-mvp python medive_embedding_map.py [--medive PATH] [--out DIR]

Outputs, into src/assets/blog/medive/ by default:
    fig_embedding_map.png     three panels: clean (UMAP), typos projected into the same map, and each patient's drift
    fig_embedding_drift.png   how far vectors move and what it costs, M1 against B1
    embedding_stats.json      every number quoted in the post, so none is typed by hand
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from sklearn.decomposition import PCA  # noqa: E402
from sklearn.manifold import TSNE  # noqa: E402

SEED = 0
N_MAP = 4000  # patients drawn on the map; all 10,000 go into the statistics
N_DRIFT_LINES = 600  # patients whose clean→typo movement is drawn as a line
TOP_CLASSES = 10  # pathologies that get a colour; the rest are grey
GREY, RED, BLUE, INK = "#b8b8b8", "#d64545", "#2f6fd0", "#1a1a1a"
M1_COLOUR, B1_COLOUR = "#00a676", "#5fb8ee"  # same hues as the experiment repo's palette


def read_jsonl(path: Path) -> list[dict]:
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def words(text: str) -> set[str]:
    return {w.strip(".,:;()").lower() for w in text.split()}


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--medive", default=str(Path.home() / "code/repos/medive-mvp"))
    p.add_argument("--out", default=str(Path(__file__).resolve().parents[1] / "../../assets/blog/medive"))
    a = p.parse_args()
    root, out = Path(a.medive), Path(a.out).resolve()
    out.mkdir(parents=True, exist_ok=True)

    # ---- load -------------------------------------------------------------------------------------------------------
    x0 = np.load(root / "data/processed/embeddings/sapbert/test/tier0.npy")
    x3 = np.load(root / "data/processed/embeddings/sapbert/test/tier3.npy")
    rows0 = read_jsonl(root / "data/processed/rendered/test/tier0.jsonl")
    rows3 = read_jsonl(root / "data/processed/rendered/test/tier3.jsonl")
    labels = json.loads((root / "data/processed/labels.json").read_text())
    assert [r["id"] for r in rows0] == [r["id"] for r in rows3], "tier files list patients in different orders"
    y = np.array([r["y"] for r in rows0])
    n = len(y)
    assert x0.shape[0] == x3.shape[0] == n

    p_m1 = np.load(root / "experiments/predictions/m1_text_s0_t3.npy")
    p_b1 = np.load(root / "experiments/predictions/b1_tfidf_s0_t3.npy")
    m1_ok = p_m1.argmax(1) == y
    b1_ok = p_b1.argmax(1) == y
    # Guard against the predictions being in a different order from the rendered file: the result JSON says 0.8323.
    ref = json.loads((root / "experiments/results/m1_text_s0_t3.json").read_text())["metrics"]["acc@1"]
    assert abs(m1_ok.mean() - ref) < 1e-6, f"acc@1 from predictions {m1_ok.mean():.4f} != result file {ref}"

    # ---- statistics over all patients ------------------------------------------------------------------------------
    # Cosine distance between a patient's clean vector and its typo vector.
    u0 = x0 / np.linalg.norm(x0, axis=1, keepdims=True)
    u3 = x3 / np.linalg.norm(x3, axis=1, keepdims=True)
    drift = 1.0 - (u0 * u3).sum(1)

    # Corrupted words per note: words in the typo note that never appear in the clean note of the same patient.
    corrupted = np.array([len(words(r3["text"]) - words(r0["text"])) for r0, r3 in zip(rows0, rows3)])

    # Nearest-neighbour test: does the typo vector still sit closest to its own clean vector?
    # Chunked so the [10000, 10000] similarity matrix never has to exist at once.
    nn_same = np.zeros(n, dtype=bool)
    for s in range(0, n, 1000):
        sims = u3[s : s + 1000] @ u0.T
        nn_same[s : s + 1000] = sims.argmax(1) == np.arange(s, min(s + 1000, n))

    # Accuracy against how many words were corrupted, in bins wide enough to hold a few hundred patients each.
    edges = [0, 5, 10, 15, 20, 25, 30, 40, 60]
    bins = np.digitize(corrupted, edges[1:], right=False)
    acc_rows = []
    for b in range(len(edges) - 1):
        m = bins == b
        if m.sum() == 0:
            continue
        acc_rows.append(
            {
                "words": f"{edges[b]}–{edges[b + 1] - 1}",
                "n": int(m.sum()),
                "m1_acc1": float(m1_ok[m].mean() * 100),
                "b1_acc1": float(b1_ok[m].mean() * 100),
                "mean_drift": float(drift[m].mean()),
            }
        )

    stats = {
        "n_test": int(n),
        "seed": SEED,
        "drift_mean": float(drift.mean()),
        "drift_median": float(np.median(drift)),
        "drift_p90": float(np.percentile(drift, 90)),
        "drift_mean_m1_right": float(drift[m1_ok].mean()),
        "drift_mean_m1_wrong": float(drift[~m1_ok].mean()),
        "m1_acc1_tier3": float(m1_ok.mean() * 100),
        "b1_acc1_tier3": float(b1_ok.mean() * 100),
        "corrupted_words_mean": float(corrupted.mean()),
        "corrupted_words_median": float(np.median(corrupted)),
        "nn_same_patient_share": float(nn_same.mean() * 100),
        "acc_by_corrupted_words": acc_rows,
    }

    # ---- WordPiece counts (mechanism, not a model result) ----------------------------------------------------------
    try:
        from transformers import AutoTokenizer

        tok = AutoTokenizer.from_pretrained("cambridgeltl/SapBERT-from-PubMedBERT-fulltext", local_files_only=True)
        pieces0 = np.array([len(tok.tokenize(r["text"])) for r in rows0])
        pieces3 = np.array([len(tok.tokenize(r["text"])) for r in rows3])
        stats["wordpiece"] = {
            "pieces_mean_clean": float(pieces0.mean()),
            "pieces_mean_typos": float(pieces3.mean()),
            "share_over_128_clean": float((pieces0 > 128).mean() * 100),
            "share_over_128_typos": float((pieces3 > 128).mean() * 100),
            "examples": {
                w: tok.tokenize(w)
                for w in ["significantly", "signifcantly", "cough", "couhg", "symptoms", "sypmtoms", "heavy", "hevay"]
            },
        }
    except Exception as e:  # tokenizer not cached: the figures still get drawn
        stats["wordpiece"] = {"error": str(e)}

    (out / "embedding_stats.json").write_text(json.dumps(stats, indent=2))

    # ---- the map ---------------------------------------------------------------------------------------------------
    rng = np.random.default_rng(SEED)
    idx = np.sort(rng.choice(n, size=N_MAP, replace=False))
    # UMAP is fitted on the clean notes only, and the typo notes are dropped into that fixed map, so a patient's
    # movement is measured against a map that did not see the typos. Falls back to a joint t-SNE if umap is absent
    # (run with `uv run --with umap-learn ...` to have it).
    pca = PCA(n_components=50, random_state=SEED).fit(x0[idx])
    try:
        import umap

        reducer = umap.UMAP(n_neighbors=30, min_dist=0.1, metric="cosine", random_state=SEED)
        z0 = reducer.fit_transform(pca.transform(x0[idx]))
        z3 = reducer.transform(pca.transform(x3[idx]))
        method = "UMAP fitted on the clean notes, typo notes projected into it"
    except ImportError:
        both = np.vstack([x0[idx], x3[idx]])
        z = TSNE(n_components=2, perplexity=40, init="pca", random_state=SEED, max_iter=1000).fit_transform(pca.transform(both))
        z0, z3 = z[:N_MAP], z[N_MAP:]
        method = "t-SNE of the clean and typo notes together"
    stats["map_method"] = method
    (out / "embedding_stats.json").write_text(json.dumps(stats, indent=2))

    top = [c for c, _ in Counter(y[idx].tolist()).most_common(TOP_CLASSES)]
    cmap = plt.get_cmap("tab10")
    colour_of = {c: cmap(i) for i, c in enumerate(top)}
    yy = y[idx]
    ok = m1_ok[idx]

    fig, axes = plt.subplots(1, 3, figsize=(16, 5.6), dpi=170)
    fig.patch.set_facecolor("white")

    def scatter(ax, zz, title):
        rest = ~np.isin(yy, top)
        ax.scatter(zz[rest, 0], zz[rest, 1], s=4, c=GREY, alpha=0.35, linewidths=0, label="_")
        for c in top:
            m = yy == c
            ax.scatter(zz[m, 0], zz[m, 1], s=6, color=colour_of[c], alpha=0.8, linewidths=0, label=labels[c])
        ax.set_title(title, fontsize=13)
        ax.set_xticks([])
        ax.set_yticks([])
        for s in ax.spines.values():
            s.set_color("#cccccc")

    scatter(axes[0], z0, "Tier 0, clean text")
    scatter(axes[1], z3, "Tier 3, typos (same patients)")

    ax = axes[2]
    ax.scatter(z0[:, 0], z0[:, 1], s=3, c=GREY, alpha=0.25, linewidths=0)
    li = rng.choice(N_MAP, size=N_DRIFT_LINES, replace=False)
    for i in li:
        c = RED if not ok[i] else BLUE
        ax.plot([z0[i, 0], z3[i, 0]], [z0[i, 1], z3[i, 1]], color=c, lw=0.7, alpha=0.55 if ok[i] else 0.9)
    ax.plot([], [], color=BLUE, lw=1.5, label="M1 still right at rank 1")
    ax.plot([], [], color=RED, lw=1.5, label="M1 wrong after typos")
    ax.legend(loc="lower left", fontsize=9, frameon=True)
    ax.set_title(f"Where {N_DRIFT_LINES} patients move, clean → typos", fontsize=13)
    ax.set_xticks([])
    ax.set_yticks([])
    for s in ax.spines.values():
        s.set_color("#cccccc")

    handles, names = axes[0].get_legend_handles_labels()
    fig.legend(
        handles, names, loc="lower center", ncol=5, fontsize=9, frameon=False, markerscale=2.5,
        bbox_to_anchor=(0.5, -0.02),
    )
    fig.suptitle(
        f"Frozen SapBERT vectors of {N_MAP:,} test patients. {method} ({TOP_CLASSES} most frequent pathologies coloured)",
        fontsize=12,
    )
    fig.tight_layout(rect=(0, 0.08, 1, 0.95))
    fig.savefig(out / "fig_embedding_map.png", bbox_inches="tight", facecolor="white")
    plt.close(fig)

    # ---- drift and cost --------------------------------------------------------------------------------------------
    fig, axes = plt.subplots(1, 2, figsize=(13, 5), dpi=170)
    fig.patch.set_facecolor("white")

    ax = axes[0]
    hi = np.percentile(drift, 99.5)
    b = np.linspace(0, hi, 45)
    ax.hist(drift[m1_ok], bins=b, color=BLUE, alpha=0.75, label=f"M1 right at rank 1 (n = {m1_ok.sum():,})")
    ax.hist(drift[~m1_ok], bins=b, color=RED, alpha=0.75, label=f"M1 wrong (n = {(~m1_ok).sum():,})")
    ax.axvline(drift[m1_ok].mean(), color=BLUE, ls="--", lw=1.2)
    ax.axvline(drift[~m1_ok].mean(), color=RED, ls="--", lw=1.2)
    ax.set_xlabel("Cosine distance between a patient's clean vector and its typo vector")
    ax.set_ylabel("Patients")
    ax.set_title("How far each vector moves (dashed: group means)", fontsize=12)
    ax.legend(fontsize=9)
    ax.grid(axis="y", alpha=0.3)

    ax = axes[1]
    xs = np.arange(len(acc_rows))
    ax.plot(xs, [r["m1_acc1"] for r in acc_rows], marker="o", color=M1_COLOUR, lw=2.2, label="M1 SapBERT text-only")
    ax.plot(xs, [r["b1_acc1"] for r in acc_rows], marker="s", color=B1_COLOUR, lw=2.2, label="B1 TF-IDF + LR")
    ax.set_xticks(xs)
    ax.set_xticklabels([f"{r['words']}\n(n = {r['n']:,})" for r in acc_rows], fontsize=8.5)
    ax.set_xlabel("Corrupted words in the note")
    ax.set_ylabel("Acc@1 at tier 3 (%)")
    ax.set_ylim(0, 102)
    ax.set_title("What the drift costs, seed 0", fontsize=12)
    ax.legend(fontsize=9, loc="lower left")
    ax.grid(alpha=0.3)

    fig.tight_layout()
    fig.savefig(out / "fig_embedding_drift.png", bbox_inches="tight", facecolor="white")
    plt.close(fig)

    print(json.dumps({k: v for k, v in stats.items() if k != "acc_by_corrupted_words"}, indent=2))
    for r in acc_rows:
        print(r)


if __name__ == "__main__":
    main()
