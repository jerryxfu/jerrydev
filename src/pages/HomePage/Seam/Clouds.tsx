import {useRef} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import {type Theme, useTheme} from "@/context/ThemeContext.tsx";
import "./Clouds.scss";

gsap.registerPlugin(ScrollTrigger);

type RGB = readonly [number, number, number];

// The hero is the sky, the page a sea of clouds. Their tops show at the bottom of the hero; as you scroll, the near ones
// rise faster than the page and the far ones slower, so you sink into them, and About is on the other side. In the dark
// themes their edges catch the moon and stars show above them. All of it scrolls with the page: nothing is fixed.

// Per theme: the sky the far clouds fade into, their lit tops and their shade, the moonlit edge, and whether there are
// stars. The nearest layer ends in the page's own background, so About sits on it.
const PALETTE: Record<Theme, {sky: RGB; lit: RGB; shade: RGB; rim?: RGB; stars: boolean}> = {
    light: {sky: [171, 205, 239], lit: [255, 255, 255], shade: [203, 216, 238], stars: false},
    night: {sky: [14, 16, 32], lit: [60, 66, 94], shade: [24, 26, 36], rim: [176, 196, 255], stars: true},
    blush: {sky: [242, 196, 222], lit: [255, 255, 255], shade: [246, 212, 230], stars: false},
    burgundy: {sky: [30, 10, 18], lit: [90, 40, 58], shade: [44, 17, 27], rim: [255, 176, 200], stars: true},
};

// From the farthest to the nearest: how high its crest sits above the hero's bottom at rest (in screen heights), its
// puffs' radii (px on a 1440px wide screen), how much of the sky's colour it takes (haze), how much more than the page
// it rises over the scene (in screen heights; less than 0 is slower than the page: it's far), its drift (px a second),
// and how soft its edge is (a fraction of each puff's radius).
const LAYERS = [
    {crest: 0.16, r: [18, 44], haze: 0.62, rise: -0.14, drift: 5, soft: 0.4, seed: 11},
    {crest: 0.11, r: [26, 60], haze: 0.42, rise: -0.04, drift: -8, soft: 0.28, seed: 23},
    {crest: 0.07, r: [34, 82], haze: 0.2, rise: 0.06, drift: 11, soft: 0.18, seed: 37},
    {crest: 0.03, r: [44, 110], haze: 0, rise: 0.16, drift: -14, soft: 0.1, seed: 51},
] as const;
// The sky and its stars, slower than the page (in screen heights over the scene).
const SKY_LAG = 0.25;
const STARS_LAG = 0.32;
const AREA_PER_STAR = 4600; // px² of hero per star

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgba = (c: RGB, a = 1) => `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${a})`;
const cssRgb = (value: string): RGB => {
    const [r = 0, g = 0, b = 0] = value.match(/[\d.]+/g)?.map(Number) ?? [];
    return [r, g, b];
};
// Seeded, so a layer keeps its shape when the theme or the window changes.
const seeded = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type Puff = {x: number; y: number; r: number};

// One layer's shape along `period` px, periodic so the drift can loop: a row of puffs on the crest, which swells and dips
// along the way (bigger puffs where it swells), and a row of small ones under it that fills the base. Returns the puffs
// and the top of the body under them.
function shapeFor(period: number, crest: number, [rMin, rMax]: readonly [number, number], seed: number) {
    const random = seeded(seed);
    // Three slow waves, each a whole number of times over the period.
    const waves = [1, 2, 3].map((k) => ({k: k + Math.floor(random() * 2), phase: random() * Math.PI * 2, amp: 0.4 + random() * 0.6}));
    const total = waves.reduce((sum, w) => sum + w.amp, 0);
    const swell = (x: number) => waves.reduce((sum, w) => sum + w.amp * Math.sin((2 * Math.PI * w.k * x) / period + w.phase), 0) / total;
    const swing = rMax * 0.5; // how far the crest swells up, or dips
    const puffs: Puff[] = [];
    for (let x = 0; x < period;) {
        const s = swell(x);
        const t = random();
        const r = (rMin + (rMax - rMin) * t * t) * (0.7 + 0.225 * (s + 1));
        const top = crest - swing * s - r * (0.2 + 0.6 * random());
        puffs.push({x, y: top + r, r});
        x += r * (0.55 + 0.55 * random());
    }
    for (let x = random() * rMin; x < period;) {
        const r = rMin * (0.9 + 0.9 * random());
        puffs.push({x, y: crest - swing * swell(x) + r * (0.35 + 0.4 * random()), r});
        x += r * (0.8 + 0.7 * random());
    }
    return {puffs, base: (x: number) => crest - swing * swell(x) + rMin * 0.3};
}

