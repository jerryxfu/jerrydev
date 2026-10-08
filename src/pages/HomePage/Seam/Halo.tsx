import {useRef} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import type {Theme} from "@/context/ThemeContext.tsx";
import {clamp, fit, pageBackground, type RGB, rgba, shownTheme, smoothstep, watchTheme} from "../sky.ts";
import "./Halo.scss";

gsap.registerPlugin(ScrollTrigger);

// The halo, on the redesign branch only for now (Jerry: "we'll test the halo more after, to determine if we keep or
// drop"): the hero is the sky over a planet and the page is the planet, so the hero ends on the curve of its horizon, a
// line of light with an atmosphere's glow above it, and a light runs along it every few seconds like the separator's
// under "Hello". Nothing on the planet yet. As you scroll down you come down and the horizon flattens, by FLAT_AT; then
// its light fades as the squares pour (give Squares `pourAt={FLAT_AT}`). Goes inside Squares, whose top is the hero's
// bottom edge: the canvas reaches up over the hero's lower half from there, and a little below for the line's glow. A new
// theme changes its colours where it is, the planet fading with the page's background.

// Per theme: the atmosphere's glow and the line of light on the horizon.
const PALETTE: Record<Theme, {glow: RGB; line: RGB}> = {
    light: {glow: [255, 255, 255], line: [255, 255, 255]},
    night: {glow: [86, 136, 255], line: [176, 208, 255]},
    blush: {glow: [255, 255, 255], line: [255, 255, 255]},
    burgundy: {glow: [255, 112, 152], line: [255, 196, 214]},
};

// How far the middle of the curve stands above its ends at rest (hero heights, at most this much of the width), how far
// up its glow reaches (px on a 1440px wide screen), and the scroll at which it's flat (hero heights).
const DIP = 0.13;
const DIP_OF_WIDTH = 0.09;
const GLOW = 90;
export const FLAT_AT = 0.36;
// The light running along the horizon: how long a pass takes, and the rest between passes (seconds); and how long its
// light takes to fade once it's flat, or to come back (seconds).
const SWEEP = 3.2;
const REST = 2.4;
const FADE = 0.55;
const UNFADE = 0.3;
// How far the canvas reaches below the hero's edge, for the line's glow.
const BELOW = 40;

export default function Halo() {
    const root = useRef<HTMLCanvasElement>(null);

    useGSAP(() => {
        const canvas = root.current;
        const room = canvas?.parentElement;
        const hero = document.querySelector<HTMLElement>(".hero");
        if (!canvas || !room || !hero) return;
        // The theme's colours, set again when it changes (watchTheme, below).
        const page = pageBackground(room);
        let palette = PALETTE[shownTheme()];

        let ctx: CanvasRenderingContext2D | null = null;
        let width = 0;
        let height = 0; // the hero's
        let base = 0; // the hero's bottom edge, in the canvas
        const layout = () => {
            width = room.getBoundingClientRect().width;
            height = hero.getBoundingClientRect().height || window.innerHeight;
            base = height * 0.5;
            ctx = fit(canvas, width, base + BELOW);
            canvas.style.top = `${-base}px`;
        };

        // The scroll, smoothed a little, in hero heights; how far the light has faded once it's flat; and whether things
        // may move (not with reduced motion: then the halo stays as it is at the top, without the light running along it).
        let target = 0;
        let progress = -1;
        let faded = 0;
        let moving = false;

        const draw = (p: number, time: number) => {
            if (!ctx) return;
            const ground = rgba(page.colour);
            ctx.clearRect(0, 0, width, base + BELOW);
            const scale = Math.min(1.2, Math.max(0.5, width / 1440));
            const come = smoothstep(0, 1, clamp(p / FLAT_AT));
            const dip = Math.min(DIP * height, DIP_OF_WIDTH * width) * (1 - come);
            const strength = (1 - 0.45 * come) * (1 - faded);
            const half = width / 2;
            const flat = dip < 0.5;
            const r = flat ? 0 : (half * half + dip * dip) / (2 * dip);
            const cx = half;
            const cy = base - dip + r;

            // The atmosphere: a glow above the horizon, strongest on it.
            if (strength > 0) {
                const glow = GLOW * scale * (1 - 0.55 * come);
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
                    // A ring, outside the planet only: inside, the gradient would paint its first colour all the way in.
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(cx, cy, r + glow, 0, Math.PI * 2);
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.fill("evenodd");
                }
            }

            // The planet, the page's own background over the mesh under the curve; only above the hero's edge (below
            // it, the squares' room has its own).
            if (!flat) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, width, base);
                ctx.clip();
                ctx.fillStyle = ground;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // The line of light on the horizon, with a soft halo, and the light that runs along it.
            if (strength > 0) {
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
                    const span = Math.asin(clamp(width / 2 / r, 0, 1));
                    ctx.arc(cx, cy, r, -Math.PI / 2 - span - 0.05, -Math.PI / 2 + span + 0.05);
                }
                ctx.stroke();
                const phase = (time % (SWEEP + REST)) / SWEEP;
                if (moving && phase < 1) {
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
            }
        };

        // Each frame, drawing only when something shows a change: the scroll moved, the light faded or came back, the
        // light is running along the horizon (and a few frames after, to clear it), or the page is fading to a new theme.
        // It runs while the room is on screen or near it (`near`, from the scroll trigger below), and while a new theme
        // fades in.
        let near = false;
        let ticking = false;
        let drawnAt = -1;
        let last = 0;
        const tick = () => {
            progress = progress < 0 ? target : progress + (target - progress) * 0.25;
            if (Math.abs(target - progress) < 0.0005) progress = target;
            const time = gsap.globalTimeline.time();
            const dt = clamp(time - last, 0, 0.1);
            last = time;
            const before = faded;
            faded = progress >= FLAT_AT ? Math.min(1, faded + dt / FADE) : Math.max(0, faded - dt / UNFADE);
            const sweeping = moving && faded < 1 && (time % (SWEEP + REST)) / SWEEP < 1.03;
            const fading = page.fading;
            if (progress !== drawnAt || faded !== before || sweeping || fading) {
                draw(progress, time);
                drawnAt = progress;
            }
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
        draw(0, gsap.globalTimeline.time());
        // Measured again whenever the hero or the room changes size (a zoom, a phone's toolbar, a window).
        let pending = 0;
        const relayout = () => {
            cancelAnimationFrame(pending);
            pending = requestAnimationFrame(() => {
                layout();
                draw(Math.max(0, progress), gsap.globalTimeline.time());
            });
        };
        const sizes = new ResizeObserver(relayout);
        sizes.observe(hero);
        sizes.observe(room);

        // A new theme: its colours, and the planet following the page's fade.
        const unwatch = watchTheme((theme) => {
            palette = PALETTE[theme];
            page.fade();
            wake();
        });

        const mm = gsap.matchMedia();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
            moving = true;
            const run = ScrollTrigger.create({
                trigger: hero,
                start: "top bottom", // already passed at the top of the page, so it's on from there
                endTrigger: room,
                end: "bottom top",
                onUpdate: (self) => {
                    target = Math.max(0, self.scroll() / height);
                },
                onToggle: (self) => {
                    near = self.isActive;
                    if (near) wake();
                },
            });
            target = Math.max(0, run.scroll() / height);
            return () => {
                moving = false;
                near = false;
                run.kill();
            };
        });

        return () => {
            unwatch();
            sizes.disconnect();
            cancelAnimationFrame(pending);
            mm.revert();
            sleep();
        };
    });

    return <canvas className="halo" ref={root} aria-hidden="true" />;
}
