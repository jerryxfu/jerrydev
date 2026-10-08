import {type ReactNode, useRef} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import {isDarkTheme, type Theme, useTheme} from "@/context/ThemeContext.tsx";
import {GRADIENT_MESHES} from "../Hero/meshes.ts";
import {clamp, fit, pageBackground, type RGB, rgba, seeded, shownTheme, smoothstep, watchTheme} from "../sky.ts";
import "./Squares.scss";

gsap.registerPlugin(ScrollTrigger);

// The way from the hero into About: the hero carries on below its edge as small square cells, like GitHub's
// contribution graph. Once you've scrolled a little (`POUR_AT`, in hero heights), they pour down out of the hero on
// their own, not with the scroll, row after row, the front of the pour glowing; then they flicker like slow fire, full
// where they meet the hero, fewer and fainter further down, until the page. Scroll back above `POUR_AT` and they go back
// up into it.
// The cells are windows in the page's background onto a reflection of the mesh under the hero's edge (the mesh again,
// upside down, clipped to this room), so their colours carry on from the hero's, still moving. Everything is measured
// from the hero's own bottom edge, again whenever the hero changes size (a zoom, a phone's toolbar), so the cells meet
// it at any zoom. Drawn on a canvas in the room under the hero, in the page: nothing fixed. `children` go over the
// canvas (the waves). A new theme changes the colours where they are, cells and all: the ground fades with the page's
// background, the reflection with the mesh.

// Per theme, the colour the cells glow in as they arrive and where the fire lifts them: the horizon's light.
const GLOW: Record<Theme, RGB> = {
    light: [255, 255, 255],
    night: [176, 208, 255],
    blush: [255, 255, 255],
    burgundy: [255, 196, 214],
};
// The cells: how far down they reach under the hero (hero heights; Squares.scss gives the room), over how many rows the
// page's background closes in under the hero's edge, and GitHub's levels, as how much of the mesh a cell lets through:
// empty, then four steps.
const BAND = 0.24;
const OPEN_ROWS = 5;
const LEVELS = [0.07, 0.3, 0.52, 0.76, 1];
// When they pour out (in hero heights of scroll: as soon as you scroll, so the hero's straight edge hardly shows first),
// then by the clock, not with the scroll (Jerry tried it with the scroll, then: "decouple the fire square animation from
// scrolling"): the pour and its way back up (seconds); how much of the pour the rows take to start one after the other,
// and how long each cell takes to come in (both as shares of the pour).
const POUR_AT = 0.05;
const POUR = 1.5;
const UNPOUR = 0.5;
const ROWS_START = 0.6;
const CELL_IN = 0.25;
// How fast a cell's shown level follows its level, per frame, and how much the glow shows in the cells furthest from the
// hero, where the fire lifts them (more in the dark themes).
const FOLLOW = 0.2;
const EMBER = {light: 0.35, dark: 0.5};

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

// The fire: what it adds to a cell's level (in quarters), for column c and row r from the hero's edge down, `depth` 0 at
// the edge to 1 at the band's end, at time t. A field flowing slowly up towards the hero, livelier further down where
// the cells thin out, so the flickers rise from there.
const fire = (c: number, r: number, depth: number, t: number) =>
    (noise(c * 0.3, (r + t * 1.5) * 0.42, t * 0.35) - 0.5) * (0.55 + 0.9 * depth)
    + (noise(c * 0.9, (r + t * 2.5) * 1.1, t * 0.6) - 0.5) * 0.2;

type Cell = {x: number; y: number; c: number; r: number; noise: number; delay: number; shown: number; glow: number};

