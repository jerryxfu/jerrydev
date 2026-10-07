import {useRef} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import {isDarkTheme, useTheme} from "@/context/ThemeContext.tsx";
import {clamp, fit, rgba, pageBackground, seeded, smoothstep} from "./sky.ts";
import "./Squares.scss";

gsap.registerPlugin(ScrollTrigger);

// A sketch. The hero's mesh breaks up at its lower edge into small square cells, like GitHub's contribution graph: five
// levels of the mesh's own light, full near the edge, then fewer and fainter, down to empty cells that fade out. Now and
// then a cell lights up a level or two and dims again, like activity. As you scroll, the edge climbs up the mesh and the
// cells under it step down level by level. Drawn as the page's background over the mesh with a window per cell, so the
// cells show the real mesh, still moving.

// Where the edge is at rest (a fraction of the hero from its bottom), how far up it climbs as the hero scrolls out (hero
// heights), and how deep the cells go under it (hero heights).
const EDGE = 0.2;
const CLIMB = 0.55;
const DEPTH = 0.15;
// GitHub's levels, as how much of the mesh a cell lets through: empty, then four steps.
const LEVELS = [0.07, 0.3, 0.52, 0.76, 1];
// A cell lights up every PULSE_EVERY seconds or so, for PULSE_FOR seconds.
const PULSE_EVERY = 0.12;
const PULSE_FOR = 1.6;

type Cell = {x: number; y: number; noise: number};
type Pulse = {cell: number; at: number; by: number};

