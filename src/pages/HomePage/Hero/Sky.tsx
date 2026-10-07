import {useEffect, useRef, useState} from "react";
import {gsap} from "gsap";
import {type Theme, useTheme} from "@/context/ThemeContext.tsx";
import {clamp, fit, type RGB, rgba, seeded, smoothstep} from "../sky.ts";
import "./Sky.scss";

// The sky over Montréal right now, on the hero: as the sun goes down there, the mesh darkens a little, more at the top,
// the way the sky does; once it's properly dark, stars come out, and now and then one shoots. Every theme, subtly: a
// darker sky, not night mode. The sun's height comes from the time and Montréal's place (a low-precision solar
// position, good to about a degree), so dusk follows the seasons: about 16:15 in December, 20:45 in June. It's
// Montréal's sky, like the hero's clock card, not the visitor's. Checked every minute and when the tab comes back.
// ?sky=21.5 shows it at that hour in Montréal (for testing); window.__sky(hour) does the same in development.

const MONTREAL = {lat: 45.5017, lon: -73.5673};

// Per theme, what the mesh is multiplied by when it's fully dark, at the top and at the bottom: the colours stay those of
// the theme, only deeper, and the light themes keep their top light enough for the navbar's dark text (4.5:1 or more).
const DUSK: Record<Theme, {top: RGB; bottom: RGB}> = {
    light: {top: [150, 172, 222], bottom: [205, 215, 238]},
    night: {top: [90, 92, 120], bottom: [170, 172, 190]},
    blush: {top: [190, 150, 190], bottom: [230, 214, 232]},
    burgundy: {top: [100, 80, 90], bottom: [180, 165, 172]},
};

// The sun's height for the darkening (from 6° above the horizon to 10° below) and for the stars (8° to 16° below).
const DUSK_FROM = 6;
const DUSK_TO = -10;
const STARS_FROM = -8;
const STARS_TO = -16;
const AREA_PER_STAR = 9000; // px² of hero per star: about 140 on a laptop, 35 on a phone

// The sun's height above the horizon, in degrees, at `date` seen from (lat, lon).
function sunHeight(date: Date, lat: number, lon: number) {
    const rad = Math.PI / 180;
    const d = date.getTime() / 86400000 - 10957.5; // days since 2000-01-01 12:00 UTC
    const g = (357.529 + 0.98560028 * d) * rad; // the sun's mean anomaly
    const q = 280.459 + 0.98564736 * d; // its mean longitude
    const longitude = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
    const tilt = (23.439 - 0.00000036 * d) * rad;
    const ascension = Math.atan2(Math.cos(tilt) * Math.sin(longitude), Math.cos(longitude));
    const declination = Math.asin(Math.sin(tilt) * Math.sin(longitude));
    const sidereal = (18.697374558 + 24.06570982441908 * d) % 24; // hours
    const hourAngle = (sidereal * 15 + lon) * rad - ascension;
    return Math.asin(Math.sin(lat * rad) * Math.sin(declination) + Math.cos(lat * rad) * Math.cos(declination) * Math.cos(hourAngle)) / rad;
}

// Today at `hour` in Montréal, as a Date (for ?sky= and testing).
function montrealAt(hour: number) {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-CA", {timeZone: "America/Toronto", hour: "numeric", minute: "numeric", hourCycle: "h23"}).formatToParts(now);
    const at = Number(parts.find((p) => p.type === "hour")?.value ?? 0) + Number(parts.find((p) => p.type === "minute")?.value ?? 0) / 60;
    return new Date(now.getTime() + (hour - at) * 3600000);
}

const asked = () => {
    const value = Number.parseFloat(new URLSearchParams(window.location.search).get("sky") ?? "");
    return Number.isFinite(value) ? value : null;
};

type Star = {x: number; y: number; r: number; glow: number; a: number; period: number; phase: number};

