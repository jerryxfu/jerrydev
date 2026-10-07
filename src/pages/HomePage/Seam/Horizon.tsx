import {useRef} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import {type Theme, useTheme} from "@/context/ThemeContext.tsx";
import {clamp, drawStars, fit, makeStars, pageBackground, type RGB, rgba, smoothstep, type Star} from "./sky.ts";
import "./Horizon.scss";

gsap.registerPlugin(ScrollTrigger);

// A sketch. The hero is the sky high above a planet, and the page is the planet: the hero ends on the curve of its
// horizon, a thin line of light with the glow of an atmosphere above it, the same light as the separator under "Hello".
// As you scroll down, you come down: the horizon flattens and its glow thins, until it's a straight edge and About is on
// the ground. Stars above it in the dark themes.

// Per theme: the atmosphere's glow and the line of light on the horizon.
const PALETTE: Record<Theme, {glow: RGB; line: RGB; stars: boolean}> = {
    light: {glow: [255, 255, 255], line: [255, 255, 255], stars: false},
    night: {glow: [86, 136, 255], line: [176, 208, 255], stars: true},
    blush: {glow: [255, 255, 255], line: [255, 255, 255], stars: false},
    burgundy: {glow: [255, 112, 152], line: [255, 196, 214], stars: true},
};

// How far the middle of the horizon stands above its ends at rest (hero heights, and at most this much of the width),
// how much of the hero's scroll it takes to flatten, and how far up its glow reaches (px on a 1440px wide screen).
const DIP = 0.13;
const DIP_OF_WIDTH = 0.09;
const OVER = 0.75;
const GLOW = 90;
// The light that runs along the horizon, like the separator's: how long a pass takes, and the rest between passes.
const SWEEP = 3.2;
const REST = 2.4;
const AREA_PER_STAR = 3800;

