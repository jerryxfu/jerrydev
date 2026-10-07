import {useRef} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import {isDarkTheme, type Theme, useTheme} from "@/context/ThemeContext.tsx";
import {GRADIENT_MESHES} from "../Hero/meshes.ts";
import {clamp, fit, pageBackground, type RGB, rgba, seeded, smoothstep} from "../sky.ts";
import "./Horizon.scss";

gsap.registerPlugin(ScrollTrigger);

// The way from the hero into About. The hero is the sky over a planet and the page is the planet: the hero ends on the
// curve of its horizon, a line of light with an atmosphere's glow above it, and a light runs along it every few seconds
// like the separator's under "Hello". Nothing on the planet yet. As you scroll down you come down: the horizon flattens,
// and once it's flat the hero carries on below its edge as small square cells, like GitHub's contribution graph, full
// where they meet the hero, then fewer and fainter; they keep moving on their own whether you scroll or not (like fire
// by default; sparkle and crystal to compare, see SquaresStyle).
// The cells are windows in the page's background onto a reflection of the mesh under the hero's edge (the mesh again,
// upside down, clipped to the room under the hero), so their colours carry on from the hero's, still moving.
// Drawn on a canvas over the mesh and behind the hero's words, in the page: nothing fixed.

export type SquaresStyle = "fire" | "sparkle" | "crystal";

// Per theme: the atmosphere's glow and the line of light on the horizon.
const PALETTE: Record<Theme, {glow: RGB; line: RGB}> = {
    light: {glow: [255, 255, 255], line: [255, 255, 255]},
    night: {glow: [86, 136, 255], line: [176, 208, 255]},
    blush: {glow: [255, 255, 255], line: [255, 255, 255]},
    burgundy: {glow: [255, 112, 152], line: [255, 196, 214]},
};

// The curve: how far its middle stands above its ends at rest (hero heights, at most this much of the width), and how
// far up its glow reaches (px on a 1440px wide screen).
const DIP = 0.13;
const DIP_OF_WIDTH = 0.09;
const GLOW = 90;
// The scroll, in hero heights: flat at FLAT_AT, the cells all out at FORMED_AT.
const FLAT_AT = 0.36;
const FORMED_AT = 0.5;
// The light running along the horizon: how long a pass takes, and the rest between passes (seconds).
const SWEEP = 3.2;
const REST = 2.4;
// The cells: how far down they reach under the hero (hero heights; Horizon.scss leaves room for them), and GitHub's
// levels, as how much of the mesh a cell lets through: empty, then four steps.
const BAND = 0.17;
const LEVELS = [0.07, 0.3, 0.52, 0.76, 1];

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const hash = (x: number, y: number, z: number) => {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1103515245);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
// Smooth value noise in three dimensions (the third one is time), from 0 to 1.
function noise(x: number, y: number, z: number) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const u = fade(x - xi);
    const v = fade(y - yi);
    const w = fade(z - zi);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const plane = (k: number) => lerp(
        lerp(hash(xi, yi, k), hash(xi + 1, yi, k), u),
        lerp(hash(xi, yi + 1, k), hash(xi + 1, yi + 1, k), u),
        v,
    );
    return lerp(plane(zi), plane(zi + 1), w);
}

// How each style moves a cell (column c, row r from the hero's edge down, at `depth` 0 at the edge to 1 at the band's
// end): an offset added to its level, in quarters. Fire: a field flowing up towards the hero, livelier further down
// where the cells thin out, so flickers rise from there; crystal: slow blocky clusters growing and melting; sparkle:
// none, see the pulses.
const MOVE: Record<SquaresStyle, (c: number, r: number, depth: number, t: number) => number> = {
    fire: (c, r, depth, t) => (noise(c * 0.32, (r + t * 2.4) * 0.42, t * 0.55) - 0.5) * (0.55 + 0.9 * depth)
        + (noise(c * 0.9, (r + t * 4) * 1.1, t) - 0.5) * 0.2,
    crystal: (c, r, _depth, t) => (noise(c * 0.2, r * 0.24, t * 0.16) - 0.5) * 1.3,
    sparkle: () => 0,
};
// How fast a cell's shown level follows its level, per frame: quick for fire and sparkle, slow for crystal.
const FOLLOW: Record<SquaresStyle, number> = {fire: 0.32, sparkle: 0.3, crystal: 0.1};
// The horizon's light lives on in the cells furthest from the hero: the ones the movement lifts glow in its colour,
// like embers, more in the dark themes. How much, at most.
const EMBER = {light: 0.35, dark: 0.5};

