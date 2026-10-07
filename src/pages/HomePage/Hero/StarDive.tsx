import {useEffect, useRef} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Stars over the hero's mesh as you scroll down out of it, as if diving into the site. None at the top of the page: they
// fade in as the hero starts to leave, move with the scroll, streak with its speed, and go with the hero. Drawn on a
// canvas only while the hero is on screen, and only when something moves.
//
// Two ways, while Jerry picks one: "rise" (the default) sends them straight up past you, the near ones faster; "dive"
// (?stars=dive) flies you into them, out of a point just below the hero.
type Mode = "rise" | "dive";
const MODE: Mode = new URLSearchParams(window.location.search).get("stars") === "dive" ? "dive" : "rise";

type Star = {
    x: number;
    y: number;
    z: number; // depth: 0 far, 1 near in rise; distance to you in dive, from NEAR to 1
};

const NEAR = 0.12; // dive: closer than this, a star has passed you and starts again far away
const DIVE = 0.0016; // dive: depth travelled per px scrolled
const AREA_PER_STAR = 3600; // px² of hero per star: about 350 on a laptop, 90 on a phone
// White in every theme, like the separator's glow: on the light meshes it reads as light, where a dark speck reads as rain.
const COLOUR = "245, 248, 255";

const clamp = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));
const smoothstep = (a: number, b: number, x: number) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
};

export default function StarDive() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const hero = canvas?.parentElement;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !hero || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        let width = 0;
        let height = 0;
        let stars: Star[] = [];

        const spawn = (star: Star, far: boolean) => {
            if (MODE === "rise") {
                star.x = Math.random() * width;
                star.y = Math.random() * height;
                star.z = Math.random() ** 1.6; // more far stars than near ones
            } else {
                // Around and mostly above the vanishing point, in units of the hero's size.
                star.x = (Math.random() * 2 - 1) * 1.1;
                star.y = -Math.random() * 1.6 + 0.08;
                star.z = far ? 0.85 + Math.random() * 0.15 : NEAR + Math.random() * (1 - NEAR);
            }
        };

        const resize = () => {
            const rect = hero.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            stars = Array.from({length: Math.round((width * height) / AREA_PER_STAR)}, () => {
                const star = {x: 0, y: 0, z: 0};
                spawn(star, false);
                return star;
            });
            draw();
        };

        let last = window.scrollY;
        let speed = 0; // the scroll's, in px a frame, smoothed
        let shown = 0; // how far the stars have faded in, from the scroll position

        const move = (delta: number) => {
            for (const star of stars) {
                if (MODE === "rise") {
                    // Up past you, near stars up to three times faster than the page (the canvas already moves with it).
                    star.y -= delta * (0.08 + 1.9 * star.z * star.z);
                    if (star.y < -40) star.y += height + 80;
                    else if (star.y > height + 40) star.y -= height + 80;
                } else {
                    star.z -= delta * DIVE;
                    if (star.z < NEAR) spawn(star, true);
                    else if (star.z > 1) star.z -= 1 - NEAR;
                }
            }
        };

        function draw() {
            ctx!.clearRect(0, 0, width, height);
            if (shown <= 0) return;
            ctx!.lineCap = "round";
            const vx = width / 2;
            const vy = height * 1.05;
            for (const star of stars) {
                let x1: number, y1: number, x2: number, y2: number, size: number, alpha: number;
                if (MODE === "rise") {
                    const z = star.z;
                    // The trail behind the star: below it when it rises, above it when the scroll goes back up.
                    const trail = clamp(speed * (1 + 1.9 * z * z) * 1.8, -220, 220) * (0.35 + 0.65 * z);
                    x1 = x2 = star.x;
                    y1 = star.y;
                    y2 = star.y + trail;
                    size = 0.6 + 1.7 * z;
                    alpha = 0.35 + 0.65 * z;
                } else {
                    // Seen from in front: x and y spread as the star comes nearer. The trail runs back to where it was a
                    // few frames ago at the scroll's speed.
                    const scale = 0.5 / star.z;
                    const from = 0.5 / Math.max(star.z + speed * DIVE * 3.5, NEAR);
                    x1 = vx + star.x * width * scale;
                    y1 = vy + star.y * height * scale;
                    x2 = vx + star.x * width * from;
                    y2 = vy + star.y * height * from;
                    size = Math.min(0.4 + 0.35 / star.z, 3);
                    alpha = clamp(1.15 - star.z, 0.15, 1);
                }
                ctx!.strokeStyle = `rgba(${COLOUR}, ${alpha * shown})`;
                ctx!.lineWidth = size;
                ctx!.beginPath();
                ctx!.moveTo(x1, y1);
                ctx!.lineTo(x2 + (x2 === x1 && y2 === y1 ? 0.01 : 0), y2);
                ctx!.stroke();
            }
        }

        // Every frame while the hero is on screen, but it only draws when the stars moved or changed.
        const tick = () => {
            const y = window.scrollY;
            const delta = y - last;
            last = y;
            const wasShown = shown;
            const wasSpeed = speed;
            speed += (delta - speed) * 0.3;
            if (Math.abs(speed) < 0.05) speed = 0;
            shown = smoothstep(0.02, 0.14, y / Math.max(height, 1));
            if (delta) move(delta);
            if (delta || speed !== wasSpeed || shown !== wasShown) draw();
        };

        const observer = new ResizeObserver(resize);
        observer.observe(hero);
        const trigger = ScrollTrigger.create({
            trigger: hero,
            start: "top top",
            end: "bottom top",
            onToggle: (self) => {
                if (self.isActive) {
                    last = window.scrollY;
                    gsap.ticker.add(tick);
                } else {
                    gsap.ticker.remove(tick);
                }
            },
        });

        return () => {
            observer.disconnect();
            trigger.kill();
            gsap.ticker.remove(tick);
        };
    }, []);

    return <canvas className="hero_stars" ref={canvasRef} aria-hidden="true" />;
}
