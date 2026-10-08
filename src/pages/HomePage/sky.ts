import {type Theme, THEMES} from "@/context/ThemeContext.tsx";

// What the squares under the hero (Seam/Squares.tsx) paint with: colour and number helpers, the theme and the page's
// background as the page shows them, a seeded random, and a canvas sized in CSS px. (Named for the hero's sky, which
// shared it; the sky stays on the `redesign` branch.)

export type RGB = readonly [number, number, number];

export const clamp = (x: number, min = 0, max = 1) => Math.min(max, Math.max(min, x));
export const smoothstep = (a: number, b: number, x: number) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
};
export const rgba = (c: RGB, a = 1) => `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${a})`;
export const cssRgb = (value: string): RGB => {
    const [r = 0, g = 0, b = 0] = value.match(/[\d.]+/g)?.map(Number) ?? [];
    return [r, g, b];
};

// The theme the page shows. ThemeContext puts it on <html> in an effect, after the components under it have run theirs,
// so a canvas that paints with the page's colours goes by this, and by watchTheme, rather than by the context.
export const shownTheme = (): Theme => {
    const theme = document.documentElement.getAttribute("data-theme") as Theme;
    return THEMES.includes(theme) ? theme : "light";
};

// Calls `onChange` each time the page's theme changes, once the page's CSS has it. Returns what stops it.
export function watchTheme(onChange: (theme: Theme) => void) {
    const observer = new MutationObserver((records) => {
        const theme = shownTheme();
        if (records.some((record) => record.oldValue !== theme)) onChange(theme);
    });
    observer.observe(document.documentElement, {attributes: true, attributeFilter: ["data-theme"], attributeOldValue: true});
    return () => observer.disconnect();
}

// The page's background behind `el`, to paint with (the squares' ground). On a new theme the page fades to its new
// background (.homepage, 450ms, from a frame after the change, which on a busy page can be a while), so after `fade()`
// it's read again each time until it has got there, and `fading` says to draw every frame meanwhile.
export function pageBackground(el: Element) {
    const page = el.closest(".homepage") ?? document.body;
    let colour = cssRgb(getComputedStyle(page).backgroundColor);
    let since = 0;
    let fading = false;
    // Whatever happens, not for more than 3s.
    const still = () => (fading &&= performance.now() - since < 3000);
    return {
        fade() {
            since = performance.now();
            fading = true;
        },
        get fading() {
            return still();
        },
        get colour() {
            if (still()) {
                const style = getComputedStyle(page);
                colour = cssRgb(style.backgroundColor);
                // There once it's the theme's own (--bg, in HomePage.scss).
                const theirs = cssRgb(style.getPropertyValue("--bg"));
                fading = colour.some((value, i) => value !== theirs[i]);
            }
            return colour;
        },
    };
}

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
