import {saveBlob} from "@/utils.ts";

// A link's label as a picture, to keep, send or print: what it is, the whole link, and its name in big letters, beside
// its QR code, on the label's own colour. Drawn on a canvas from what the page shows (the label's computed colours, its font, its QR code), as a PNG
// with see-through corners, then handed to the phone's share sheet or to the downloads. Straight, where the page's
// label is tilted.

const WIDTH = 1200;
const HEIGHT = 520;
const SHADOW = 12;      // the hard shadow, down and to the right, as the label's
const LINE = 6;         // the ink outline
const RADIUS = 40;
const PAD = 64;
const QR = 340;

const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The QR code couldn't be drawn"));
    img.src = src;
});

/**
 * Saves or shares the label (`card`, the .sc_label on the page) as `shortcut-<name>.png`. `link` is the whole link as
 * people read it ("jerryxf.net/s/party"), `name` its end ("party").
 */
export async function saveLabelImage(card: HTMLElement, link: string, name: string): Promise<void> {
    const style = getComputedStyle(card);
    const ink = style.borderTopColor;
    const family = style.fontFamily;
    await document.fonts.load(`800 100px ${family}`);

    // The page's own QR code (.sc_qr, not a button's icon), an SVG: as a picture, it scales to any size.
    const code = card.querySelector(".sc_qr");
    if (!code) throw new Error("The label has no QR code");
    const qr = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(code))}`);

    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser can't draw the picture");

    // The label: its shadow first, then its colour and its outline over it.
    const width = WIDTH - SHADOW;
    const height = HEIGHT - SHADOW;
    const box = (x: number, y: number, w: number, h: number, radius: number, fill: string) => {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        ctx.fillStyle = fill;
        ctx.fill();
    };
    box(SHADOW, SHADOW, width, height, RADIUS, ink);
    box(0, 0, width, height, RADIUS, ink);
    box(LINE, LINE, width - 2 * LINE, height - 2 * LINE, RADIUS - LINE, style.backgroundColor);

    // The QR code on white, outlined, at the right.
    const qrX = width - PAD - QR;
    const qrY = (height - QR) / 2;
    box(qrX - LINE, qrY - LINE, QR + 2 * LINE, QR + 2 * LINE, 20 + LINE, ink);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(qrX, qrY, QR, QR, 20);
    ctx.clip();
    ctx.drawImage(qr, qrX, qrY, QR, QR);
    ctx.restore();

    // The text, on three lines: what this is, the whole link, then its name as big as the room allows. The link and
    // the name each get the biggest size at which they fit, and are squeezed past the smallest.
    const room = qrX - LINE - 2 * PAD;
    const fit = (text: string, weight: number, biggest: number, smallest: number): number => {
        let size = biggest;
        for (; size > smallest; size -= 2) {
            ctx.font = `${weight} ${size}px ${family}`;
            if (ctx.measureText(text).width <= room) break;
        }
        return size;
    };
    const linkSize = fit(link, 700, 46, 24);
    const lines = [
        {text: "Short link", weight: 700, size: Math.min(34, linkSize)}, // never bigger than the link it's about
        {text: link, weight: 700, size: linkSize},
        {text: name, weight: 800, size: fit(name, 800, 150, 30)},
    ];
    const gap = 18;
    ctx.fillStyle = style.color;
    ctx.textBaseline = "alphabetic";
    let y = (height - lines.reduce((sum, line) => sum + line.size, gap * (lines.length - 1))) / 2;
    for (const line of lines) {
        ctx.font = `${line.weight} ${line.size}px ${family}`;
        ctx.fillText(line.text, PAD, y + line.size * 0.8, room);
        y += line.size + gap;
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("The picture couldn't be made");
    const file = new File([blob], `shortcut-${name}.png`, {type: "image/png"});

    // On a phone, the share sheet (as Rendezvous's Share): it's the only way a page gets a picture into Photos ("Save
    // Image" there), and it sends it to an app as well. A download would land in Files. Elsewhere, a download.
    if (window.matchMedia("(pointer: coarse)").matches && navigator.canShare?.({files: [file]})) {
        try {
            await navigator.share({files: [file]});
            return;
        } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") return; // the sheet closed with nothing picked
            // refused for another reason: the download below
        }
    }
    saveBlob(file, file.name);
}