export default function Squares() {
    const root = useRef<HTMLDivElement>(null);
    const {currentTheme} = useTheme();

    useGSAP(() => {
        const el = root.current;
        const canvas = el?.querySelector("canvas");
        const mesh = document.querySelector<HTMLElement>(".hero_mesh");
        const hero = document.querySelector<HTMLElement>(".hero");
        if (!el || !canvas || !mesh || !hero) return;
        const page = pageBackground();
        const bg = rgba(page);
        const bgClear = rgba(page, 0);
        // Empty cells barely show on a dark page: a little more of the mesh through them there.
        const levels = isDarkTheme(currentTheme) ? [0.14, ...LEVELS.slice(1)] : LEVELS;

        let ctx: CanvasRenderingContext2D | null = null;
        let width = 0;
        let height = 0;
        let total = 0;
        let pitch = 14;
        let size = 11;
        let cells: Cell[] = [];
        const pulses: Pulse[] = [];
        const random = seeded(42);

        const resize = () => {
            width = document.documentElement.clientWidth;
            height = mesh.getBoundingClientRect().height || window.innerHeight;
            total = el.offsetHeight + height;
            const phone = width < 768;
            pitch = phone ? 11 : 14;
            size = phone ? 8.5 : 11;
            ctx = fit(canvas, width, total);
            // The grid centred across the screen and a column past each side, its rows from the top of the hero.
            cells = [];
            const cols = Math.floor(width / pitch) + 2;
            const left = (width - cols * pitch) / 2;
            const cellRandom = seeded(7);
            for (let y = 0; y < total; y += pitch) {
                for (let c = 0; c < cols; c++) cells.push({x: left + c * pitch, y, noise: cellRandom() - 0.5});
            }
        };

        let target = 0;
        let progress = 0;
        let lastPulse = 0;

        const draw = (time: number) => {
            if (!ctx) return;
            const depth = DEPTH * height;
            const edge = height * (1 - EDGE) - progress * CLIMB * height;
            const top = edge - pitch;

            // Activity: now and then a cell in the band lights up, then fades back over PULSE_FOR.
            while (time - lastPulse > PULSE_EVERY) {
                lastPulse += PULSE_EVERY;
                const cell = Math.floor(random() * cells.length);
                const d = cells[cell]!.y - edge;
                if (d > pitch && d < depth) pulses.push({cell, at: lastPulse, by: random() < 0.3 ? 2 : 1});
            }
            while (pulses.length && time - pulses[0]!.at > PULSE_FOR) pulses.shift();
            const lit = new Map<number, number>();
            for (const pulse of pulses) {
                const t = (time - pulse.at) / PULSE_FOR;
                // Up quickly, down slowly.
                lit.set(pulse.cell, (lit.get(pulse.cell) ?? 0) + pulse.by * (t < 0.15 ? t / 0.15 : 1 - smoothstep(0.15, 1, t)));
            }

            ctx.globalCompositeOperation = "source-over";
            ctx.clearRect(0, 0, width, total);
            // The cover fades in over the first rows, so the mesh shows between the first cells too and the grid comes
            // out of it rather than starting on a line.
            const cover = ctx.createLinearGradient(0, top, 0, edge + pitch * 2.5);
            cover.addColorStop(0, bgClear);
            cover.addColorStop(1, bg);
            ctx.fillStyle = cover;
            ctx.fillRect(0, top, width, edge + pitch * 2.5 - top);
            ctx.fillStyle = bg;
            ctx.fillRect(0, edge + pitch * 2.5, width, total);
            ctx.globalCompositeOperation = "destination-out";
            // One path per level, so the windows of a level go through in one fill.
            const paths = levels.map(() => new Path2D());
            const extra: {i: number; boost: number}[] = [];
            cells.forEach((cell, i) => {
                if (cell.y + pitch < top) return;
                const d = cell.y + pitch / 2 - edge;
                // Full cells meeting the mesh, then fewer and fainter; empty cells fade out under the band.
                const full = 1 - smoothstep(0, depth, d);
                const level = d <= 0 ? 4 : Math.round(clamp(full + cell.noise * 0.55) * 4);
                const gone = smoothstep(depth, depth * 1.35, d);
                if (gone >= 1) return;
                const x = cell.x + (pitch - size) / 2;
                const y = cell.y + (pitch - size) / 2;
                const boost = lit.get(i);
                if (boost && level < 4) extra.push({i, boost});
                if (gone > 0) {
                    ctx!.globalAlpha = levels[level]! * (1 - gone);
                    ctx!.beginPath();
                    ctx!.roundRect(x, y, size, size, 2.5);
                    ctx!.fill();
                    ctx!.globalAlpha = 1;
                    return;
                }
                paths[level]!.roundRect(x, y, size, size, 2.5);
            });
            paths.forEach((path, level) => {
                ctx!.globalAlpha = levels[level]!;
                ctx!.fill(path);
            });
            // The lit ones, on top of their own level: only the difference to the brighter one still goes through.
            for (const {i, boost} of extra) {
                const cell = cells[i]!;
                const d = cell.y + pitch / 2 - edge;
                const level = d <= 0 ? 4 : Math.round(clamp(1 - smoothstep(0, depth, d) + cell.noise * 0.55) * 4);
                const to = Math.min(4, level + boost);
                const from = levels[level]!;
                const goal = levels[Math.floor(to)]! + (levels[Math.ceil(to)]! - levels[Math.floor(to)]!) * (to - Math.floor(to));
                // A window letting `from` through, then this one too: together they let through 1 - (1 - from)(1 - a).
                const a = clamp((goal - from) / (1 - from));
                ctx.globalAlpha = a;
                ctx.beginPath();
                ctx.roundRect(cell.x + (pitch - size) / 2, cell.y + (pitch - size) / 2, size, size, 2.5);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";
        };

        const tick = () => {
            progress += (target - progress) * 0.22;
            if (Math.abs(target - progress) < 0.0005) progress = target;
            draw(gsap.globalTimeline.time());
        };

        resize();
        lastPulse = gsap.globalTimeline.time();
        draw(lastPulse);
        let resizeTimer: number | undefined;
        const onResize = () => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => {
                resize();
                draw(gsap.globalTimeline.time());
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
                    target = clamp(self.scroll() / height);
                },
                onToggle: (self) => {
                    if (self.isActive) gsap.ticker.add(tick);
                    else gsap.ticker.remove(tick);
                },
            });
            target = clamp(run.scroll() / height);
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
    }, {scope: root, dependencies: [currentTheme], revertOnUpdate: true});

    return (
        <div className="squares" ref={root} aria-hidden="true">
            <canvas />
        </div>
    );
}
