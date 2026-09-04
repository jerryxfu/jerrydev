"""
Builds the "an image is just numbers" figure: the image with its (u, v) axes on the left,
the pixel values on the right.

    python3 figure-pixels.py <image> [u0 v0 n]

Examples:
    python3 figure-pixels.py public/favicon16.png
    python3 figure-pixels.py snapshot_tag.png 40 30 6     # 6x6 px zoom starting at (u=40, v=30)

Tip: this works best on a high-contrast image, one where the numbers actually span 0-255.
The official tag images are perfect and tiny:
https://github.com/AprilRobotics/apriltag-imgs/tree/master/tag36h11
(tag36_11_00000.png is about ten pixels a side, so the whole grid fits in the figure).
A cropped Limelight snapshot works too.
"""
import sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image
from pathlib import Path

path = sys.argv[1] if len(sys.argv) > 1 else "public/favicon16.png"
src = Path(path)
u0 = int(sys.argv[2]) if len(sys.argv) > 2 else None
v0 = int(sys.argv[3]) if len(sys.argv) > 3 else None
n = int(sys.argv[4]) if len(sys.argv) > 4 else 0   # 0 = automatic

a = np.array(Image.open(path).convert("L"))
h, w = a.shape
if n == 0:                       # the whole image when it is small, a 6x6 zoom otherwise
    n = min(w, h) if max(w, h) <= 12 else 6
if u0 is None:
    u0, v0 = max(0, w // 2 - n // 2), max(0, h // 2 - n // 2)
whole = (n == w == h)            # no point boxing a crop that covers everything
print(f"{path}: {w}x{h}, values from {a.min()} to {a.max()} (mean {a.mean():.0f})")

fig, axes = plt.subplots(1, 2, figsize=(13, 6.2), dpi=170)
fig.patch.set_facecolor("white")
RED, BLUE = "#d64545", "#2f6fd0"

ax = axes[0]
ax.imshow(a, cmap="gray", vmin=0, vmax=255, interpolation="nearest")
step = max(1, w // 8)
ax.set_xticks(range(0, w, step)); ax.set_yticks(range(0, h, step))
if w <= 32:
    ax.set_xticks(np.arange(-.5, w, 1), minor=True); ax.set_yticks(np.arange(-.5, h, 1), minor=True)
    ax.grid(which="minor", color="#bbb", linewidth=.4); ax.tick_params(which="minor", length=0)
ax.set_title(f"{src.name} — {w} × {h} pixels", fontsize=13, pad=26)
arrow = dict(arrowstyle="-|>", color=RED, lw=2)
L = max(3, w // 3)
ax.annotate("", xy=(L, -.5), xytext=(-.5, -.5), annotation_clip=False, arrowprops=arrow)
ax.annotate("u", xy=(L + .3, -.6), color=RED, fontsize=14, fontweight="bold", annotation_clip=False)
ax.annotate("", xy=(-.5, L), xytext=(-.5, -.5), annotation_clip=False, arrowprops=arrow)
ax.annotate("v", xy=(-1.4 * w / 16, L + .3), color=RED, fontsize=14, fontweight="bold", annotation_clip=False)
ax.plot(-.5, -.5, "o", color=RED, ms=7, clip_on=False)
ax.annotate("(0, 0)", xy=(-.35, -.9), color=RED, fontsize=11, annotation_clip=False)
if not whole:
    ax.add_patch(plt.Rectangle((u0 - .5, v0 - .5), n, n, fill=False, edgecolor=BLUE, lw=2.2))

sub = a[v0:v0 + n, u0:u0 + n]
ax = axes[1]
ax.imshow(sub, cmap="gray", vmin=0, vmax=255, interpolation="nearest")
for i in range(sub.shape[0]):
    for j in range(sub.shape[1]):
        val = sub[i, j]
        ax.text(j, i, str(val), ha="center", va="center", fontsize=max(7, 90 // n),
                color="white" if val < 128 else "#111", fontfamily="monospace")
ax.set_xticks(range(n)); ax.set_xticklabels(range(u0, u0 + n))
ax.set_yticks(range(n)); ax.set_yticklabels(range(v0, v0 + n))
ax.set_xticks(np.arange(-.5, n, 1), minor=True); ax.set_yticks(np.arange(-.5, n, 1), minor=True)
ax.grid(which="minor", color="#888", linewidth=.8); ax.tick_params(which="minor", length=0)
ax.set_xlabel("u", color=RED, fontsize=13, fontweight="bold")
ax.set_ylabel("v", color=RED, fontsize=13, fontweight="bold", rotation=0, labelpad=12)
ax.set_title("Pixel values (0 = black, 255 = white)", fontsize=13, pad=26)

# fig.suptitle("Title", fontsize=17, y=0.97)
fig.tight_layout(rect=[0, 0, 1, 0.94])
out = f"{src.stem}-pixel_values.png"
fig.savefig(out, facecolor="white")
print("->", out)
