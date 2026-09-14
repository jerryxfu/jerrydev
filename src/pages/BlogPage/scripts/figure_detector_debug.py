"""
Figure pour la leçon « Les AprilTags » : les étapes du VRAI détecteur AprilTag, image par image.

Le code de référence du laboratoire APRIL sait écrire une image intermédiaire par étape quand on
active son mode debug. On y accède depuis Python avec pupil-apriltags, un wrapper de la bibliothèque C :

    pip install pupil-apriltags pillow numpy matplotlib
    python3 figure_detector_debug.py                      # scène synthétique (un tag 36h11 vu de biais)
    python3 figure_detector_debug.py snapshot.png         # une capture de Limelight, ou n'importe quelle photo

Sans argument, le script fabrique lui-même une scène : le tag 36h11 numéro 0 plaqué en perspective,
un éclairage inégal, un peu de flou et de bruit, et deux intrus (un disque sombre, un rectangle clair).
Avec une capture réelle, il n'y a rien à changer : la figure montre alors ce que le détecteur a vraiment fait.

Le script produit six images, figure_detector_debug_1.png à _6.png : la même planche de six panneaux,
mais dans l'image de l'étape k, les panneaux des étapes suivantes sont estompés. Chaque image va sous
l'étape correspondante de la leçon. Les titres des panneaux sont en anglais.

Correspondance avec les réglages Limelight : quad_decimate = « Detector Downscale ». Il est à 2 ici, comme
la valeur par défaut de la bibliothèque : les étapes 2 à 5 travaillent sur l'image réduite de moitié, et le
décodage revient à la pleine résolution.

Fond blanc opaque, volontairement : les panneaux montrent du vrai noir et du vrai blanc, et le filtre
d'inversion des thèmes sombres (classe .diagram) afficherait tout à l'envers. Ne PAS mettre
className="diagram" sur cette image.
"""
import os
import sys
import tempfile
from pathlib import Path

import matplotlib
import numpy as np
from PIL import Image, ImageFilter
from pupil_apriltags import Detector

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Rectangle

RED, BLUE, GREEN, INK, FADED = "#d64545", "#2f6fd0", "#2f9e68", "#1a1a1a", "#b8b8b8"
DECIMATE = 2.0
HERE = Path(__file__).resolve().parent
TAG_PNG = HERE / "../../../assets/blog/robotics/tag36_11_00000.png"


def synthetic_scene(W=320, H=240, seed=3990):
    """Un tag 36h11 (id 0) vu de biais, éclairage inégal, flou, bruit, deux intrus."""
    rng = np.random.default_rng(seed)
    tag = Image.open(TAG_PNG).convert("L").resize((100, 100), Image.NEAREST)

    def coeffs(src, dst):  # coefficients de la transformation perspective de PIL (dst -> src)
        rows = []
        for (x, y), (u, v) in zip(dst, src):
            rows.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
            rows.append([0, 0, 0, x, y, 1, -v * x, -v * y])
        return np.linalg.solve(np.array(rows, float), np.array([c for p in src for c in p], float))

    quad = [(105, 45), (225, 35), (235, 190), (90, 200)]
    c = coeffs([(0, 0), (100, 0), (100, 100), (0, 100)], quad)
    scene = Image.new("L", (W, H), 150)
    warped = tag.transform((W, H), Image.PERSPECTIVE, c, Image.NEAREST, fillcolor=150)
    mask = Image.new("L", (100, 100), 255).transform((W, H), Image.PERSPECTIVE, c, Image.NEAREST, fillcolor=0)
    scene.paste(warped, (0, 0), mask)

    a = np.array(scene).astype(float) / 255
    uu, vv = np.meshgrid(np.arange(W), np.arange(H))
    a[(uu - 280) ** 2 + (vv - 200) ** 2 < 20 ** 2] = .10      # disque sombre
    a[15:45, 20:70] = .93                                      # rectangle clair
    a *= np.linspace(.45, 1.0, W)[None, :]                     # sombre à gauche, clair à droite
    a = np.clip(a + rng.normal(0, .012, a.shape), 0, 1)
    return Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))