type Cell = {x: number; y: number; c: number; r: number; noise: number; shown: number; glow: number};
type Pulse = {cell: number; at: number; by: number};

export default function Horizon({squares = "fire"}: {squares?: SquaresStyle}) {
    const root = useRef<HTMLDivElement>(null);
    const {currentTheme} = useTheme();

    useGSAP(() => {
        const el = root.current;
        const canvas = el?.querySelector("canvas");
        const mirror = el?.querySelector<HTMLElement>(".horizon_mirror");
        const hero = document.querySelector<HTMLElement>(".hero");
        const mesh = document.querySelector<HTMLElement>(".hero_mesh");
        if (!el || !canvas || !mirror || !hero || !mesh) return;
        const palette = PALETTE[currentTheme];
        const page = pageBackground();
        const ground = rgba(page);
        const groundClear = rgba(page, 0);
        // Empty cells barely show on a dark page: a little more of the mesh through them there.
        const levels = isDarkTheme(currentTheme) ? [0.14, ...LEVELS.slice(1)] : LEVELS;
        const move = MOVE[squares];
        const follow = FOLLOW[squares];
        const ember = isDarkTheme(currentTheme) ? EMBER.dark : EMBER.light;

        // The reflection keeps time with the mesh it reflects, so their colours meet at the hero's edge.
        const sync = () => {
            const [original] = mesh.getAnimations();
            const [copy] = mirror.getAnimations();
            if (original && copy) copy.currentTime = original.currentTime;
        };

        let ctx: CanvasRenderingContext2D | null = null;
        let width = 0;
        let height = 0; // the hero's
        let box = 0; // the canvas's: the lower half of the hero and the room under it
        let base = 0; // the hero's bottom, in the canvas
        let pitch = 14;
        let size = 11;
        let cells: Cell[] = [];
        const pulses: Pulse[] = [];
        const random = seeded(42);

        const resize = () => {
            width = document.documentElement.clientWidth;
            height = mesh.getBoundingClientRect().height || window.innerHeight;
            base = Math.round(height * 0.5);
            box = base + el.offsetHeight;
            ctx = fit(canvas, width, box);
            // The reflection: the mesh's box again, flipped about the hero's bottom edge.
            mirror.style.height = `${height}px`;
            mirror.style.top = `${-height}px`;
            const phone = width < 768;
            pitch = phone ? 11 : 14;
            size = phone ? 8.5 : 11;
            // The grid, a column past each side, its rows from the hero's bottom edge down.
            cells = [];
            const cols = Math.floor(width / pitch) + 2;
            const left = (width - cols * pitch) / 2;
            const rows = Math.ceil((BAND * height) / pitch) + 2;
            const cellRandom = seeded(7);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    cells.push({x: left + c * pitch, y: base + r * pitch, c, r, noise: cellRandom() - 0.5, shown: 0, glow: 0});
                }
            }
        };

        // The scroll, smoothed a little, in hero heights.
        let target = 0;
        let progress = -1;
        let lastPulse = 0;

        const draw = (p: number, time: number) => {
            if (!ctx) return;
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = 1;
            ctx.clearRect(0, 0, width, box);
            const scale = Math.min(1.2, Math.max(0.5, width / 1440));
            const come = smoothstep(0, 1, clamp(p / FLAT_AT));
            const formed = smoothstep(FLAT_AT, FORMED_AT, p);
            const dip = Math.min(DIP * height, DIP_OF_WIDTH * width) * (1 - come);
            const lineStrength = (1 - 0.45 * come) * (1 - formed);

            // The planet: a circle through both ends of the hero's bottom edge, its top `dip` above them; flat at the end.
            const half = width / 2;
            const flat = dip < 0.5;
            const r = flat ? 0 : (half * half + dip * dip) / (2 * dip);
            const cx = half;
            const cy = base - dip + r;

            // The atmosphere: a glow above the horizon, strongest on it.
            if (lineStrength > 0) {
                const glow = GLOW * scale * (1 - 0.55 * come);
                if (flat) {
                    const g = ctx.createLinearGradient(0, base - glow, 0, base);
                    g.addColorStop(0, rgba(palette.glow, 0));
                    g.addColorStop(0.75, rgba(palette.glow, 0.22 * lineStrength));
                    g.addColorStop(1, rgba(palette.glow, 0.55 * lineStrength));
                    ctx.fillStyle = g;
                    ctx.fillRect(0, base - glow, width, glow);
                } else {
                    const g = ctx.createRadialGradient(cx, cy, r, cx, cy, r + glow);
                    g.addColorStop(0, rgba(palette.glow, 0.55 * lineStrength));
                    g.addColorStop(0.25, rgba(palette.glow, 0.22 * lineStrength));
                    g.addColorStop(1, rgba(palette.glow, 0));
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(cx, cy, r + glow, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // The ground, the page's own background, over the mesh under the horizon and over its reflection. Once the
            // cells come out, it lets the reflection through just under the edge and closes over the first rows, so the
            // hero carries on into them rather than stopping on a line.
            const band = BAND * height * formed;
            if (!flat) {
                ctx.fillStyle = ground;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
            } else if (band < 1) {
                ctx.fillStyle = ground;
                ctx.fillRect(0, base, width, box - base);
            } else {
                const ramp = Math.min(pitch * 2.5, band);
                const cover = ctx.createLinearGradient(0, base, 0, base + ramp);
                cover.addColorStop(0, groundClear);
                cover.addColorStop(1, ground);
                ctx.fillStyle = cover;
                ctx.fillRect(0, base, width, ramp);
                ctx.fillStyle = ground;
                ctx.fillRect(0, base + ramp, width, box - base - ramp);
            }

            if (band >= 1) {
                // Sparkle: now and then a cell lights up a level or two and dims again.
                if (squares === "sparkle") {
                    while (time - lastPulse > 0.035) {
                        lastPulse += 0.035;
                        pulses.push({cell: Math.floor(random() * cells.length), at: lastPulse, by: random() < 0.35 ? 2 : 1});
                    }
                    while (pulses.length && time - pulses[0]!.at > 1.2) pulses.shift();
                }
                const lit = new Map<number, number>();
                for (const pulse of pulses) {
                    const t = (time - pulse.at) / 1.2;
                    lit.set(pulse.cell, (lit.get(pulse.cell) ?? 0) + pulse.by * (t < 0.12 ? t / 0.12 : 1 - smoothstep(0.12, 1, t)));
                }

                ctx.globalCompositeOperation = "destination-out";
                const batches = 16;
                const windows = Array.from({length: batches + 1}, () => new Path2D());
                const embers = Array.from({length: batches + 1}, () => new Path2D());
                cells.forEach((cell, i) => {
                    const d = (cell.y + pitch / 2 - base) / band; // 0 at the hero's edge, 1 at the band's end
                    if (d > 1.05) return;
                    const full = 1 - smoothstep(0, 1, d);
                    const lift = move(cell.c, cell.r, clamp(d), time) + (lit.get(i) ?? 0) / 4;
                    const wanted = clamp(Math.round((full + cell.noise * 0.45 + lift) * 4), 0, 4);
                    // Its shown level follows quickly, or slowly for crystal; it starts from where the band is.
                    if (!cell.shown) cell.shown = levels[wanted]!;
                    cell.shown += (levels[wanted]! - cell.shown) * follow;
                    cell.glow += (clamp(lift * 2.2) * smoothstep(0.3, 0.95, d) - cell.glow) * follow;
                    const fadeOut = 1 - smoothstep(0.78, 1.04, d);
                    const alpha = cell.shown * fadeOut;
                    if (alpha <= 0.01) return;
                    const x = cell.x + (pitch - size) / 2;
                    const y = cell.y + (pitch - size) / 2;
                    windows[Math.round(alpha * batches)]!.roundRect(x, y, size, size, 2.5);
                    const glow = cell.glow * ember * fadeOut;
                    if (glow > 0.02) embers[Math.round(glow * batches)]!.roundRect(x, y, size, size, 2.5);
                });
                windows.forEach((path, b) => {
                    if (!b) return;
                    ctx!.globalAlpha = b / batches;
                    ctx!.fill(path);
                });
                ctx.globalCompositeOperation = "source-over";
                ctx.fillStyle = rgba(palette.line);
                embers.forEach((path, b) => {
                    if (!b) return;
                    ctx!.globalAlpha = b / batches;
                    ctx!.fill(path);
                });
                ctx.globalAlpha = 1;
            } else {
                for (const cell of cells) {
                    cell.shown = 0;
                    cell.glow = 0;
                }
            }

            // The line of light on the horizon, with a soft halo, and the light that runs along it.
            if (lineStrength > 0) {
                ctx.save();
                ctx.shadowColor = rgba(palette.line, 0.9 * lineStrength);
                ctx.shadowBlur = 14 * scale;
                ctx.strokeStyle = rgba(palette.line, 0.95 * lineStrength);
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                if (flat) {
                    ctx.moveTo(0, base);
                    ctx.lineTo(width, base);
                } else {
                    const span = Math.asin(clamp(width / 2 / r, 0, 1));
                    ctx.arc(cx, cy, r, -Math.PI / 2 - span - 0.05, -Math.PI / 2 + span + 0.05);
                }
                ctx.stroke();
                const phase = (time % (SWEEP + REST)) / SWEEP;
                if (phase < 1) {
                    const reach = width * 0.28;
                    const at = -reach + (width + 2 * reach) * smoothstep(0, 1, phase);
                    const run = ctx.createLinearGradient(at - reach, 0, at + reach, 0);
                    run.addColorStop(0, rgba(palette.line, 0));
                    run.addColorStop(0.5, rgba(palette.line, lineStrength));
                    run.addColorStop(1, rgba(palette.line, 0));
                    ctx.strokeStyle = run;
                    ctx.shadowBlur = 22 * scale;
                    ctx.lineWidth = 2.2;
                    ctx.stroke();
                }
                ctx.restore();
            }
        };

        // Each frame, but only drawing when something shows a change: the scroll moved, the light is running along the
        // horizon (and a little after, to clear it), or the cells are out (every other frame: they step, 30 a second
        // is plenty). At rest between two passes of the light, nothing is drawn.
        let drawnAt = -1;
        let frame = 0;
        const tick = () => {
            progress = progress < 0 ? target : progress + (target - progress) * 0.25;
            if (Math.abs(target - progress) < 0.0005) progress = target;
            const time = gsap.globalTimeline.time();
            const formed = smoothstep(FLAT_AT, FORMED_AT, progress);
            const sweeping = formed < 1 && (time % (SWEEP + REST)) / SWEEP < 1.03;
            frame++;
            if (progress !== drawnAt || sweeping || (formed > 0 && frame % 2 === 0)) {
                draw(progress, time);
                drawnAt = progress;
            }
        };

        resize();
        sync();
        lastPulse = gsap.globalTimeline.time();
        draw(0, lastPulse);
        let resizeTimer: number | undefined;
        const onResize = () => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => {
                resize();
                draw(Math.max(0, progress), gsap.globalTimeline.time());
            }, 150);
        };
        window.addEventListener("resize", onResize);

        const mm = gsap.matchMedia();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
            const run = ScrollTrigger.create({
                trigger: hero,
                start: "top bottom", // already passed at the top of the page, so it's on from there
                endTrigger: el,
                end: "bottom top",
                onUpdate: (self) => {
                    target = Math.max(0, self.scroll() / height);
                },
                onToggle: (self) => {
                    if (self.isActive) {
                        sync();
                        gsap.ticker.add(tick);
                    } else {
                        gsap.ticker.remove(tick);
                    }
                },
            });
            target = Math.max(0, run.scroll() / height);
            return () => {
                gsap.ticker.remove(tick);
                run.kill();
            };
        });

        return () => {
            window.removeEventListener("resize", onResize);
            window.clearTimeout(resizeTimer);
            mm.revert();
        };
    }, {scope: root, dependencies: [currentTheme, squares], revertOnUpdate: true});

    return (
        <div className="horizon" ref={root} aria-hidden="true">
            <div className="horizon_reflection">
                <div className={`${GRADIENT_MESHES[currentTheme]} horizon_mirror`} />
            </div>
            <canvas />
        </div>
    );
}
