"""
Figures for MEDIVE devlog #1: what frozen SapBERT's space looks like, beyond the patient map.

    fig_disease_maps.png     the 49 pathologies as note centroids (left) and as embedded names (right), PCA
    fig_disease_heatmap.png  49 x 49 cosine similarity of the note centroids, clustered, with M1's rank-1 confusions marked
    fig_phrase_map.png       canonical symptom phrases and their lay paraphrases (tier 2), UMAP, lines joining each pair
    fig_word_typos.png       how far a single word's vector moves per character edit
    sapbert_space_stats.json every number quoted in the post

Reads the experiment repo's lexicons, labels, cached test embeddings and seed-0 predictions. Small SapBERT jobs
(49 names, a few hundred phrases and words) run on CPU inside this script. Run with umap layered on the repo's env:

    uv run --with umap-learn --project ~/code/repos/medive-mvp python medive_sapbert_space.py
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
import yaml  # noqa: E402
from scipy.cluster.hierarchy import leaves_list, linkage  # noqa: E402
from sklearn.decomposition import PCA  # noqa: E402

SEED = 0
MODEL = "cambridgeltl/SapBERT-from-PubMedBERT-fulltext"
GREY, RED, BLUE, GREEN, INK = "#b8b8b8", "#d64545", "#2f6fd0", "#2f9e68", "#1a1a1a"
WORDS = ["cough", "fever", "headache", "nausea", "dizziness", "fatigue", "sweating", "wheezing", "vomiting", "palpitations"]
N_TOP_CONFUSIONS = 8


def unit(x: np.ndarray) -> np.ndarray:
    return x / np.linalg.norm(x, axis=1, keepdims=True)


def read_jsonl(path: Path) -> list[dict]:
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def edit_once(word: str, rng: np.random.Generator) -> str:
    """One character edit, the same three operations as the repo's TypoSubstituter: substitute, delete, transpose."""
    chars = list(word)
    pos = int(rng.integers(0, len(chars)))
    op = int(rng.integers(0, 3))
    if op == 0:
        choices = [c for c in "abcdefghijklmnopqrstuvwxyz" if c != chars[pos]]
        chars[pos] = choices[int(rng.integers(0, len(choices)))]
    elif op == 1 and len(chars) > 2:
        del chars[pos]
    else:
        nxt = pos + 1 if pos + 1 < len(chars) else pos - 1
        chars[pos], chars[nxt] = chars[nxt], chars[pos]
    return "".join(chars)


