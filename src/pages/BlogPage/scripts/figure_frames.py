"""
Figure for the "Caméras et images" lesson: the four coordinate frames.
The image frame is a flat 2D panel; the three others are 3D axis triads drawn from
one shared viewpoint, so the differences between panels are real differences between
the frames and not differences in the drawing.

    python3 figure-frames.py
"""
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from PIL import Image

# X red, Y green, Z blue — the convention you meet everywhere, from AdvantageScope to Blender
X_C, Y_C, Z_C = "#d64545", "#2f9e68", "#2f6fd0"
INK, GREY, FAINT = "#1a1a1a", "#8a8a8a", "#d0d0d0"
ELEV, AZIM = 18, -58        # one shared viewpoint for the three 3D panels

# Each axis: label, arrow direction in the shared world (+x right, +y away, +z up), colour,
# then where the label sits and how it is aligned. mplot3d clips text at the edge of its box,
# so a long label goes *inside* the box (under its arrow) rather than past the arrowhead.
FRAMES = [
    ("Camera space", [
        ("X (right)",   (1, 0, 0),  X_C, (1.12, 0, 0),  "left"),
        ("Y (down)",    (0, 0, -1), Y_C, (0, 0, -1.3),  "center"),
        ("Z (forward)", (0, 1, 0),  Z_C, (0, 1.12, 0),  "left"),
    ]),
    ("Robot space", [
        ("X (forward)", (0, 1, 0),  X_C, (0, 1.12, 0),  "left"),
        ("Y (left)",    (-1, 0, 0), Y_C, (-1.12, 0, 0), "right"),
        ("Z (up)",      (0, 0, 1),  Z_C, (0, 0, 1.28),  "center"),
    ]),
    ("Field space", [
        ("X (away from\nblue wall)", (1, 0, 0), X_C, (.8, 0, -.5), "center"),
        ("Y (left)",                  (0, 1, 0), Y_C, (0, 1.12, 0), "left"),
        ("Z (up)",                    (0, 0, 1), Z_C, (0, 0, 1.28), "center"),
    ]),
]

fig = plt.figure(figsize=(11, 7.4), dpi=170)
fig.patch.set_alpha(0)


def title(ax, text):
    ax.set_title(text, fontsize=12.5, color=INK, fontweight="bold", pad=1)


# ------------------------------------------------------------ 1. image (2D)
ax = fig.add_subplot(2, 2, 1)
ax.patch.set_alpha(0)
title(ax, "Image space")
ax.add_patch(Rectangle((0, -2.4), 3.9, 2.4, fc=FAINT, alpha=.35, ec=GREY, lw=1.2, zorder=1))
for i in range(1, 6):
    ax.plot([i * .65, i * .65], [-2.4, 0], color="white", lw=1, zorder=2)
for j in range(1, 4):
    ax.plot([0, 3.9], [-j * .6, -j * .6], color="white", lw=1, zorder=2)
for (dx, dy), name, color, ha, va in [((2.1, 0), "u (right)", X_C, "left", "center"),
                                      ((0, -1.5), "v (down)", Y_C, "center", "top")]:
    ax.annotate("", xy=(dx, dy), xytext=(0, 0), zorder=6,
                arrowprops=dict(arrowstyle="-|>", color=color, lw=2.4, shrinkA=0, shrinkB=0))
    ax.text(dx + (.18 if ha == "left" else 0), dy - (.18 if va == "top" else 0),
            name, color=color, fontsize=10.5, ha=ha, va=va, zorder=7)
ax.plot(0, 0, "o", color=INK, ms=5, zorder=8)
ax.text(-.15, .16, "(0, 0)", fontsize=9.5, color=INK, ha="right")
ax.set_xlim(-1.5, 4.6); ax.set_ylim(-3.6, .9)   # même proportion que les cases 3D, pour aligner les titres
ax.set_aspect("equal"); ax.axis("off")

# ------------------------------------------------------------ 2-4. the 3D frames
for i, (name, axes3) in enumerate(FRAMES, start=2):
    ax = fig.add_subplot(2, 2, i, projection="3d")
    ax.patch.set_alpha(0)
    title(ax, name)

    for label, (dx, dy, dz), color, (lx, ly, lz), ha in axes3:
        # La moitié négative de chaque axe, en pointillé pâle. Sans elle, les trois flèches
        # occupent deux ou trois octants seulement et l'origine n'a pas l'air d'être au centre.
        ax.plot([0, -dx], [0, -dy], [0, -dz], color=color, alpha=.3, lw=1.2, ls=(0, (3, 3)))
        ax.quiver(0, 0, 0, dx, dy, dz, color=color, lw=2.5, arrow_length_ratio=.16)
        ax.text(lx, ly, lz, label, color=color, fontsize=10.5, ha=ha, va="center")
    ax.plot([0], [0], [0], "o", color=INK, ms=5.5)

    # Un cube en fil de fer complet plutôt que trois murs : l'œil lit une boîte transparente
    # avec les axes au milieu, au lieu d'un coin ouvert dont le fond serait le « fond ».
    L = 1.15
    for a in (-L, L):
        for b in (-L, L):
            ax.plot([-L, L], [a, a], [b, b], color=FAINT, lw=.9)
            ax.plot([a, a], [-L, L], [b, b], color=FAINT, lw=.9)
            ax.plot([a, a], [b, b], [-L, L], color=FAINT, lw=.9)

    # Le « support » : les trois panneaux du fond, très pâles, plus leur grille. C'est ce qui
    # donne un volume aux flèches — sans lui, trois flèches nues flottent dans le vide.
    for axis in (ax.xaxis, ax.yaxis, ax.zaxis):
        axis.set_pane_color((0, 0, 0, 0))
        axis.line.set_color((0, 0, 0, 0))
        axis._axinfo["grid"].update(color=(0, 0, 0, 0), linewidth=0)
        # La grille est dessinée aux graduations, donc on garde les graduations mais on
        # leur enlève toute longueur, sinon des petits traits noirs bordent la boîte.
        axis.set_ticks([-1, 0, 1])
        axis.set_ticklabels([])
        axis._axinfo["tick"].update(inward_factor=0, outward_factor=0)

    ax.set_xlim(-1.15, 1.15); ax.set_ylim(-1.15, 1.15); ax.set_zlim(-1.15, 1.15)
    ax.set_box_aspect((1, 1, 1), zoom=1.12)   # zoom : remplit la case au lieu de flotter dedans
    ax.view_init(elev=ELEV, azim=AZIM)

# Marge à droite laissée exprès : l'étiquette la plus longue déborde de sa case,
# et le rognage final sur l'alpha enlève ce qui reste de vide.
fig.subplots_adjust(left=.02, right=.90, top=.95, bottom=.02, wspace=.02, hspace=.12)
out = f"{Path(__file__).stem}.png"
fig.savefig(out, transparent=True, bbox_inches="tight", pad_inches=0)

# mplot3d réserve une boîte cubique, donc il reste toujours du vide autour du dessin.
# On rogne sur les pixels réellement opaques.
im = Image.open(out)
im.crop(im.getchannel("A").getbbox()).save(out)
print("->", out, Image.open(out).size)