"""
Figure for the "Caméras et images" lesson: the virtual image plane and the ray.
Labels are in French, to match the lesson.

    python3 figure-pinhole.py
"""
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

RED, BLUE, GREEN, INK, GREY = "#d64545", "#2f6fd0", "#2f9e68", "#1a1a1a", "#9a9a9a"
F = 2.0           # focale
Z, X = 6.0, 3.0   # profondeur et hauteur du point P
x = F * X / Z     # hauteur de son image sur le plan image

fig, ax = plt.subplots(figsize=(11, 5.9), dpi=170)
# fond transparent : la figure prend la couleur de la page qui l'affiche
fig.patch.set_alpha(0)
ax.patch.set_alpha(0)


def arrow(x0, y0, x1, y1, color, lw=3.2, z=6):
    ax.annotate("", xy=(x1, y1), xytext=(x0, y0), zorder=z,
                arrowprops=dict(arrowstyle="-|>", color=color, lw=lw, shrinkA=0, shrinkB=0))


def tick(xa, label, color, dx=0.0, ha="center"):
    ax.plot([xa, xa], [-.14, .14], color=color, lw=2.2, zorder=9)
    ax.text(xa + dx, -.34, label, color=color, fontsize=13, ha=ha, va="top", style="italic")


# axe optique
ax.annotate("", xy=(7.6, 0), xytext=(-3.5, 0), arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.2))
ax.text(7.6, .22, "$Z_c$", fontsize=13, color=INK, ha="right")

# les deux triangles semblables, le petit emboîté dans le grand
ax.fill([0, Z, Z], [0, 0, X], color=BLUE, alpha=.11, zorder=2)
ax.fill([0, F, F], [0, 0, x], color=RED, alpha=.20, zorder=3)

# le rayon : tout point du monde posé dessus donne le même pixel
ax.plot([0, 7.3], [0, 7.3 * X / Z], color=INK, lw=1.5, zorder=6)
ax.text(7.35, 7.3 * X / Z + .1, "rayon", fontsize=10.5, color=INK)

# le trou, avec une amorce courte plutôt qu'une longue ligne de rappel
ax.plot(0, 0, "o", color=INK, ms=6, zorder=8)
ax.annotate("centre optique", xy=(-.07, .07), xytext=(-.45, 1.25),
            fontsize=10, color=INK, ha="right",
            arrowprops=dict(arrowstyle="-", color=INK, lw=.9, connectionstyle="arc3,rad=-.12"))

# le plan image, ramené DEVANT le trou : c'est la convention des équations
ax.plot([F, F], [-1.2, 2.0], color=INK, lw=3, zorder=4)
ax.text(F, 2.15, "plan image", fontsize=10.5, color=INK, ha="center")

# les trois hauteurs : l'image, puis deux objets qui tombent sur le même rayon
arrow(F, 0, F, x, RED)
ax.text(F - .22, x / 2, "x", color=RED, fontsize=15, va="center", ha="right", style="italic")
arrow(Z / 2, 0, Z / 2, X / 2, GREEN)
ax.text(Z / 2 + .22, X / 4, "X/2", color=GREEN, fontsize=14, va="center", ha="left", style="italic")
arrow(Z, 0, Z, X, BLUE)
ax.text(Z - .22, X / 2, "X", color=BLUE, fontsize=15, va="center", ha="right", style="italic")

# les points nommés, décalés pour ne pas s'asseoir sur le rayon ni sur le plan
ax.plot([Z / 2, Z], [X / 2, X], "o", color=INK, ms=6, zorder=7)
ax.plot(F, x, "o", color=RED, ms=10, zorder=8)
ax.text(F - .18, x + .3, "p", fontsize=14, color=RED, style="italic", ha="right", va="bottom")
ax.text(Z + .24, X - .16, "P", fontsize=14, color=INK, style="italic", ha="left", va="top")

tick(F, "f", RED, dx=-.16, ha="right")   # décalé : le plan image passe par ici
tick(Z / 2, "Z/2", GREEN)
tick(Z, "Z", BLUE)

# le capteur physique, derrière : même image, mais renversée
ax.plot([-F, -F], [-1.4, 1.4], color=GREY, lw=2.5, zorder=4)
ax.plot([0, -F], [0, -x], color=GREY, lw=1.2, ls=(0, (4, 3)), zorder=5)
arrow(-F, 0, -F, -x, GREY, lw=2.4)
ax.text(-F - .2, -x / 2, "x", color=GREY, fontsize=13, va="center", ha="right", style="italic")
ax.text(-F, -1.65, "capteur réel\n(image renversée)", fontsize=9.5, color=GREY, ha="center", va="top")

ax.set_xlim(-3.9, 7.9); ax.set_ylim(-2.7, 3.5)
ax.set_aspect("equal"); ax.axis("off")
fig.tight_layout()
out = f"{Path(__file__).stem}.png"
# bbox_inches="tight" + pad_inches=0 : aucune marge blanche autour du dessin
fig.savefig(out, transparent=True, bbox_inches="tight", pad_inches=0)
print("->", out)
