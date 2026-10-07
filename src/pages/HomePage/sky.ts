// What the hero's sky (Hero/Sky.tsx) and the way down from it (Seam/Horizon.tsx) share: colour and number helpers, a
// seeded random, and a canvas sized in CSS px.

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
