import {useRef} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import {type Theme, useTheme} from "@/context/ThemeContext.tsx";
import "./Stardust.scss";

gsap.registerPlugin(ScrollTrigger);

// The hero's mesh doesn't end on a line: its lower edge breaks up into a grid of dots in its own colours, big where the
// mesh still is, smaller and fewer further down, like a halftone. As you scroll, the edge climbs up the mesh, and the
// dots it leaves come loose and rise like stars, faster than the page, the near ones fastest, and fade as they go. All of
// it is a function of the scroll, so it plays backwards going up. Drawn on a canvas over the hero's mesh and behind its
// words, in the page: nothing fixed.

// The edge at rest, as a fraction of the hero from its bottom; how far up the mesh it climbs while the hero scrolls out
// (in hero heights); and the halftone's depth below the edge (hero heights).
const EDGE = 0.16;
const CLIMB = 0.55;
const DEPTH = 0.2;
// Which share of the dots come loose and rise; the others only shrink away with the halftone.
const LOOSE = 0.3;
// The stars' colour per theme: white in the dark ones, a deeper shade of the mesh in the light ones.
const STAR: Record<Theme, string> = {light: "104, 146, 232", night: "238, 242, 255", blush: "232, 132, 186", burgundy: "255, 222, 232"};

const clamp = (x: number, min = 0, max = 1) => Math.min(max, Math.max(min, x));
const smoothstep = (a: number, b: number, x: number) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
};

type Dot = {
    x: number;
    y: number; // its place in the grid, from the hero's top
    u: number; // how deep in the halftone it comes loose: 0 at the edge, 1 at the bottom
    z: number; // depth once loose: 0 far (slow, small), 1 near
    jitter: number; // -1 to 1: a ragged halftone, not a ruled one
    phase: number;
};

export default function Stardust() {
    const root = useRef<HTMLDivElement>(null);
    const {currentTheme} = useTheme();

    useGSAP(() => {
        const el = root.current;
        const canvas = el?.querySelector("canvas");
        const ctx = canvas?.getContext("2d");
        const hero = document.querySelector<HTMLElement>(".hero");
        const mesh = document.querySelector<HTMLElement>(".hero_mesh");
        if (!el || !canvas || !ctx || !hero || !mesh) return;
        const star = STAR[currentTheme];
        const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();

        let width = 0;
        let height = 0; // the hero's (the mesh's)
        let total = 0; // the canvas's: the hero and the room under it
        let grid = 9;
        let dots: Dot[] = [];

        const resize = () => {
            width = document.documentElement.clientWidth;
            height = mesh.getBoundingClientRect().height || window.innerHeight;
            total = el.offsetHeight + height;
            grid = width < 768 ? 7 : 9;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(total * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${total}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            // A dot for every cell of the grid, from the top of the hero (the edge climbs) to the canvas's bottom.
            dots = [];
            let seed = 1;
            const random = () => {
                seed = (seed * 16807) % 2147483647;
                return (seed - 1) / 2147483646;
            };
            for (let y = grid / 2; y < total; y += grid) {
                for (let x = grid / 2; x < width; x += grid) {
                    dots.push({x, y, u: random() ** 0.8, z: random() ** 1.5, jitter: random() * 2 - 1, phase: random() * Math.PI * 2});
                }
            }
        };

        // The scroll, smoothed a little, from 0 (top of the page) to 1 (the hero's bottom at the top of the screen).
        let target = 0;
        let progress = 0;

        // Below the edge, the page's background covers the mesh, with a round hole for every dot: through them, the
        // mesh itself, still moving. The loose dots are holes too until they've risen a little, then stars.
        const draw = (time: number) => {
            const depth = DEPTH * height;
            const edgeAt = (p: number) => height * (1 - EDGE) - p * CLIMB * height;
            const edge = edgeAt(progress);
            const rest = edgeAt(0);
            const full = grid * 0.75; // a hole's radius where the mesh is whole: neighbours overlap, no gaps
            const top = edge - grid * 0.5; // where the cover starts
            const holes = new Path2D();
            const loose: {x: number; y: number; r: number; body: number; glow: number}[] = [];
            for (const dot of dots) {
                const ragged = dot.jitter * depth * 0.06;
                if (dot.y < top - grid) continue;
                const d = dot.y - edge + ragged;
                const cover = 1 - smoothstep(0, depth, d);
                // Where it comes loose (low in the halftone, where dots no longer touch, so it leaves a round gap), or where
                // it was at rest if it was already that deep then: at rest the halftone is whole, nothing rises until the
                // edge moves.
                const from = dot.u < LOOSE ? Math.max(depth * (0.6 + 0.4 * (dot.u / LOOSE)), dot.y - rest + ragged) : Infinity;
                if (d <= from) {
                    const r = full * Math.sqrt(cover);
                    if (r > 0.35) {
                        holes.moveTo(dot.x + r, dot.y);
                        holes.arc(dot.x, dot.y, r, 0, Math.PI * 2);
                    }
                    continue;
                }
                const rise = (d - from) * (1.4 + 3.2 * dot.z * dot.z);
                const fade = 1 - smoothstep(0.25 * height, 0.7 * height, rise);
                if (fade <= 0) continue;
                const turn = smoothstep(0, 40 + 60 * dot.z, rise); // from a dot of mesh to a star
                const r0 = full * Math.sqrt(1 - smoothstep(0, depth, from));
                const r = r0 + (0.55 + 0.9 * dot.z - r0) * turn;
                const twinkle = 0.75 + 0.25 * Math.sin(time * (1.2 + dot.z * 2.2) + dot.phase);
                loose.push({x: dot.x, y: dot.y - rise, r, body: (1 - turn) * fade, glow: turn * fade * twinkle * (0.55 + 0.45 * dot.z)});
            }

            // In a few batches by opacity, rather than one by one.
            const batches = 6;
            const fillBatches = (alphaOf: (dot: typeof loose[number]) => number, colour?: string) => {
                for (let b = 1; b <= batches; b++) {
                    const path = new Path2D();
                    let any = false;
                    for (const dot of loose) {
                        if (Math.ceil(alphaOf(dot) * batches) !== b || dot.r < 0.3) continue;
                        path.moveTo(dot.x + dot.r, dot.y);
                        path.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
                        any = true;
                    }
                    if (!any) continue;
                    if (colour) ctx.fillStyle = `rgba(${colour}, ${b / batches})`;
                    else ctx.globalAlpha = b / batches;
                    ctx.fill(path);
                    ctx.globalAlpha = 1;
                }
            };

            ctx.globalCompositeOperation = "source-over";
            ctx.clearRect(0, 0, width, total);
            ctx.fillStyle = bg;
            ctx.fillRect(0, top, width, total - top);
            ctx.globalCompositeOperation = "destination-out";
            ctx.fillStyle = "#000";
            ctx.fill(holes);
            fillBatches((dot) => dot.body);
            ctx.globalCompositeOperation = "source-over";
            fillBatches((dot) => dot.glow, star);
        };

        const tick = () => {
            progress += (target - progress) * 0.22;
            if (Math.abs(target - progress) < 0.0005) progress = target;
            draw(gsap.globalTimeline.time());
        };

        resize();
        draw(0);
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
            // On from the top of the page until this element (under the hero) has scrolled away; the twinkle needs it even
            // when the page is still.
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
        <div className="dust" ref={root} aria-hidden="true">
            <canvas />
        </div>
    );
}