export default function Squares({children}: {children?: ReactNode}) {
    const root = useRef<HTMLDivElement>(null);
    const {currentTheme} = useTheme();

    useGSAP(() => {
        const el = root.current;
        const canvas = el?.querySelector<HTMLCanvasElement>(".squares_canvas");
        const reflection = el?.querySelector<HTMLElement>(".squares_reflection");
        const mirror = el?.querySelector<HTMLElement>(".squares_mirror");
        const hero = document.querySelector<HTMLElement>(".hero");
        const mesh = document.querySelector<HTMLElement>(".hero_mesh");
        if (!el || !canvas || !reflection || !mirror || !hero || !mesh) return;
        // The theme's colours, set again when it changes (watchTheme, below).
        const page = pageBackground(el);
        let glowColour = "";
        let levels = LEVELS;
        let ember = EMBER.light;
        const restyle = (theme: Theme) => {
            glowColour = rgba(GLOW[theme]);
            // Empty cells barely show on a dark page: a little more of the mesh through them there.
            levels = isDarkTheme(theme) ? [0.14, ...LEVELS.slice(1)] : LEVELS;
            ember = isDarkTheme(theme) ? EMBER.dark : EMBER.light;
        };
        restyle(shownTheme());

        // The reflection keeps time with the mesh it reflects, so their colours meet at the hero's edge. Its drift runs
        // only while the room is on screen or near it (`near`, below), and starts again in step.
        const sync = () => {
            const [original] = mesh.getAnimations();
            const [copy] = mirror.getAnimations();
            if (original && copy) copy.currentTime = original.currentTime;
        };
        const drift = (on: boolean) => {
            mirror.style.animationPlayState = on ? "" : "paused";
            if (on) sync();
        };
        drift(false);

        let ctx: CanvasRenderingContext2D | null = null;
        let width = 0;
        let height = 0; // the hero's
        let room = 0; // this element's height, from the hero's bottom edge down; the canvas overhangs it by 2px, so no
        // sliver of the reflection shows past its last row of pixels at a fractional zoom
        let pitch = 14;
        let size = 11;
        let cells: Cell[] = [];

        const layout = () => {
            const box = el.getBoundingClientRect();
            width = box.width;
            room = box.height;
            // Never 0, even in a window that has no size yet (a tab opened hidden): the scroll is divided by it, and a
            // NaN there would stay in the smoothing below for good.
            height = Math.max(1, hero.getBoundingClientRect().height);
            ctx = fit(canvas, width, room + 2);
            const phone = width < 768;
            pitch = phone ? 11 : 14;
            size = phone ? 8.5 : 11;
            // The reflection: the hero's box again, flipped about its bottom edge, which is this element's top; seen only
            // as far down as the cells go.
            reflection.style.height = `${Math.min(room, BAND * height + pitch * 2)}px`;
            mirror.style.height = `${height}px`;
            mirror.style.top = `${-height}px`;
            // The grid, a column past each side, its rows from the hero's edge down. Each cell comes in at its row's turn
            // in the pour, a little earlier or later than its neighbours.
            cells = [];
            const cols = Math.floor(width / pitch) + 2;
            const left = (width - cols * pitch) / 2;
            const rows = Math.ceil((BAND * height) / pitch) + 2;
            const random = seeded(7);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const delay = clamp((r / rows) * ROWS_START + (random() - 0.5) * 0.12, 0, 1 - CELL_IN);
                    cells.push({x: left + c * pitch, y: r * pitch, c, r, noise: random() - 0.5, delay, shown: 0, glow: 0});
                }
            }
        };

        // The scroll, in hero heights; and how far the pour has got, from 0 to 1.
        let scrolled = 0;
        let poured = 0;

        const draw = (time: number) => {
            if (!ctx) return;
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = 1;
            ctx.clearRect(0, 0, width, room + 2);
            // The ground, the page's own background, over the reflection. As the cells pour, it opens just under the edge
            // and closes over the first rows, so the hero carries on into them rather than stopping on a line.
            const background = page.colour;
            const ground = rgba(background);
            const ramp = Math.min(pitch * OPEN_ROWS, room);
            const cover = ctx.createLinearGradient(0, 0, 0, ramp);
            cover.addColorStop(0, rgba(background, 1 - smoothstep(0.05, 0.5, poured)));
            cover.addColorStop(1, ground);
            ctx.fillStyle = cover;
            ctx.fillRect(0, 0, width, ramp);
            ctx.fillStyle = ground;
            ctx.fillRect(0, ramp, width, room + 2 - ramp);

            if (poured <= 0) {
                for (const cell of cells) {
                    cell.shown = 0;
                    cell.glow = 0;
                }
                return;
            }
            const band = BAND * height;
            ctx.globalCompositeOperation = "destination-out";
            const batches = 16;
            const windows = Array.from({length: batches + 1}, () => new Path2D());
            const embers = Array.from({length: batches + 1}, () => new Path2D());
            for (const cell of cells) {
                const d = (cell.y + pitch / 2) / band; // 0 at the hero's edge, 1 at the band's end
                if (d > 1.05) continue;
                const arrived = clamp((poured - cell.delay) / CELL_IN);
                if (arrived <= 0) continue;
                const full = 1 - smoothstep(0, 1, d);
                const lift = fire(cell.c, cell.r, clamp(d), time);
                const wanted = clamp(Math.round((full + cell.noise * 0.45 + lift) * 4), 0, 4);
                // Its shown level follows slowly; it starts from where the band is.
                if (!cell.shown) cell.shown = levels[wanted]!;
                cell.shown += (levels[wanted]! - cell.shown) * FOLLOW;
                cell.glow += (clamp(lift * 2.2) * smoothstep(0.3, 0.95, d) - cell.glow) * FOLLOW;
                const fadeOut = 1 - smoothstep(0.7, 1.04, d);
                const alpha = cell.shown * fadeOut * arrived;
                if (alpha <= 0.01) continue;
                const x = cell.x + (pitch - size) / 2;
                const y = cell.y + (pitch - size) / 2;
                windows[Math.round(alpha * batches)]!.roundRect(x, y, size, size, 2.5);
                // The front of the pour glows as each cell comes in, then the fire's embers.
                const front = 4 * arrived * (1 - arrived);
                const glow = clamp((cell.glow * ember + front * 0.4) * fadeOut);
                if (glow > 0.02) embers[Math.round(glow * batches)]!.roundRect(x, y, size, size, 2.5);
            }
            windows.forEach((path, b) => {
                if (!b) return;
                ctx!.globalAlpha = b / batches;
                ctx!.fill(path);
            });
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = glowColour;
            embers.forEach((path, b) => {
                if (!b) return;
                ctx!.globalAlpha = b / batches;
                ctx!.fill(path);
            });
            ctx.globalAlpha = 1;
        };

        // Each frame: the pour goes on (towards all out past `POUR_AT`, back otherwise), and something is drawn only when
        // it shows a change: the pour moved, the page is fading to a new theme, or the cells are out (every other frame:
        // they step, 30 a second is plenty). It runs while the room is on screen or near it (`near`, from the scroll
        // trigger below), and while a new theme fades in.
        let near = false;
        let ticking = false;
        let frame = 0;
        let last = 0;
        const tick = () => {
            const time = gsap.globalTimeline.time();
            const dt = clamp(time - last, 0, 0.1);
            last = time;
            const before = poured;
            poured = scrolled >= POUR_AT ? Math.min(1, poured + dt / POUR) : Math.max(0, poured - dt / UNPOUR);
            frame++;
            const fading = page.fading;
            if (fading || poured !== before || (poured > 0 && frame % 2 === 0)) draw(time);
            if (!near && !fading) sleep();
        };
        const wake = () => {
            if (ticking) return;
            ticking = true;
            last = gsap.globalTimeline.time();
            gsap.ticker.add(tick);
        };
        const sleep = () => {
            ticking = false;
            gsap.ticker.remove(tick);
        };

        layout();
        sync();
        draw(gsap.globalTimeline.time());
        // Measured again whenever the hero or this room changes size (a zoom, a phone's toolbar, a window), or the screen's
        // pixel ratio does (a zoom that keeps the size), once per frame at most.
        let pending = 0;
        const relayout = () => {
            cancelAnimationFrame(pending);
            pending = requestAnimationFrame(() => {
                layout();
                draw(gsap.globalTimeline.time());
            });
        };
        const sizes = new ResizeObserver(relayout);
        sizes.observe(hero);
        sizes.observe(el);
        let ratio: MediaQueryList | null = null;
        const watchRatio = () => {
            ratio?.removeEventListener("change", onRatio);
            ratio = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
            ratio.addEventListener("change", onRatio);
        };
        function onRatio() {
            watchRatio();
            relayout();
        }
        watchRatio();

        // A new theme: its colours, the ground following the page's fade, and the reflection's new mesh in step again.
        const unwatch = watchTheme((theme) => {
            restyle(theme);
            page.fade();
            sync();
            wake();
        });

        const mm = gsap.matchMedia();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
            const run = ScrollTrigger.create({
                trigger: hero,
                start: "top bottom", // already passed at the top of the page, so it's on from there
                endTrigger: el,
                end: "bottom top",
                onUpdate: (self) => {
                    scrolled = Math.max(0, self.scroll() / height);
                },
                onToggle: (self) => {
                    near = self.isActive;
                    drift(near);
                    if (near) wake();
                },
            });
            scrolled = Math.max(0, run.scroll() / height);
            return () => {
                near = false;
                drift(false);
                run.kill();
            };
        });

        return () => {
            unwatch();
            mirror.style.animationPlayState = "";
            sizes.disconnect();
            ratio?.removeEventListener("change", onRatio);
            cancelAnimationFrame(pending);
            mm.revert();
            sleep();
        };
    }, {scope: root});

    return (
        <div className="squares" ref={root} aria-hidden="true">
            <div className="squares_reflection">
                <div className={`${GRADIENT_MESHES[currentTheme]} squares_mirror`} />
            </div>
            <canvas className="squares_canvas" />
            {children}
        </div>
    );
}