def clean_axes(ax):
    ax.set_xticks([])
    ax.set_yticks([])
    for s in ax.spines.values():
        s.set_color("#cccccc")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--medive", default=str(Path.home() / "code/repos/medive-mvp"))
    p.add_argument("--out", default=str(Path(__file__).resolve().parents[1] / "../../assets/blog/medive"))
    a = p.parse_args()
    root, out = Path(a.medive), Path(a.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(SEED)
    stats: dict = {"seed": SEED, "model": MODEL}

    from medive.features.text_embed import embed_texts
    from medive.data.perturb import TypoSubstituter
    from transformers import AutoModel, AutoTokenizer

    tok = AutoTokenizer.from_pretrained(MODEL, local_files_only=True)
    model = AutoModel.from_pretrained(MODEL, local_files_only=True)

    def embed(texts: list[str]) -> np.ndarray:
        return embed_texts(texts, MODEL, batch_size=64, max_length=64, device="cpu", model=model, tokenizer=tok, progress=False)

    # ---- data ------------------------------------------------------------------------------------------------------
    labels: list[str] = json.loads((root / "data/processed/labels.json").read_text())
    rows0 = read_jsonl(root / "data/processed/rendered/test/tier0.jsonl")
    y = np.array([r["y"] for r in rows0])
    x0 = np.load(root / "data/processed/embeddings/sapbert/test/tier0.npy")
    assert x0.shape[0] == len(y)
    n_classes = len(labels)

    # ---- 1 + 2: the 49 diseases, as note centroids and as names --------------------------------------------------------
    centroids = np.stack([x0[y == c].mean(0) for c in range(n_classes)])
    counts = np.bincount(y, minlength=n_classes)
    names = embed(labels)

    fig, axes = plt.subplots(1, 2, figsize=(17, 8.2), dpi=170)
    fig.patch.set_facecolor("white")
    for ax, vecs, title in [
        (axes[0], centroids, "From the notes: mean vector of each pathology's test patients"),
        (axes[1], names, "From the names: SapBERT on the 49 pathology names alone"),
    ]:
        z = PCA(n_components=2, random_state=SEED).fit_transform(unit(vecs))
        size = 18 + 4 * np.sqrt(counts) if vecs is centroids else 40
        ax.scatter(z[:, 0], z[:, 1], s=size, color=BLUE, alpha=0.75, linewidths=0)
        for i, name in enumerate(labels):
            ax.annotate(name, (z[i, 0], z[i, 1]), fontsize=6.8, color=INK, xytext=(3, 2), textcoords="offset points")
        ax.set_title(title, fontsize=12)
        clean_axes(ax)
    axes[0].text(0.01, 0.01, "dot size: number of test patients", transform=axes[0].transAxes, fontsize=8, color="#666666")
    fig.suptitle("Two views of the same 49 pathologies in SapBERT's space (PCA to two dimensions)", fontsize=13)
    fig.tight_layout(rect=(0, 0, 1, 0.96))
    fig.savefig(out / "fig_disease_maps.png", bbox_inches="tight", facecolor="white")
    plt.close(fig)

    # Do the two views agree? For each pathology, overlap of its 5 nearest neighbours in the two spaces.
    sc, sn = unit(centroids) @ unit(centroids).T, unit(names) @ unit(names).T
    np.fill_diagonal(sc, -1)
    np.fill_diagonal(sn, -1)
    k = 5
    overlap = [len(set(np.argsort(-sc[i])[:k]) & set(np.argsort(-sn[i])[:k])) / k for i in range(n_classes)]
    stats["views_agree"] = {
        "k": k,
        "mean_neighbour_overlap": float(np.mean(overlap)),
        "most_alike": [labels[i] for i in np.argsort(overlap)[::-1][:3]],
        "least_alike": [labels[i] for i in np.argsort(overlap)[:3]],
    }
    stats["closest_name_pairs"] = [
        [labels[i], labels[j], float(sn[i, j])]
        for i, j in [tuple(np.unravel_index(t, sn.shape)) for t in np.argsort(-sn, axis=None)[: 2 * 6: 2]]
    ]
    stats["closest_note_pairs"] = [
        [labels[i], labels[j], float(sc[i, j])]
        for i, j in [tuple(np.unravel_index(t, sc.shape)) for t in np.argsort(-sc, axis=None)[: 2 * 6: 2]]
    ]

    # ---- 3: similarity heatmap with M1's confusions --------------------------------------------------------------------
    p_m1 = np.load(root / "experiments/predictions/m1_text_s0_t3.npy")
    pred = p_m1.argmax(1)
    conf = Counter((int(t), int(q)) for t, q in zip(y, pred) if t != q)
    top_conf = conf.most_common(N_TOP_CONFUSIONS)
    order = leaves_list(linkage(unit(centroids), method="average", metric="cosine"))
    sim = unit(centroids) @ unit(centroids).T

    fig, ax = plt.subplots(figsize=(11, 10), dpi=170)
    fig.patch.set_facecolor("white")
    im = ax.imshow(sim[np.ix_(order, order)], cmap="viridis", vmin=np.percentile(sim, 5), vmax=1.0)
    pos = {c: i for i, c in enumerate(order)}
    for (t, q), n in top_conf:
        ax.scatter(pos[q], pos[t], s=60 + n, facecolors="none", edgecolors=RED, linewidths=1.6)
        ax.text(pos[q] + 0.6, pos[t] + 0.15, str(n), color=RED, fontsize=7.5, va="center")
    ax.set_xticks(range(n_classes))
    ax.set_yticks(range(n_classes))
    ax.set_xticklabels([labels[c] for c in order], rotation=90, fontsize=6.5)
    ax.set_yticklabels([labels[c] for c in order], fontsize=6.5)
    ax.set_xlabel("predicted at rank 1 (for the red circles)", fontsize=9)
    ax.set_ylabel("true pathology", fontsize=9)
    ax.set_title(
        f"Cosine similarity between pathology centroids, clustered.\nRed circles: M1's {N_TOP_CONFUSIONS} most frequent rank-1 confusions at tier 3, seed 0",
        fontsize=11,
    )
    fig.colorbar(im, ax=ax, fraction=0.03, pad=0.02)
    fig.tight_layout()
    fig.savefig(out / "fig_disease_heatmap.png", bbox_inches="tight", facecolor="white")
    plt.close(fig)

    # Are confusions between neighbours? Rank of the predicted class among the true class's centroid neighbours.
    ranks = []
    for (t, q), n in conf.items():
        nb = np.argsort(-sim[t])  # index 0 is t itself
        ranks.extend([int(np.where(nb == q)[0][0])] * n)
    ranks = np.array(ranks)
    stats["confusions"] = {
        "n_errors": int(ranks.size),
        "share_to_top3_neighbour": float((ranks <= 3).mean() * 100),
        "share_to_top5_neighbour": float((ranks <= 5).mean() * 100),
        "median_neighbour_rank": float(np.median(ranks)),
        "top": [[labels[t], labels[q], n] for (t, q), n in top_conf],
    }

    # ---- 4: canonical phrases vs lay paraphrases -------------------------------------------------------------------------
    templates = yaml.safe_load((root / "data/lexicons/templates_en.yaml").read_text())
    lay = yaml.safe_load((root / "data/lexicons/tier2_lay_paraphrases.yaml").read_text())
    codes = [c for c in lay if c in templates]
    canon = [templates[c]["phrase"] for c in codes]
    lay_pairs = [(i, alt) for i, c in enumerate(codes) for alt in lay[c]]
    typo = TypoSubstituter()
    typo_pairs = [(i, typo(c, ph, rng)) for i, (c, ph) in enumerate(zip(codes, canon))]

    e_canon = unit(embed(canon))
    e_lay = unit(embed([t for _, t in lay_pairs]))
    e_typo = unit(embed([t for _, t in typo_pairs]))

    def nn_acc(e_query: np.ndarray, targets: list[int]) -> tuple[float, np.ndarray]:
        s = e_query @ e_canon.T
        nn = s.argmax(1)
        own = s[np.arange(len(targets)), targets]
        return float((nn == np.array(targets)).mean() * 100), own

    lay_acc, lay_sim = nn_acc(e_lay, [i for i, _ in lay_pairs])
    typo_acc, typo_sim = nn_acc(e_typo, [i for i, _ in typo_pairs])
    stats["phrases"] = {
        "n_canonical": len(canon),
        "n_lay": len(lay_pairs),
        "lay_nn_accuracy": lay_acc,
        "typo_nn_accuracy": typo_acc,
        "lay_mean_similarity_to_own": float(lay_sim.mean()),
        "typo_mean_similarity_to_own": float(typo_sim.mean()),
        "lay_best": [[canon[i], t, float(s)] for (i, t), s in sorted(zip(lay_pairs, lay_sim), key=lambda z: -z[1])[:3]],
        "lay_worst": [[canon[i], t, float(s)] for (i, t), s in sorted(zip(lay_pairs, lay_sim), key=lambda z: z[1])[:3]],
    }

    import umap

    reducer = umap.UMAP(n_neighbors=12, min_dist=0.25, metric="cosine", random_state=SEED)
    z_all = reducer.fit_transform(np.vstack([e_canon, e_lay]))
    zc, zl = z_all[: len(canon)], z_all[len(canon):]
    fig, ax = plt.subplots(figsize=(12, 9), dpi=170)
    fig.patch.set_facecolor("white")
    for (i, _), pt in zip(lay_pairs, zl):
        ax.plot([zc[i, 0], pt[0]], [zc[i, 1], pt[1]], color=GREY, lw=0.7, alpha=0.8, zorder=1)
    ax.scatter(zl[:, 0], zl[:, 1], s=16, color=GREEN, alpha=0.85, linewidths=0, zorder=2, label="lay paraphrase (tier 2)")
    ax.scatter(zc[:, 0], zc[:, 1], s=30, color=BLUE, alpha=0.9, linewidths=0, zorder=3, label="canonical phrase (tier 0)")
    # label a readable subset: the canonical phrases with the shortest text
    for i in sorted(range(len(canon)), key=lambda i: len(canon[i]))[:40]:
        ax.annotate(canon[i], (zc[i, 0], zc[i, 1]), fontsize=6.5, color=INK, xytext=(3, 2), textcoords="offset points", zorder=4)
    ax.legend(loc="lower right", fontsize=9)
    ax.set_title(
        f"{len(canon)} symptom phrases and their {len(lay_pairs)} lay paraphrases in SapBERT's space (UMAP).\n"
        "A line joins each paraphrase to the phrase it replaces.",
        fontsize=11,
    )
    clean_axes(ax)
    fig.tight_layout()
    fig.savefig(out / "fig_phrase_map.png", bbox_inches="tight", facecolor="white")
    plt.close(fig)

    # ---- 5: one word, one edit at a time -------------------------------------------------------------------------------
    max_edits, trials = 5, 30
    curves = {}
    pieces = {}
    base = unit(embed(WORDS))
    for wi, w in enumerate(WORDS):
        dists = np.zeros((trials, max_edits))
        npc = np.zeros((trials, max_edits))
        for t in range(trials):
            cur = w
            variants = []
            for e in range(max_edits):
                cur = edit_once(cur, rng) if len(cur) > 2 else cur
                variants.append(cur)
            ev = unit(embed(variants))
            dists[t] = 1 - ev @ base[wi]
            npc[t] = [len(tok.tokenize(v)) for v in variants]
        curves[w] = dists.mean(0)
        pieces[w] = npc.mean(0)
    stats["word_typos"] = {
        "trials": trials,
        "mean_distance_by_edits": {w: [float(v) for v in c] for w, c in curves.items()},
        "mean_pieces_by_edits": {w: [float(v) for v in c] for w, c in pieces.items()},
        "pieces_clean": {w: len(tok.tokenize(w)) for w in WORDS},
        "distance_after_1_edit_mean": float(np.mean([c[0] for c in curves.values()])),
        "distance_after_3_edits_mean": float(np.mean([c[2] for c in curves.values()])),
    }

    fig, axes = plt.subplots(1, 2, figsize=(13, 5), dpi=170)
    fig.patch.set_facecolor("white")
    cmap = plt.get_cmap("tab10")
    xs = np.arange(1, max_edits + 1)
    for i, w in enumerate(WORDS):
        axes[0].plot(xs, curves[w], marker="o", lw=1.8, color=cmap(i), label=w)
        axes[1].plot(xs, pieces[w], marker="o", lw=1.8, color=cmap(i), label=w)
    axes[0].set_xlabel("character edits applied to the word")
    axes[0].set_ylabel("cosine distance from the clean word")
    axes[0].set_title(f"How far one word's vector moves (mean of {trials} random edit paths)", fontsize=11)
    axes[1].set_xlabel("character edits applied to the word")
    axes[1].set_ylabel("word pieces the tokeniser produces")
    axes[1].set_title("What WordPiece does to it (clean: one piece each, two for sweating and palpitations)", fontsize=11)
    for ax in axes:
        ax.set_xticks(xs)
        ax.grid(alpha=0.3)
    axes[1].legend(fontsize=8, ncol=2)
    fig.tight_layout()
    fig.savefig(out / "fig_word_typos.png", bbox_inches="tight", facecolor="white")
    plt.close(fig)

    (out / "sapbert_space_stats.json").write_text(json.dumps(stats, indent=2))
    print(json.dumps({k: v for k, v in stats.items() if k != "word_typos"}, indent=2))


if __name__ == "__main__":
    main()