// Paints a layer's band: soft puffs in the shade, lit from above and a little to the left, down into the body's colour
// at the bottom; in the dark themes a thin edge of moonlight along the tops. Two periods wide, so the drift can loop.
function paintBand(canvas: HTMLCanvasElement, period: number, height: number, crest: number, rMax: number,
                   shape: ReturnType<typeof shapeFor>, soft: number, colours: {lit: RGB; shade: RGB; body: RGB; rim?: RGB}) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = period * 2;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const {puffs, base} = shape;
    const each = (fn: (x: number, y: number, r: number) => void) => {
        for (const p of puffs) {
            for (const dx of [-period, 0, period, 2 * period]) {
                const x = p.x + dx;
                if (x + p.r > 0 && x - p.r < width) fn(x, p.y, p.r);
            }
        }
    };
    const {lit, shade, body, rim} = colours;

    // The shape, in the shade: soft-edged puffs, and the body under them.
    each((x, y, r) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(shade));
        g.addColorStop(1 - soft, rgba(shade));
        g.addColorStop(1, rgba(shade, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.fillStyle = rgba(shade);
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 8) ctx.lineTo(x, base(x % period));
    ctx.lineTo(width, height);
    ctx.fill();

    // The light, only where the shape is: each puff on the crest lit from above, a little to the left.
    ctx.globalCompositeOperation = "source-atop";
    each((x, y, r) => {
        const cx = x - r * 0.2;
        const cy = y - r * 0.45;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, rgba(lit, 0.95));
        g.addColorStop(0.55, rgba(lit, 0.5));
        g.addColorStop(1, rgba(lit, 0));
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    });
    // Down into the body's colour, below the deepest dips.
    const down = ctx.createLinearGradient(0, crest + rMax * 0.55, 0, height - 2);
    down.addColorStop(0, rgba(body, 0));
    down.addColorStop(1, rgba(body));
    ctx.fillStyle = down;
    ctx.fillRect(0, crest + rMax * 0.55, width, height);

    // A thin edge of moonlight along the tops: the shape, minus itself moved down 2px.
    if (rim) {
        const edge = document.createElement("canvas");
        edge.width = canvas.width;
        edge.height = canvas.height;
        const e = edge.getContext("2d");
        if (e) {
            e.drawImage(canvas, 0, 0);
            e.globalCompositeOperation = "destination-out";
            e.drawImage(canvas, 0, Math.round(2 * dpr));
            e.globalCompositeOperation = "source-in";
            e.fillStyle = rgba(rim, 0.55);
            e.fillRect(0, 0, edge.width, edge.height);
            ctx.globalCompositeOperation = "source-over";
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.drawImage(edge, 0, 0);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    }
    ctx.globalCompositeOperation = "source-over";
}

type Star = {x: number; y: number; r: number; a: number; phase: number; speed: number};