export default function Horizon() {
    const root = useRef<HTMLDivElement>(null);
    const skyRef = useRef<HTMLCanvasElement>(null);
    const {currentTheme} = useTheme();

    useGSAP(() => {
        const el = root.current;
        const canvas = el?.querySelector("canvas");
        const starsCanvas = skyRef.current;
        const hero = document.querySelector<HTMLElement>(".hero");
        const mesh = document.querySelector<HTMLElement>(".hero_mesh");
        if (!el || !canvas || !starsCanvas || !hero || !mesh) return;
        const palette = PALETTE[currentTheme];
        const ground = rgba(pageBackground());

        let ctx: CanvasRenderingContext2D | null = null;
        let starsCtx: CanvasRenderingContext2D | null = null;
        let stars: Star[] = [];
        let width = 0;
        let height = 0; // the hero's
        let box = 0; // the canvas's: the lower part of the hero and the room under it
        let base = 0; // the hero's bottom, in the canvas

        const resize = () => {
            width = document.documentElement.clientWidth;
            height = mesh.getBoundingClientRect().height || window.innerHeight;
            base = Math.round(height * 0.5);
            box = base + el.offsetHeight;
            ctx = fit(canvas, width, box);
            starsCtx = fit(starsCanvas, width, height);
            stars = palette.stars ? makeStars(width, height, AREA_PER_STAR) : [];
        };

        let target = 0;
        let progress = -1;

        const draw = (p: number, time: number) => {
            if (!ctx) return;
            const come = smoothstep(0, 1, p);
            const dip = Math.min(DIP * height, DIP_OF_WIDTH * width) * (1 - come);
            const scale = Math.min(1.2, Math.max(0.5, width / 1440));
            const glow = GLOW * scale * (1 - 0.55 * come);
            const strength = 1 - 0.6 * come;
            ctx.clearRect(0, 0, width, box);

            // The planet: a circle through both ends of the hero's bottom edge, its top `dip` above them; flat at the end.
            const half = width / 2;
            const flat = dip < 0.5;
            const r = flat ? 0 : (half * half + dip * dip) / (2 * dip);
            const cx = half;
            const cy = base - dip + r;
            const shape = (grow: number) => {
                ctx!.beginPath();
                if (flat) ctx!.rect(-10, base - grow, width + 20, box - base + grow + 10);
                else ctx!.arc(cx, cy, r + grow, 0, Math.PI * 2);
            };

            // The atmosphere: a glow above the horizon, strongest on it.
            if (flat) {
                const g = ctx.createLinearGradient(0, base - glow, 0, base);
                g.addColorStop(0, rgba(palette.glow, 0));
                g.addColorStop(0.75, rgba(palette.glow, 0.22 * strength));
                g.addColorStop(1, rgba(palette.glow, 0.55 * strength));
                ctx.fillStyle = g;
                ctx.fillRect(0, base - glow, width, glow);
            } else {
                const g = ctx.createRadialGradient(cx, cy, r, cx, cy, r + glow);
                g.addColorStop(0, rgba(palette.glow, 0.55 * strength));
                g.addColorStop(0.25, rgba(palette.glow, 0.22 * strength));
                g.addColorStop(1, rgba(palette.glow, 0));
                ctx.fillStyle = g;
                shape(glow);
                ctx.fill();
            }

            // The ground, the page's own background, covering the mesh under the horizon.
            ctx.fillStyle = ground;
            shape(0);
            ctx.fill();

            // The line of light on the horizon, with a soft halo.
            ctx.save();
            ctx.shadowColor = rgba(palette.line, 0.9 * strength);
            ctx.shadowBlur = 14 * scale;
            ctx.strokeStyle = rgba(palette.line, 0.95 * strength);
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            if (flat) {
                ctx.moveTo(0, base);
                ctx.lineTo(width, base);
            } else {
                const half = Math.asin(clamp(width / 2 / r, 0, 1));
                ctx.arc(cx, cy, r, -Math.PI / 2 - half - 0.05, -Math.PI / 2 + half + 0.05);
            }
            ctx.stroke();

            // The sweep: the same line again, brighter, seen through a soft window that runs from past the left end to
            // past the right one.
            const phase = (time % (SWEEP + REST)) / SWEEP;
            if (phase < 1) {
                const reach = width * 0.28;
                const at = -reach + (width + 2 * reach) * smoothstep(0, 1, phase);
                const run = ctx.createLinearGradient(at - reach, 0, at + reach, 0);
                run.addColorStop(0, rgba(palette.line, 0));
                run.addColorStop(0.5, rgba(palette.line, strength));
                run.addColorStop(1, rgba(palette.line, 0));
                ctx.strokeStyle = run;
                ctx.shadowBlur = 22 * scale;
                ctx.lineWidth = 2.2;
                ctx.stroke();
            }
            ctx.restore();
        };

        const twinkle = () => {
            if (starsCtx) drawStars(starsCtx, stars, width, height, gsap.globalTimeline.time(), (y) => 1 - smoothstep(0.55, 0.85, y));
        };
        const tick = () => {
            progress = progress < 0 ? target : progress + (target - progress) * 0.25;
            if (Math.abs(target - progress) < 0.0005) progress = target;
            draw(progress, gsap.globalTimeline.time());
            if (stars.length) twinkle();
        };

        resize();
        draw(0, gsap.globalTimeline.time());
        twinkle();
        let resizeTimer: number | undefined;
        const onResize = () => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => {
                resize();
                draw(Math.max(0, progress), gsap.globalTimeline.time());
                twinkle();
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
                    target = clamp(self.scroll() / (OVER * height));
                },
                onToggle: (self) => {
                    if (self.isActive) gsap.ticker.add(tick);
                    else gsap.ticker.remove(tick);
                },
            });
            target = clamp(run.scroll() / (OVER * height));
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

    // The stars sit outside the horizon's box, so they can stay behind the hero's words.
    return (
        <>
            <div className="horizon_sky" aria-hidden="true">
                <canvas ref={skyRef} />
            </div>
            <div className="horizon" ref={root} aria-hidden="true">
                <canvas />
            </div>
        </>
    );
}
