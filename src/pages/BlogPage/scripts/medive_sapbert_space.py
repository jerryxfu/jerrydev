"""
Figures for MEDIVE devlog #1: what frozen SapBERT's space looks like, beyond the patient map.

    fig_disease_names.png    the 49 pathology names, PCA: the shared map (also used by the reference sheet)
    fig_disease_maps.png     the note centroids rotated onto that map (Procrustes), beside the name → note movement lines
    fig_disease_cases.png    the nearest neighbours of two pathologies, by SapBERT notes and by DDXPlus symptom lists
    fig_disease_region.png   how central each pathology is against how long its notes are: the short-note block
    fig_disease_heatmap.png  49 x 49 cosine similarity of the note centroids, clustered, with M1's rank-1 confusions marked
    fig_phrase_map.png       canonical symptom phrases and their lay paraphrases (tier 2), UMAP, lines joining each pair
    fig_word_typos.png       how far a single word's vector moves per character edit
    sapbert_space_stats.json every number quoted in the post

Reads the experiment repo's lexicons, labels, cached test embeddings and seed-0 predictions. Small SapBERT jobs
(49 names, a few hundred phrases and words) run on CPU inside this script. Run with umap layered on the repo's env:

    uv run --with umap-learn --with adjustText --project ~/code/repos/medive-mvp python medive_sapbert_space.py

The blog column is 62ch wide, so panels are stacked, never side by side, and labels are pushed apart with adjustText
(optional: without it the labels are placed with a fixed offset and may overlap).
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import yaml  # noqa: E402
from scipy.cluster.hierarchy import fcluster, leaves_list, linkage  # noqa: E402
from scipy.linalg import orthogonal_procrustes  # noqa: E402
from sklearn.decomposition import PCA  # noqa: E402

SEED = 0
MODEL = "cambridgeltl/SapBERT-from-PubMedBERT-fulltext"
GREY, RED, BLUE, GREEN, INK = "#b8b8b8", "#d64545", "#2f6fd0", "#2f9e68", "#1a1a1a"
WORDS = ["cough", "fever", "headache", "nausea", "dizziness", "fatigue", "sweating", "wheezing", "vomiting", "palpitations"]
N_TOP_CONFUSIONS = 8
CASES = ["Stable angina", "Inguinal hernia"]  # a neighbourhood that reads medically, and one that does not
N_CASE_NEIGHBOURS = 6
N_MOVE_LABELS = 10


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
    sys.path.insert(0, str(root))  # experiments/ is a package at the repo root, not under src/
    from experiments.viz import pathology_colours  # one fixed colour per pathology, shared with the essay figures

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

    # ---- 1 + 2: the 49 diseases, as note centroids and as names ------------------------------------------------------
    centroids = np.stack([x0[y == c].mean(0) for c in range(n_classes)])
    counts = np.bincount(y, minlength=n_classes)
    names = embed(labels)
    templates = yaml.safe_load((root / "data/lexicons/templates_en.yaml").read_text())

    study = pathology_colours(labels)
    cols = [study[name] for name in labels]
    plt.rcParams.update({"font.size": 12})

    def label_points(ax, z, texts, fontsize, colors=None):
        # Plain text artists at the data coordinates: adjustText reads each label's start from get_position(), so an
        # annotation with an offset in points would start every label at the same spot and explode them outward.
        arts = [
            ax.text(z[i, 0], z[i, 1], t, fontsize=fontsize, color=INK if colors is None else colors[i], zorder=4)
            for i, t in enumerate(texts)
        ]
        ax.margins(0.08)  # fix the limits first: adjustText keeps labels inside the axes as they are at call time
        try:
            from adjustText import adjust_text

            adjust_text(arts, x=z[:, 0], y=z[:, 1], ax=ax, expand=(1.15, 1.35), arrowprops=dict(arrowstyle="-", color="#999999", lw=0.5))
        except ImportError:
            for a, (px, py) in zip(arts, z, strict=True):
                a.set_position((px, py))
                a.set_verticalalignment("bottom")

    # One shared map for both views. The names' own PCA is the map. The note centroids are first rotated onto the
    # names in the full 768-d space (orthogonal Procrustes: each cloud centred and scaled to unit size, then the
    # rotation that best overlays them), then drawn through the same PCA, so the leftover disagreement can be drawn
    # as one line per pathology, like the clean → typo lines on the patient map.
    def standardise(v: np.ndarray) -> np.ndarray:
        v = unit(v)
        v = v - v.mean(0)
        return v / np.linalg.norm(v)

    a_notes, b_names = standardise(centroids), standardise(names)
    rot, _ = orthogonal_procrustes(a_notes, b_names)
    a_rot = a_notes @ rot
    pca_names = PCA(n_components=2, random_state=SEED).fit(b_names)
    zn, zc = pca_names.transform(b_names), pca_names.transform(a_rot)
    move = np.linalg.norm(a_rot - b_names, axis=1)  # per-pathology disagreement, in the full space
    ev_notes = float(PCA(n_components=2, random_state=SEED).fit(unit(centroids)).explained_variance_ratio_.sum())
    ev_names = float(pca_names.explained_variance_ratio_.sum())

    # -- the big map: the names on their own
    fig, ax = plt.subplots(figsize=(11, 9.5), dpi=170)
    fig.patch.set_facecolor("white")
    ax.scatter(zn[:, 0], zn[:, 1], s=70, c=cols, alpha=0.9, linewidths=0.4, edgecolors="white", zorder=3)
    label_points(ax, zn, labels, 9.5)
    ax.set_title("The 49 DDXPlus pathology names as SapBERT embeds them (PCA to two dimensions)", fontsize=13)
    clean_axes(ax)
    fig.tight_layout()
    fig.savefig(out / "fig_disease_names.png", bbox_inches="tight", facecolor="white")
    plt.close(fig)

    # -- the pair: the notes on the same map, beside where each pathology moves
    both = np.vstack([zn, zc])
    lo, hi = both.min(0), both.max(0)
    pad = 0.1 * (hi - lo)
    fig, axes = plt.subplots(1, 2, figsize=(16, 8.6), dpi=170)
    fig.patch.set_facecolor("white")
    ax = axes[0]
    ax.scatter(zc[:, 0], zc[:, 1], s=30 + 5 * np.sqrt(counts), c=cols, alpha=0.9, linewidths=0.4, edgecolors="white", zorder=3)
    ax.set_xlim(lo[0] - pad[0], hi[0] + pad[0])
    ax.set_ylim(lo[1] - pad[1], hi[1] + pad[1])
    label_points(ax, zc, labels, 9)
    ax.text(0.01, 0.01, "dot size: number of test patients", transform=ax.transAxes, fontsize=10, color="#666666")
    ax.set_title("From the notes: each pathology's mean patient vector,\nrotated onto the name map", fontsize=13)
    clean_axes(ax)
    ax = axes[1]
    ax.scatter(zn[:, 0], zn[:, 1], s=26, c=GREY, alpha=0.6, linewidths=0, zorder=2)
    for i in range(n_classes):
        ax.plot([zn[i, 0], zc[i, 0]], [zn[i, 1], zc[i, 1]], color=cols[i], lw=1.6, alpha=0.9, zorder=3)
        ax.scatter(zc[i, 0], zc[i, 1], s=22, color=cols[i], linewidths=0, zorder=4)
    top_move = np.argsort(-move)[:N_MOVE_LABELS]
    ax.set_xlim(lo[0] - pad[0], hi[0] + pad[0])
    ax.set_ylim(lo[1] - pad[1], hi[1] + pad[1])
    label_points(ax, zc[top_move], [labels[i] for i in top_move], 9)
    ax.set_title(f"Where each pathology moves, name (grey) → notes (coloured).\nThe {N_MOVE_LABELS} biggest moves are labelled", fontsize=13)
    clean_axes(ax)
    fig.tight_layout(w_pad=3)
    fig.savefig(out / "fig_disease_maps.png", bbox_inches="tight", facecolor="white")
    plt.close(fig)

    # -- do the two views agree? neighbour overlap, spread, and the Procrustes leftover
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
    iu = np.triu_indices(n_classes, k=1)
    stats["views_spread"] = {
        "notes_pairwise_cosine_mean": float(sc[iu].mean()),
        "notes_pairwise_cosine_min": float(sc[iu].min()),
        "names_pairwise_cosine_mean": float(sn[iu].mean()),
        "names_pairwise_cosine_min": float(sn[iu].min()),
        "pca_variance_kept_notes": ev_notes,
        "pca_variance_kept_names": ev_names,
    }
    stats["procrustes"] = {
        "disparity": float(((a_rot - b_names) ** 2).sum()),  # 0 = same arrangement, 2 = nothing in common
        "most_moved": [[labels[i], float(move[i])] for i in np.argsort(-move)[:5]],
        "least_moved": [[labels[i], float(move[i])] for i in np.argsort(move)[:5]],
    }

    # -- what the note view actually tracks: DDXPlus symptom-list overlap, note length, age
    ages = np.array([r["age"] for r in rows0])
    n_evid = np.array([len(r["evidences"]) for r in rows0])
    n_words = np.array([r["n_words"] for r in rows0])
    freq: list[dict[str, float]] = [{} for _ in range(n_classes)]
    for r in rows0:
        for e in r["evidences"]:
            base = e.split("_@_")[0]
            freq[r["y"]][base] = freq[r["y"]].get(base, 0.0) + 1.0 / counts[r["y"]]

    def profile_cosine(i: int, j: int) -> float:
        keys = set(freq[i]) | set(freq[j])
        va = np.array([freq[i].get(e, 0.0) for e in keys])
        vb = np.array([freq[j].get(e, 0.0) for e in keys])
        return float(va @ vb / (np.linalg.norm(va) * np.linalg.norm(vb)))

    so = np.array([[profile_cosine(i, j) if i != j else -1.0 for j in range(n_classes)] for i in range(n_classes)])
    mean_age = np.array([ages[y == c].mean() for c in range(n_classes)])
    mean_evid = np.array([n_evid[y == c].mean() for c in range(n_classes)])
    mean_words = np.array([n_words[y == c].mean() for c in range(n_classes)])
    stats["what_drives_similarity"] = {
        "corr_with_symptom_list_overlap": float(np.corrcoef(sc[iu], so[iu])[0, 1]),
        "corr_with_evidence_count_gap": float(np.corrcoef(sc[iu], np.abs(mean_evid[:, None] - mean_evid[None, :])[iu])[0, 1]),
        "corr_with_age_gap": float(np.corrcoef(sc[iu], np.abs(mean_age[:, None] - mean_age[None, :])[iu])[0, 1]),
    }

    # Each pathology's nearest neighbours in the three views, so the post can quote any of them by name.
    stats["neighbours"] = {
        labels[i]: {
            "notes": [labels[j] for j in np.argsort(-sc[i])[:3]],
            "names": [labels[j] for j in np.argsort(-sn[i])[:3]],
            "symptom_lists": [labels[j] for j in np.argsort(-so[i])[:3]],
            "overlap5": overlap[i],
            "mean_evidences": float(mean_evid[i]),
            "mean_words": float(mean_words[i]),
        }
        for i in range(n_classes)
    }
    stats["closest_name_pairs"] = [
        [labels[i], labels[j], float(sn[i, j])]
        for i, j in [tuple(np.unravel_index(t, sn.shape)) for t in np.argsort(-sn, axis=None)[: 2 * 6 : 2]]
    ]
    stats["closest_note_pairs"] = [
        [labels[i], labels[j], float(sc[i, j])]
        for i, j in [tuple(np.unravel_index(t, sc.shape)) for t in np.argsort(-sc, axis=None)[: 2 * 6 : 2]]
    ]

    # -- two cases: the neighbourhood of one pathology that reads medically, and of one that does not
    def phrase(code: str) -> str:
        t = templates.get(code)
        return t["phrase"] if isinstance(t, dict) and "phrase" in t else code

    stats["cases"] = {}
    fig, axes = plt.subplots(1, 2, figsize=(16, 6.2), dpi=170)
    fig.patch.set_facecolor("white")
    for ax, case in zip(axes, CASES, strict=True):
        i = labels.index(case)
        nb = np.argsort(-sc[i])[:N_CASE_NEIGHBOURS]
        shared = []
        for j in nb:
            common = sorted(set(freq[i]) & set(freq[j]), key=lambda e: -min(freq[i][e], freq[j][e]))[:4]
            shared.append([labels[j], [phrase(e) for e in common]])
        stats["cases"][case] = {
            "mean_evidences": float(mean_evid[i]),
            "neighbours": [[labels[j], float(sc[i, j]), float(so[i, j])] for j in nb],
            "shared_evidences": shared,
            "symptom_list_neighbours": [labels[j] for j in np.argsort(-so[i])[:N_CASE_NEIGHBOURS]],
        }
        ys = np.arange(len(nb))[::-1]
        ax.barh(ys + 0.2, [sc[i, j] for j in nb], height=0.38, color=[cols[j] for j in nb], label="SapBERT, from the notes")
        ax.barh(ys - 0.2, [so[i, j] for j in nb], height=0.38, color=[cols[j] for j in nb], alpha=0.45, hatch="///", label="DDXPlus symptom lists")
        ax.set_yticks(ys)
        ax.set_yticklabels([labels[j] for j in nb], fontsize=11)
        ax.set_xlim(0, 1)
        ax.set_xlabel("cosine similarity to " + case)
        ax.set_title(f"{case}: its {N_CASE_NEIGHBOURS} nearest pathologies by the notes", fontsize=13)
        ax.legend(loc="lower right", fontsize=10.5)
        ax.grid(axis="x", alpha=0.3)
    fig.tight_layout(w_pad=3)
    fig.savefig(out / "fig_disease_cases.png", bbox_inches="tight", facecolor="white")
    plt.close(fig)

    # -- the region: the heatmap's second block is the short-note block
    two = fcluster(linkage(unit(centroids), method="average", metric="cosine"), t=2, criterion="maxclust")
    small = min(set(two), key=lambda b: (two == b).sum())
    block = np.where(two == small)[0]
    rest = np.where(two != small)[0]
    centrality = np.array([sc[i][sc[i] > -1].mean() for i in range(n_classes)])
    stats["short_note_block"] = {
        "members": [labels[i] for i in block],
        "n": int(len(block)),
        "block_mean_evidences": float(mean_evid[block].mean()),
        "rest_mean_evidences": float(mean_evid[rest].mean()),
        "block_mean_words": float(mean_words[block].mean()),
        "rest_mean_words": float(mean_words[rest].mean()),
        "block_mean_age": float(mean_age[block].mean()),
        "rest_mean_age": float(mean_age[rest].mean()),
    }
    fig, ax = plt.subplots(figsize=(11, 8), dpi=170)
    fig.patch.set_facecolor("white")
    ax.scatter(mean_evid, centrality, s=70, c=cols, alpha=0.9, linewidths=0.4, edgecolors="white", zorder=3)
    label_points(ax, np.column_stack([mean_evid, centrality]), labels, 9)
    ax.set_xlabel("evidences per patient (mean), i.e. how long the notes are")
    ax.set_ylabel("mean cosine similarity to the other 48 pathologies")
    ax.set_title("How central a pathology is in SapBERT's note space, against how long its notes are", fontsize=13)
    ax.grid(alpha=0.3)
    fig.tight_layout()
    fig.savefig(out / "fig_disease_region.png", bbox_inches="tight", facecolor="white")
    plt.close(fig)

    # ---- 3: similarity heatmap with M1's confusions --------------------------------------------------------------------
    p_m1 = np.load(root / "experiments/predictions/m1_text_s0_t3.npy")
    pred = p_m1.argmax(1)
    conf = Counter((int(t), int(q)) for t, q in zip(y, pred) if t != q)
    top_conf = conf.most_common(N_TOP_CONFUSIONS)
    order = leaves_list(linkage(unit(centroids), method="average", metric="cosine"))
    sim = unit(centroids) @ unit(centroids).T

    fig, ax = plt.subplots(figsize=(12.5, 11.5), dpi=170)
    fig.patch.set_facecolor("white")
    im = ax.imshow(sim[np.ix_(order, order)], cmap="viridis", vmin=np.percentile(sim, 5), vmax=1.0)
    pos = {c: i for i, c in enumerate(order)}
    for (t, q), n in top_conf:
        ax.scatter(pos[q], pos[t], s=60 + n, facecolors="none", edgecolors=RED, linewidths=1.6)
        ax.text(pos[q] + 0.6, pos[t] + 0.15, str(n), color=RED, fontsize=9, va="center")
    ax.set_xticks(range(n_classes))
    ax.set_yticks(range(n_classes))
    ax.set_xticklabels([labels[c] for c in order], rotation=90, fontsize=8.5)
    ax.set_yticklabels([labels[c] for c in order], fontsize=8.5)
    for tick, c in zip(ax.get_xticklabels(), order):
        tick.set_color(study[labels[c]])
    for tick, c in zip(ax.get_yticklabels(), order):
        tick.set_color(study[labels[c]])
    ax.set_xlabel("predicted at rank 1 (for the red circles)", fontsize=11)
    ax.set_ylabel("true pathology", fontsize=11)
    ax.set_title(
        f"Cosine similarity between pathology centroids, clustered.\nRed circles: M1's {N_TOP_CONFUSIONS} most frequent rank-1 confusions at tier 3, seed 0",
        fontsize=13,
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
    fig, ax = plt.subplots(figsize=(11, 11), dpi=170)
    fig.patch.set_facecolor("white")
    for (i, _), pt in zip(lay_pairs, zl):
        ax.plot([zc[i, 0], pt[0]], [zc[i, 1], pt[1]], color=GREY, lw=0.7, alpha=0.8, zorder=1)
    ax.scatter(zl[:, 0], zl[:, 1], s=26, color=GREEN, alpha=0.85, linewidths=0, zorder=2, label="lay paraphrase (tier 2)")
    ax.scatter(zc[:, 0], zc[:, 1], s=46, color=BLUE, alpha=0.9, linewidths=0, zorder=3, label="canonical phrase (tier 0)")
    # label a readable subset: the canonical phrases with the shortest text
    shown = sorted(range(len(canon)), key=lambda i: len(canon[i]))[:40]
    label_points(ax, zc[shown], [canon[i] for i in shown], 8.5)
    ax.legend(loc="lower right", fontsize=11)
    ax.set_title(
        f"{len(canon)} symptom phrases and their {len(lay_pairs)} lay paraphrases in SapBERT's space (UMAP).\n"
        "A line joins each paraphrase to the phrase it replaces.",
        fontsize=13,
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

    fig, axes = plt.subplots(1, 2, figsize=(16, 6), dpi=170)
    fig.patch.set_facecolor("white")
    cmap = plt.get_cmap("tab10")
    xs = np.arange(1, max_edits + 1)
    for i, w in enumerate(WORDS):
        axes[0].plot(xs, curves[w], marker="o", ms=6, lw=2.2, color=cmap(i), label=w)
        axes[1].plot(xs, pieces[w], marker="o", ms=6, lw=2.2, color=cmap(i), label=w)
    axes[0].set_xlabel("character edits applied to the word")
    axes[0].set_ylabel("cosine distance from the clean word")
    axes[0].set_title(f"How far one word's vector moves\n(mean of {trials} random edit paths)", fontsize=13)
    axes[1].set_xlabel("character edits applied to the word")
    axes[1].set_ylabel("word pieces the tokeniser produces")
    axes[1].set_title("What WordPiece does to it\n(clean: one piece each, two for sweating and palpitations)", fontsize=13)
    for ax in axes:
        ax.set_xticks(xs)
        ax.grid(alpha=0.3)
    axes[1].legend(fontsize=10.5, ncol=2)
    fig.tight_layout(w_pad=3)
    fig.savefig(out / "fig_word_typos.png", bbox_inches="tight", facecolor="white")
    plt.close(fig)

    (out / "sapbert_space_stats.json").write_text(json.dumps(stats, indent=2))
    print(json.dumps({k: v for k, v in stats.items() if k != "word_typos"}, indent=2))


if __name__ == "__main__":
    main()