export default function Sky() {
    const {currentTheme} = useTheme();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hour, setHour] = useState<number | null>(asked);
    const [sun, setSun] = useState(() => sunHeight(hour === null ? new Date() : montrealAt(hour), MONTREAL.lat, MONTREAL.lon));

    // The sun, every minute and when the tab comes back.
    useEffect(() => {
        const update = () => setSun(sunHeight(hour === null ? new Date() : montrealAt(hour), MONTREAL.lat, MONTREAL.lon));
        update();
        const timer = window.setInterval(update, 60000);
        document.addEventListener("visibilitychange", update);
        if (import.meta.env.DEV) (window as unknown as {__sky?: (h: number | null) => void}).__sky = setHour;
        return () => {
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", update);
        };
    }, [hour]);

    const dusk = smoothstep(DUSK_FROM, DUSK_TO, sun);
    const starsOut = smoothstep(STARS_FROM, STARS_TO, sun);

    // The stars: drawn only while they're out and the hero is on screen, at about 30 frames a second.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || starsOut <= 0) {
            if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let ctx: CanvasRenderingContext2D | null = null;
        let width = 0;
        let height = 0;
        let stars: Star[] = [];
        const make = () => {
            width = document.documentElement.clientWidth;
            height = canvas.parentElement?.getBoundingClientRect().height || window.innerHeight;
            ctx = fit(canvas, width, height);
            const random = seeded(11);
            // Most of them small; more of them higher up, none down by the horizon's glow.
            stars = Array.from({length: Math.round((width * height) / AREA_PER_STAR)}, () => {
                const size = random();
                const big = size > 0.94 ? 2 : size > 0.7 ? 1 : 0;
                return {
                    x: random() * width,
                    y: random() ** 1.35 * height * 0.78,
                    r: [0.55, 0.95, 1.4][big]!,
                    glow: [0, 3, 5][big]!,
                    a: 0.45 + random() * 0.55,
                    period: 3 + random() * 4,
                    phase: random() * Math.PI * 2,
                };
            });
        };

        // A shooting star now and then, one at a time, once it's properly dark.
        const shooting = {at: 6 + Math.random() * 10, x: 0, y: 0, angle: 0, length: 0};
        const draw = () => {
            if (!ctx) return;
            const time = gsap.globalTimeline.time();
            ctx.clearRect(0, 0, width, height);
            for (const star of stars) {
                const twinkle = still ? 1 : 0.55 + 0.45 * Math.sin((time * Math.PI * 2) / star.period + star.phase);
                const alpha = star.a * twinkle * starsOut;
                if (star.glow) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.18})`;
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.glow, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
                ctx.fill();
            }
            if (still || starsOut < 0.6) return;
            const t = time - shooting.at;
            if (t > 0.9) {
                // The next one, somewhere in the upper part of the sky, in 18 to 35 seconds.
                const random = Math.random;
                Object.assign(shooting, {
                    at: time + 18 + random() * 17,
                    x: width * (0.1 + random() * 0.6),
                    y: height * (0.05 + random() * 0.3),
                    angle: (20 + random() * 12) * (Math.PI / 180),
                    length: 90 + random() * 60,
                });
            } else if (t > 0 && shooting.length) {
                const p = t / 0.9;
                const travel = 260 * p;
                const headX = shooting.x + Math.cos(shooting.angle) * travel;
                const headY = shooting.y + Math.sin(shooting.angle) * travel;
                const tailX = headX - Math.cos(shooting.angle) * shooting.length;
                const tailY = headY - Math.sin(shooting.angle) * shooting.length;
                const streak = ctx.createLinearGradient(tailX, tailY, headX, headY);
                streak.addColorStop(0, "rgba(255, 255, 255, 0)");
                streak.addColorStop(1, `rgba(255, 255, 255, ${0.7 * Math.sin(p * Math.PI) * starsOut})`);
                ctx.strokeStyle = streak;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(tailX, tailY);
                ctx.lineTo(headX, headY);
                ctx.stroke();
            }
        };

        make();
        draw();
        let frame = 0;
        const tick = () => {
            if (frame++ % 2 === 0) draw();
        };
        let onScreen = true;
        const observer = new IntersectionObserver(([entry]) => {
            onScreen = !!entry?.isIntersecting;
            if (onScreen && !still) gsap.ticker.add(tick);
            else gsap.ticker.remove(tick);
        });
        observer.observe(canvas);
        let resizeTimer: number | undefined;
        const onResize = () => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => {
                make();
                draw();
            }, 150);
        };
        window.addEventListener("resize", onResize);
        return () => {
            observer.disconnect();
            gsap.ticker.remove(tick);
            window.removeEventListener("resize", onResize);
            window.clearTimeout(resizeTimer);
        };
    }, [starsOut]);

    const {top, bottom} = DUSK[currentTheme];
    return (
        <div className="sky" aria-hidden="true">
            {/* Not there at all by day: a blended layer costs something on every frame of the mesh's drift. */}
            {dusk > 0.001 && (
                <div
                    className="sky_dusk"
                    style={{opacity: clamp(dusk), background: `linear-gradient(to bottom, ${rgba(top)}, ${rgba(bottom)})`}}
                />
            )}
            <canvas className="sky_stars" ref={canvasRef} />
        </div>
    );
}