if len(sys.argv) > 1:
    src = Path(sys.argv[1]).resolve()
    image = Image.open(src).convert("L")
    label = src.name
else:
    image = synthetic_scene()
    label = "scène synthétique"
gray = np.array(image)
print(f"{label}: {gray.shape[1]}x{gray.shape[0]} px")

# Le mode debug écrit ses fichiers dans le répertoire courant : on travaille dans un dossier temporaire.
cwd = os.getcwd()
with tempfile.TemporaryDirectory() as tmp:
    os.chdir(tmp)
    detector = Detector(families="tag36h11", nthreads=1, quad_decimate=DECIMATE, quad_sigma=0.0, refine_edges=1, debug=1)
    detections = detector.detect(gray)
    stages = {name: np.array(Image.open(f"debug_{name}.pnm"))
              for name in ("preprocess", "threshold", "segmentation", "clusters", "quads_fixed", "samples", "output")}
    os.chdir(cwd)

for d in detections:
    print(f"  tag {d.tag_id}: hamming {d.hamming}, decision margin {d.decision_margin:.1f}, "
          f"coins {np.round(d.corners, 1).tolist()}")
print(f"{len(detections)} détection(s)")

# ---------------------------------------------------------------- les figures
pre = stages["preprocess"]
panels = [
    (f"1. Downscaled image ({pre.shape[1]} × {pre.shape[0]} px)", pre, "gray"),
    ("2. Adaptive thresholding", stages["threshold"], "gray"),
    ("3. Connected components", stages["segmentation"], None),
    ("4. Black-white boundaries", stages["clusters"], None),
    ("5. Candidate quads", stages["quads_fixed"], "gray"),
    (f"6. Decoding, at full resolution ({gray.shape[1]} × {gray.shape[0]} px)", stages["samples"], "gray"),
]

for step in range(1, 7):
    fig, axes = plt.subplots(2, 3, figsize=(13.5, 7.4), dpi=130)
    fig.patch.set_facecolor("white")
    axes = axes.ravel()
    for i, (ax, (title, im, cmap)) in enumerate(zip(axes, panels), start=1):
        if cmap:
            ax.imshow(im, cmap=cmap, vmin=0, vmax=255, interpolation="nearest")
        else:
            ax.imshow(im, interpolation="nearest")
        ax.axis("off")
        if i == 6:  # le résultat final, tel que renvoyé par le détecteur, par-dessus les échantillons
            for d in detections:
                corners = np.array(d.corners)
                ax.add_patch(Polygon(corners, closed=True, fill=False, lw=2, edgecolor=GREEN, zorder=5))
                ax.plot(corners[:, 0], corners[:, 1], "o", color=GREEN, ms=4, zorder=6)
                n = d.hamming
                txt = f"tag {d.tag_id}, {n} bit{'s' if n > 1 else ''} corrected" if n else f"tag {d.tag_id}, 0 errors"
                ax.text(corners[:, 0].mean(), corners[:, 1].max() + 8, txt, color=GREEN, fontsize=9.5, ha="center",
                        va="top", fontweight="bold", bbox=dict(facecolor="white", edgecolor="none", alpha=.85, pad=1.5))
        if i > step:  # étape à venir : on estompe tout le panneau vers le blanc
            ax.add_patch(Rectangle((0, 0), 1, 1, transform=ax.transAxes, facecolor="white", alpha=.85, zorder=20))
            ax.set_title(title, fontsize=11.5, color=FADED)
        else:
            ax.set_title(title, fontsize=11.5, color=INK)
    fig.tight_layout(w_pad=1.2, h_pad=1.5)
    out = f"{Path(__file__).stem}_{step}.png"
    fig.savefig(out, facecolor="white", bbox_inches="tight", pad_inches=.1)
    plt.close(fig)
    print("->", out, Image.open(out).size)
