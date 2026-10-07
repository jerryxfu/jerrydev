import {useRef} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import "./Dive.scss";

gsap.registerPlugin(ScrollTrigger);

// The way down from the hero into About, as if diving into the site: three quarters of a screen of extra scroll
// between them (this element), and over it, fixed to the screen, a black and the stars. All of it follows the scroll,
// so it plays backwards going up. Along the way, as fractions of the scroll from the top of the page to About's top
// reaching 10% of the screen:
// - the stars fade in as soon as the hero starts to leave, and rise, the near ones faster, streaking with the speed;
// - from 0.25 to 0.55 the hero's words fade out and the black comes in over its mesh: then only stars on black, which
//   rise faster and brighter;
// - from 0.72 About's content rises into place while, from 0.76 to 0.97, the black lifts; the stars thin out over About.
// None of it with reduced motion: no space, no black, no stars.
//
// Layers: the black and the stars (z-index 0) cover the hero's mesh but not the hero (z-index 1 in Hero.scss), whose
// words fade out instead; About (z-index 2 in About.scss) comes up over both.
const BLACK_IN = [0.25, 0.55];
const BLACK_OUT = [0.76, 0.97];
const ABOUT_IN = [0.72, 1];
const STARS_OUT = [0.82, 1];

const AREA_PER_STAR = 3600; // px² of screen per star: about 280 on a laptop, 90 on a phone
const COLOUR = "245, 248, 255"; // white, in every theme

type Star = {
    x: number;
    y: number;
    z: number; // depth: 0 far, 1 near (more far ones)
    at: number; // when it shows, as the stars fade in or thin out: 0 first, 0.8 last
};

const clamp = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));
const smoothstep = (a: number, b: number, x: number) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
};
// How far into a [from, to] stretch of the dive p is, from 0 to 1.
const within = ([from, to]: number[], p: number) => clamp((p - from!) / (to! - from!), 0, 1);

export default function Dive() {
    const root = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        const el = root.current;
        const canvas = el?.querySelector("canvas");
        const black = el?.querySelector(".dive_black");
        const ctx = canvas?.getContext("2d");
        const hero = document.querySelector(".hero");
        if (!el || !canvas || !black || !ctx || !hero) return;

        const mm = gsap.matchMedia();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
            // The scene: the hero's words out and the black in, then About's content up and the black out.
            // From the document: selector strings in GSAP's own methods only look inside this component (useGSAP's scope).
            const words = document.querySelectorAll(".hero_container, .hero_about-container");
            const about = document.querySelectorAll(".about > *");
            const scene = gsap.timeline({
                scrollTrigger: {trigger: hero, start: "top top", endTrigger: el, end: "bottom 10%", scrub: true},
                defaults: {ease: "none"},
            })
                .fromTo(words, {opacity: 1}, {opacity: 0, duration: BLACK_IN[1]! - BLACK_IN[0]!}, BLACK_IN[0])
                .fromTo(black, {opacity: 0}, {opacity: 1, duration: BLACK_IN[1]! - BLACK_IN[0]!}, BLACK_IN[0])
                // Hidden from the start (immediateRender), not only once the rise begins: About comes on screen
                // during the black.
                .fromTo(about, {opacity: 0, y: 90}, {
                    opacity: 1, y: 0, ease: "power2.out", duration: ABOUT_IN[1]! - ABOUT_IN[0]!, stagger: 0.02,
                    immediateRender: true,
                }, ABOUT_IN[0])
                .to(black, {opacity: 0, duration: BLACK_OUT[1]! - BLACK_OUT[0]!}, BLACK_OUT[0])
                // The whole scene is the trigger's length, even if the last tween ends early.
                .set({}, {}, 1);
            const trigger = scene.scrollTrigger!;

            let width = 0;
            let height = 0;
            let stars: Star[] = [];
            const resize = () => {
                width = window.innerWidth;
                height = window.innerHeight;
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                canvas.width = Math.round(width * dpr);
                canvas.height = Math.round(height * dpr);
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                stars = Array.from({length: Math.round((width * height) / AREA_PER_STAR)}, () => ({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    z: Math.random() ** 1.6,
                    at: Math.random() * 0.8,
                }));
                draw();
            };

            let last = window.scrollY;
            let speed = 0; // the scroll's, in px a frame, smoothed
            let shown = 0; // how much of the starfield is out, from the scroll
            let dark = 0; // how black it is behind the stars

            function draw() {
                ctx!.clearRect(0, 0, width, height);
                if (shown <= 0) return;
                ctx!.lineCap = "round";
                for (const star of stars) {
                    const visible = smoothstep(star.at, star.at + 0.2, shown);
                    if (!visible) continue;
                    const z = star.z;
                    // Its trail: below it when it rises, above it when the scroll goes back up. Longer in the black.
                    const trail = clamp(speed * (1.08 + 1.9 * z * z) * 1.8 * (1 + 0.8 * dark), -260, 260) * (0.35 + 0.65 * z);
                    ctx!.strokeStyle = `rgba(${COLOUR}, ${Math.min((0.35 + 0.65 * z) * (1 + 0.5 * dark), 1) * visible})`;
                    ctx!.lineWidth = 0.6 + 1.7 * z;
                    ctx!.beginPath();
                    ctx!.moveTo(star.x, star.y);
                    ctx!.lineTo(star.x, star.y + trail + (trail ? 0 : 0.01));
                    ctx!.stroke();
                }
            }

            // Every frame while the dive is on, drawing only when something moved or changed.
            const tick = () => {
                const y = window.scrollY;
                const delta = y - last;
                last = y;
                const was = [speed, shown, dark];
                speed += (delta - speed) * 0.3;
                if (Math.abs(speed) < 0.05) speed = 0;
                const p = trigger.progress;
                shown = smoothstep(0.012, 0.085, p) * (1 - within(STARS_OUT, p));
                dark = within(BLACK_IN, p) * (1 - within(BLACK_OUT, p));
                if (delta) {
                    // Up past you, with the page and then some: the far ones at its speed, the near ones three times
                    // faster, all of them faster in the black.
                    for (const star of stars) {
                        star.y -= delta * (1.08 + 1.9 * star.z * star.z) * (1 + 0.7 * dark);
                        if (star.y < -40) star.y += height + 80;
                        else if (star.y > height + 40) star.y -= height + 80;
                    }
                }
                if (delta || speed !== was[0] || shown !== was[1] || dark !== was[2]) draw();
            };

            resize();
            window.addEventListener("resize", resize);
            // On while any of the scene is: from the top of the page until About is in.
            const run = ScrollTrigger.create({
                trigger: hero,
                start: "top top",
                endTrigger: el,
                end: "bottom top",
                onToggle: (self) => {
                    if (self.isActive) {
                        last = window.scrollY;
                        gsap.ticker.add(tick);
                    } else {
                        gsap.ticker.remove(tick);
                        shown = 0;
                        draw();
                    }
                },
            });

            return () => {
                window.removeEventListener("resize", resize);
                gsap.ticker.remove(tick);
                run.kill();
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            };
        });
        return () => mm.revert();
    }, {scope: root});

    return (
        <div className="dive" ref={root} aria-hidden="true">
            <div className="dive_black" />
            <canvas className="dive_stars" />
        </div>
    );
}
