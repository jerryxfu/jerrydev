// What the seam sketches share: colour and number helpers, a seeded random, and the stars.

export type RGB = readonly [number, number, number];

export const clamp = (x: number, min = 0, max = 1) => Math.min(max, Math.max(min, x));
export const smoothstep = (a: number, b: number, x: number) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
};
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const rgba = (c: RGB, a = 1) => `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${a})`;
export const cssRgb = (value: string): RGB => {
    const [r = 0, g = 0, b = 0] = value.match(/[\d.]+/g)?.map(Number) ?? [];
    return [r, g, b];
};
// The page's background, as the theme sets it.
export const pageBackground = () => cssRgb(getComputedStyle(document.documentElement).getPropertyValue("--bg"));

// Seeded, so a shape stays the same when the theme or the window changes.
export const seeded = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export type Star = {x: number; y: number; r: number; a: number; phase: number; speed: number};

// About one star per `area` px² of the box, most of them faint.
export function makeStars(width: number, height: number, area: number, seed = 7): Star[] {
    const random = seeded(seed);
    return Array.from({length: Math.round((width * height) / area)}, () => ({
        x: random() * width,
        y: random() * height,
        r: 0.5 + random() ** 3 * 1.3,
        a: 0.25 + random() * 0.7,
        phase: random() * Math.PI * 2,
        speed: 0.6 + random() * 1.6,
    }));
}

// Each star twinkling on its own beat; `fade` dims them by height (0 at the top of the box, 1 at its bottom).
export function drawStars(ctx: CanvasRenderingContext2D, stars: Star[], width: number, height: number, time: number,
                          fade: (y: number) => number, colour = "240, 244, 255") {
    ctx.clearRect(0, 0, width, height);
    for (const star of stars) {
        const alpha = star.a * fade(star.y / height) * (0.72 + 0.28 * Math.sin(time * star.speed + star.phase));
        if (alpha <= 0.01) continue;
        ctx.fillStyle = `rgba(${colour}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Sizes a canvas to a box in CSS px, sharp up to twice the pixels, and returns its context drawing in CSS px.
export function fit(canvas: HTMLCanvasElement, width: number, height: number, maxDpr = 2) {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
}