export default function Clouds() {
    const root = useRef<HTMLDivElement>(null);
    const starsRef = useRef<HTMLCanvasElement>(null);
    const {currentTheme} = useTheme();

    useGSAP(() => {
        const el = root.current;
        const hero = document.querySelector<HTMLElement>(".hero");
        const about = document.querySelector<HTMLElement>(".about");
        const mesh = document.querySelector<HTMLElement>(".hero_mesh");
        if (!el || !hero || !about) return;
        const palette = PALETTE[currentTheme];
        const bg = cssRgb(getComputedStyle(document.documentElement).getPropertyValue("--bg"));
        const layers = gsap.utils.toArray<HTMLElement>(".clouds_layer", el);
        const starsCanvas = starsRef.current;

        // The shapes, sized to the window: smaller puffs on a phone.
        const paint = () => {
            const width = document.documentElement.clientWidth;
            const height = window.innerHeight;
            const scale = Math.min(1.2, Math.max(0.42, width / 1440));
            layers.forEach((layer, i) => {
                const spec = LAYERS[i]!;
                const rMax = spec.r[1]! * scale;
                const band = Math.round(rMax * 2.7);
                const crestY = Math.round(rMax * 1.75); // the crest line, inside the band
                const near = i === LAYERS.length - 1;
                const lit = mix(palette.lit, palette.sky, spec.haze);
                const shade = mix(near ? mix(palette.shade, bg, 0.35) : palette.shade, palette.sky, spec.haze);
                const body = near ? bg : shade;
                // Its crest at spec.crest screen heights above the hero's bottom.
                layer.style.top = `${-Math.round(spec.crest * height) - crestY}px`;
                layer.style.setProperty("--body", rgba(body));
                layer.style.setProperty("--band", `${band}px`);
                const canvas = layer.querySelector("canvas");
                if (!canvas) return;
                canvas.style.width = `${width * 2}px`;
                canvas.style.height = `${band}px`;
                const shape = shapeFor(width, crestY, [spec.r[0] * scale, spec.r[1] * scale], spec.seed);
                paintBand(canvas, width, band, crestY, rMax, shape, spec.soft, {lit, shade, body, rim: palette.rim && mix(palette.rim, palette.sky, spec.haze)});
            });

            if (starsCanvas) {
                const ctx = starsCanvas.getContext("2d");
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                starsCanvas.width = Math.round(width * dpr);
                starsCanvas.height = Math.round(height * dpr);
                ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
                const random = seeded(7);
                stars = palette.stars ? Array.from({length: Math.round(width * height / AREA_PER_STAR)}, () => ({
                    x: random() * width,
                    y: random() * height,
                    r: 0.5 + random() ** 3 * 1.3,
                    a: 0.25 + random() * 0.7,
                    phase: random() * Math.PI * 2,
                    speed: 0.6 + random() * 1.6,
                })) : [];
                drawStars(gsap.globalTimeline.time());
            }
        };

        let stars: Star[] = [];
        const drawStars = (time: number) => {
            const ctx = starsCanvas?.getContext("2d");
            if (!ctx || !starsCanvas) return;
            const width = document.documentElement.clientWidth;
            const height = window.innerHeight;
            ctx.clearRect(0, 0, width, height);
            for (const star of stars) {
                // Fewer lower down, where the haze over the clouds is.
                const haze = Math.min(1, Math.max(0, (0.92 - star.y / height) / 0.35));
                const twinkle = 0.72 + 0.28 * Math.sin(time * star.speed + star.phase);
                ctx.fillStyle = `rgba(240, 244, 255, ${star.a * haze * twinkle})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
                ctx.fill();
            }
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
            // The scene: from the top of the page until About's top is a third of the way down the screen.
            const scene = gsap.timeline({
                scrollTrigger: {trigger: hero, start: "top top", endTrigger: about, end: "top 35%", scrub: true, invalidateOnRefresh: true},
                defaults: {ease: "none"},
            });
            layers.forEach((layer, i) => scene.to(layer, {y: () => -LAYERS[i]!.rise * window.innerHeight}, 0));
            if (mesh) {
                // The mesh's own `transition: all` would chase every frame of this: only its colours keep fading.
                gsap.set(mesh, {transition: "background-color 450ms"});
                scene.to(mesh, {y: () => SKY_LAG * window.innerHeight}, 0);
            }
            if (starsCanvas) scene.to(starsCanvas, {y: () => STARS_LAG * window.innerHeight}, 0);

            // The drift, and the stars' twinkle, only while the clouds are on screen.
            const drift = gsap.timeline({paused: true});
            layers.forEach((layer, i) => {
                const canvas = layer.querySelector("canvas");
                const speed = LAYERS[i]!.drift;
                const period = () => document.documentElement.clientWidth;
                drift.fromTo(canvas, {x: () => (speed > 0 ? -period() : 0)}, {
                    x: () => (speed > 0 ? 0 : -period()), duration: document.documentElement.clientWidth / Math.abs(speed), ease: "none", repeat: -1,
                }, 0);
            });
            const twinkle = () => drawStars(gsap.globalTimeline.time());
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

    // The stars' box is outside the clouds' one, whose stacking would put them over the hero's words.
    return (
        <>
            <div className="clouds_sky" aria-hidden="true">
                <canvas className="clouds_stars" ref={starsRef} />
            </div>
            <div className="clouds" ref={root} aria-hidden="true">
                {LAYERS.map((_, i) => (
                    <div className="clouds_layer" key={i}>
                        <canvas />
                        <div className="clouds_body" />
                    </div>
                ))}
            </div>
        </>
    );
}
