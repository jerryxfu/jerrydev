import {useRef} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import {type Theme, useTheme} from "@/context/ThemeContext.tsx";
import {clamp, drawStars, fit, makeStars, mix, pageBackground, type RGB, rgba, seeded, smoothstep, type Star} from "./sky.ts";
import "./Mist.scss";

gsap.registerPlugin(ScrollTrigger);

// A sketch. The hero is high up, near space: its top fades into the dark, with stars in the dark themes, and its bottom
// into a sea of mist. Scrolling down, you sink into the mist: the far banks rise slower than the page, the near ones
// faster, and what goes into it blurs. About is under it. Scrolling back up, you rise out of it towards the stars.

// Per theme: the dark the top fades into (and how far), the mist's colour, and whether there are stars.
const PALETTE: Record<Theme, {space: RGB; spaceAlpha: number; fog: RGB; stars: boolean}> = {
    light: {space: [34, 64, 140], spaceAlpha: 0.5, fog: [255, 255, 255], stars: false},
    night: {space: [0, 0, 0], spaceAlpha: 1, fog: [52, 58, 78], stars: true},
    blush: {space: [110, 40, 90], spaceAlpha: 0.35, fog: [255, 255, 255], stars: false},
    burgundy: {space: [6, 1, 4], spaceAlpha: 1, fog: [74, 40, 55], stars: true},
};

// From the farthest bank to the nearest: where its band starts above the hero's bottom and how tall it is (hero
// heights), the size of its wisps (px across and down), how thick it gets, how much more than the page it rises over
// the scene (hero heights; below 0 is slower: it's far) and its drift (px a second). The nearest ends in the page.
const BANKS = [
    {top: 0.3, band: 0.36, wisp: [420, 90], thick: 0.5, rise: -0.08, drift: 6, seed: 3},
    {top: 0.21, band: 0.32, wisp: [340, 80], thick: 0.75, rise: 0.1, drift: -10, seed: 5},
    {top: 0.14, band: 0.3, wisp: [280, 70], thick: 1, rise: 0.28, drift: 15, seed: 9},
] as const;
const SKY_LAG = 0.25; // the mesh, the dark and the stars: slower than the page (hero heights over the scene)
const RES = 1 / 3; // the mist's pixels per CSS px: it's soft, the browser smooths it up
const AREA_PER_STAR = 3800;

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

// Value noise over five octaves, wrapping every `width` px across so the drift can loop: wisps of mist, stretched sideways.
function fogNoise(width: number, height: number, [across, down]: readonly [number, number], seed: number) {
    const out = new Float32Array(width * height);
    let amplitude = 1;
    let total = 0;
    for (let octave = 0; octave < 5; octave++) {
        const cellsX = Math.max(1, Math.round(width / (across / 2 ** octave)));
        const cellW = width / cellsX;
        const cellH = Math.max(1, down / 2 ** octave);
        const cellsY = Math.ceil(height / cellH) + 2;
        const random = seeded(seed * 31 + octave * 7);
        const lattice = Float32Array.from({length: cellsX * cellsY}, () => random());
        for (let y = 0; y < height; y++) {
            const gy = y / cellH;
            const j = Math.floor(gy);
            const ty = fade(gy - j);
            for (let x = 0; x < width; x++) {
                const gx = x / cellW;
                const i = Math.floor(gx);
                const tx = fade(gx - i);
                const i0 = i % cellsX;
                const i1 = (i + 1) % cellsX;
                const a = lattice[j * cellsX + i0]!;
                const b = lattice[j * cellsX + i1]!;
                const c = lattice[(j + 1) * cellsX + i0]!;
                const d = lattice[(j + 1) * cellsX + i1]!;
                out[y * width + x]! += amplitude * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
            }
        }
        total += amplitude;
        amplitude *= 0.5;
    }
    for (let k = 0; k < out.length; k++) out[k]! /= total;
    return out;
}

