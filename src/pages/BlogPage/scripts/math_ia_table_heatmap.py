"""
Builds the heatmap of the "Comment GPT-2 range les nombres" post: the whole table of number
vectors (362 numbers x 768 coordinates), drawn three ways.

Needs numpy, matplotlib, torch and transformers. The math-mvp environment has them:

    uv run --project ~/code/repos/math-mvp python src/pages/BlogPage/scripts/math_ia_table_heatmap.py

Writes src/assets/blog/math_ia/table_heatmap.png.

This is a picture, not a measurement. Sorting the columns is done after looking at the data, so
no number in the post comes from here; the scores of the post come from math-mvp/ia/tables/.
The third panel is the control for that sorting: the same recipe applied to
shuffled numbers, which shows how much of a pattern sorting alone can create.
"""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from transformers import AutoModel, AutoTokenizer

OUT = Path(__file__).resolve().parents[3] / "assets" / "blog" / "math_ia"
MODEL = "openai-community/gpt2"
SEED = 0

# The dictionary rows of " 0" to " 361": the space form, every one a single token.
tok = AutoTokenizer.from_pretrained(MODEL)
wte = AutoModel.from_pretrained(MODEL).get_input_embeddings().weight.detach().numpy()
ids = []
for n in range(362):
    pieces = tok.encode(f" {n}")
    assert len(pieces) == 1, f"' {n}' is not a single token"
    ids.append(pieces[0])
table = wte[ids]
m, d = table.shape
print(f"table: {m} numbers x {d} coordinates")

# Centre each column, then give every column the same spread so that one colour scale fits all.
centred = table - table.mean(axis=0)
z = centred / centred.std(axis=0)
n = np.arange(m)


def corr_with(x: np.ndarray, columns: np.ndarray) -> np.ndarray:
    """Pearson's r between the list x and each column."""
    xc = x - x.mean()
    cc = columns - columns.mean(axis=0)
    return (xc @ cc) / np.sqrt((xc @ xc) * (cc * cc).sum(axis=0))


def draw(ax, data, title, xlabel):
    im = ax.imshow(data, aspect="auto", cmap="RdBu_r", vmin=-2.5, vmax=2.5, interpolation="nearest")
    ax.set_title(title, fontsize=11)
    ax.set_xlabel(xlabel, fontsize=10)
    ax.tick_params(labelsize=8)
    return im


# The whole table, three ways.
order = np.argsort(corr_with(n, z))

rng = np.random.default_rng(SEED)
shuffled = z[rng.permutation(m)]                 # each vector gets a wrong number
order_shuffled = np.argsort(corr_with(n, shuffled))

fig, axes = plt.subplots(1, 3, figsize=(15, 5.6), dpi=170, sharey=True)
draw(axes[0], z, "(a) le tableau, colonnes dans l'ordre de GPT-2", "coordonnée (1 à 768)")
draw(axes[1], z[:, order], "(b) les mêmes colonnes, triées selon leur lien avec n",
     "coordonnée, triée par corrélation avec n")
im = draw(axes[2], shuffled[:, order_shuffled], "(c) contrôle : nombres mélangés, puis même tri",
          "coordonnée, triée par corrélation avec n")
axes[0].set_ylabel("nombre n (une ligne par nombre)", fontsize=10)
axes[2].set_ylabel("ligne (les nombres sont mélangés)", fontsize=10)
axes[2].yaxis.set_label_position("right")
fig.suptitle("le dictionnaire de GPT-2 pour les nombres 0 à 361 : 362 lignes, 768 colonnes",
             fontsize=12)
fig.tight_layout(rect=(0, 0.08, 1, 0.96))
bar = fig.colorbar(im, ax=axes, orientation="horizontal", fraction=0.035, pad=0.16, aspect=60)
bar.set_label("valeur de la coordonnée, centrée et mise à la même échelle (en écarts-types)",
              fontsize=9)
bar.ax.tick_params(labelsize=8)
fig.savefig(OUT / "table_heatmap.png", facecolor="white")
plt.close(fig)
print("wrote", OUT / "table_heatmap.png")
