"""
Figure pour la leçon « Les AprilTags » : l'anatomie d'un tag 36h11, case par case.
Bordure blanche, bordure noire, grille de données 6 × 6, et la taille officielle FRC
mesurée sur le carré noir. Les étiquettes sont en anglais.

    python3 figure_tag_anatomy.py [chemin/vers/tag36_11_00000.png]

Les images officielles des tags viennent d'ici (10 px de côté, une case = un pixel) :
https://github.com/AprilRobotics/apriltag-imgs/tree/master/tag36h11

Fond blanc opaque, volontairement : la figure montre du vrai noir et du vrai blanc, et le
filtre d'inversion des thèmes sombres (classe .diagram) afficherait le tag à l'envers.
Ne PAS mettre className="diagram" sur cette image.
"""
import sys
from pathlib import Path

import matplotlib
import numpy as np
from PIL import Image

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

RED, BLUE, GREEN, INK, GREY = "#d64545", "#2f6fd0", "#2f9e68", "#1a1a1a", "#777777"

path = sys.argv[1] if len(sys.argv) > 1 else "src/assets/blog/robotics/tag36_11_00000.png"
tag = np.array(Image.open(path).convert("L"))
n = tag.shape[0]                      # 10 : bordure blanche + bordure noire + 6 + bordure noire + bordure blanche
data = n - 4                          # 6 cases de données par côté
black = n - 2                         # 8 cases : le carré noir, celui qu'on mesure
MM = 165.1                            # taille FRC du carré noir, en millimètres
print(f"{path}: {n}x{n} cases, {data}x{data} bits de données")

fig, ax = plt.subplots(figsize=(8.2, 7.4), dpi=170)
fig.patch.set_facecolor("white")
ax.imshow(tag, cmap="gray", vmin=0, vmax=255, interpolation="nearest", extent=(0, n, n, 0))

# quadrillage : une ligne par case, gris moyen pour rester visible sur le noir comme sur le blanc
for k in range(n + 1):
    ax.plot([k, k], [0, n], color="#999", lw=.6, zorder=3)
    ax.plot([0, n], [k, k], color="#999", lw=.6, zorder=3)

# contour extérieur (la bordure blanche se confond avec le fond de la figure)
ax.add_patch(Rectangle((0, 0), n, n, fill=False, edgecolor=GREY, lw=1.2, ls=(0, (4, 3)), zorder=4))
# la grille de données
ax.add_patch(Rectangle((2, 2), data, data, fill=False, edgecolor=RED, lw=2.6, zorder=5))
# le carré noir, celui dont la taille est connue
ax.add_patch(Rectangle((1, 1), black, black, fill=False, edgecolor=BLUE, lw=2.6, zorder=5))

# étiquettes, à droite du tag
arrow = dict(arrowstyle="-|>", lw=1.6, shrinkA=0, shrinkB=2)
ax.annotate("white border\n(1 cell, part of the tag)", xy=(n - .5, 2.5), xytext=(n + .9, 1.6),
            fontsize=10.5, color=GREY, va="center", arrowprops=dict(color=GREY, **arrow))
ax.annotate("black border\n(1 cell)", xy=(n - 1.5, 4.0), xytext=(n + .9, 3.7),
            fontsize=10.5, color=BLUE, va="center", arrowprops=dict(color=BLUE, **arrow))
ax.annotate(f"data grid\n{data} × {data} = {data * data} cells = {data * data} bits",
            xy=(n - 2.05, 6.0), xytext=(n + .9, 6.1),
            fontsize=10.5, color=RED, va="center", arrowprops=dict(color=RED, **arrow))

# cote : la taille officielle, mesurée sur le carré noir
y = n + .75
ax.annotate("", xy=(1, y), xytext=(1 + black, y), arrowprops=dict(arrowstyle="<|-|>", color=BLUE, lw=1.6, shrinkA=0, shrinkB=0))
ax.plot([1, 1], [n + .15, y + .35], color=BLUE, lw=1)
ax.plot([1 + black, 1 + black], [n + .15, y + .35], color=BLUE, lw=1)
ax.text(1 + black / 2, y + .45, f"{MM:.1f} mm (6.5 in): {black} cells of {MM / black:.1f} mm",
        color=BLUE, fontsize=11, ha="center", va="top")

ax.set_xlim(-.3, n + 6.2)
ax.set_ylim(n + 2.1, -.7)
ax.set_aspect("equal")
ax.axis("off")
ax.set_title("A 36h11 tag (id 0), cell by cell", fontsize=13, pad=8)

out = f"{Path(__file__).stem}.png"
fig.savefig(out, facecolor="white", bbox_inches="tight", pad_inches=.12)
print("->", out, Image.open(out).size)