// One bank: wisps at the top of its band, thicker lower down; the nearest turns solid and into the page's colour.
function paintBank(canvas: HTMLCanvasElement, period: number, band: number, bank: typeof BANKS[number], near: boolean, fog: RGB, body: RGB) {
    const w = Math.max(8, Math.round(period * RES));
    const h = Math.max(4, Math.round(band * RES));
    const noise = fogNoise(w, h, [bank.wisp[0] * RES, bank.wisp[1] * RES], bank.seed);
    canvas.width = w * 2;
    canvas.height = h;
    canvas.style.width = `${period * 2}px`;
    canvas.style.height = `${band}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const image = ctx.createImageData(w * 2, h);
    const data = image.data;
    for (let y = 0; y < h; y++) {
        const down = y / (h - 1);
        const colour = near ? mix(fog, body, smoothstep(0.25, 0.7, down)) : fog;
        const solid = near ? smoothstep(0.26, 0.42, down) : 0;
        for (let x = 0; x < w; x++) {
            const wisp = clamp((noise[y * w + x]! - 0.72 + down * 0.9) * 2.5);
            const alpha = Math.max(solid, wisp * bank.thick) * 255;
            for (const at of [x, x + w]) {
                const i = (y * w * 2 + at) * 4;
                data[i] = colour[0];
                data[i + 1] = colour[1];
                data[i + 2] = colour[2];
                data[i + 3] = alpha;
            }
        }
    }
    ctx.putImageData(image, 0, 0);
}

export default function Mist() {
    const root = useRef<HTMLDivElement>(null);
    const skyRef = useRef<HTMLDivElement>(null);
    const {currentTheme} = useTheme();

    useGSAP(() => {
        const el = root.current;
        const sky = skyRef.current;
        const hero = document.querySelector<HTMLElement>(".hero");
        const about = document.querySelector<HTMLElement>(".about");
        const mesh = document.querySelector<HTMLElement>(".hero_mesh");
        const space = sky?.querySelector<HTMLElement>(".mist_space");
        const starsCanvas = sky?.querySelector("canvas");
        const veil = el?.querySelector<HTMLElement>(".mist_veil");
        if (!el || !sky || !hero || !about || !space || !starsCanvas || !veil) return;
        const palette = PALETTE[currentTheme];
        const bg = pageBackground();
        const banks = gsap.utils.toArray<HTMLElement>(".mist_bank", el);
        const near = BANKS[BANKS.length - 1]!;

        space.style.background = `linear-gradient(to bottom, ${rgba(palette.space, palette.spaceAlpha)}, ${rgba(palette.space, palette.spaceAlpha * 0.72)} 22%, ${rgba(palette.space, 0)} 62%)`;

        let stars: Star[] = [];
        let starsCtx: CanvasRenderingContext2D | null = null;
        const twinkle = () => {
            if (starsCtx) drawStars(starsCtx, stars, document.documentElement.clientWidth, window.innerHeight, gsap.globalTimeline.time(), (y) => 1 - smoothstep(0.08, 0.62, y));
        };

        const paint = () => {
            const width = document.documentElement.clientWidth;
            const height = window.innerHeight;
            banks.forEach((bank, i) => {
                const spec = BANKS[i]!;
                const band = Math.round(spec.band * height);
                bank.style.top = `${-Math.round(spec.top * height)}px`;
                bank.style.setProperty("--body", rgba(bg));
                const canvas = bank.querySelector("canvas");
                if (canvas) paintBank(canvas, width, band, spec, spec === near, mix(palette.fog, bg, 0), bg);
            });
            // The veil: the blur over what's about to go into the near bank, just above it.
            veil.style.top = `${-Math.round((near.top + 0.1) * height)}px`;
            veil.style.height = `${Math.round(0.16 * height)}px`;
            starsCtx = fit(starsCanvas, width, height);
            stars = palette.stars ? makeStars(width, height, AREA_PER_STAR) : [];
            twinkle();
        };

        paint();
        let resizeTimer: number | undefined;
        const onResize = () => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => {
                paint();
                ScrollTrigger.refresh();
            }, 150);
        };
        window.addEventListener("resize", onResize);

        const mm = gsap.matchMedia();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
            const scene = gsap.timeline({
                scrollTrigger: {trigger: hero, start: "top top", endTrigger: about, end: "top 35%", scrub: true, invalidateOnRefresh: true},
                defaults: {ease: "none"},
            });
            banks.forEach((bank, i) => scene.to(bank, {y: () => -BANKS[i]!.rise * window.innerHeight}, 0));
            scene.to(veil, {y: () => -near.rise * window.innerHeight}, 0);
            scene.to(sky, {y: () => SKY_LAG * window.innerHeight}, 0);
            if (mesh) {
                // The mesh's own `transition: all` would chase every frame of this: only its colours keep fading.
                gsap.set(mesh, {transition: "background-color 450ms"});
                scene.to(mesh, {y: () => SKY_LAG * window.innerHeight}, 0);
            }

            // The drift and the twinkle, while any of it is on screen.
            const drift = gsap.timeline({paused: true});
            banks.forEach((bank, i) => {
                const speed = BANKS[i]!.drift;
                const period = () => document.documentElement.clientWidth;
                drift.fromTo(bank.querySelector("canvas"), {x: () => (speed > 0 ? -period() : 0)}, {
                    x: () => (speed > 0 ? 0 : -period()), duration: document.documentElement.clientWidth / Math.abs(speed), ease: "none", repeat: -1,
                }, 0);
            });
            const on = ScrollTrigger.create({
                trigger: hero,
                start: "top bottom", // already passed at the top of the page, so it's on from there
                endTrigger: about,
                end: "top top",
                onToggle: (self) => {
                    if (self.isActive) {
                        drift.play();
                        if (stars.length) gsap.ticker.add(twinkle);
                    } else {
                        drift.pause();
                        gsap.ticker.remove(twinkle);
                    }
                },
            });
            return () => {
                gsap.ticker.remove(twinkle);
                on.kill();
            };
        });

        return () => {
            window.removeEventListener("resize", onResize);
            window.clearTimeout(resizeTimer);
            mm.revert();
        };
    }, {scope: root, dependencies: [currentTheme], revertOnUpdate: true});

    // The dark and the stars sit outside the mist's box, whose stacking would put them over the hero's words.
    return (
        <>
            <div className="mist_sky" ref={skyRef} aria-hidden="true">
                <div className="mist_space" />
                <canvas className="mist_stars" />
            </div>
            <div className="mist" ref={root} aria-hidden="true">
                <div className="mist_veil">
                    <div />
                    <div />
                    <div />
                    <div />
                </div>
                {BANKS.map((bank, i) => (
                    <div className="mist_bank" key={bank.seed}>
                        <canvas />
                        {i === BANKS.length - 1 && <div className="mist_body" />}
                    </div>
                ))}
            </div>
        </>
    );
}
