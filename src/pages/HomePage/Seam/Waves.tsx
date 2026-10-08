import {type CSSProperties, useRef, useState} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import "./Waves.scss";

gsap.registerPlugin(ScrollTrigger);

// Instead of the halo, to try on this branch: soft waves over the hero's lower part, like the wave patterns on a
// presentation's title slide (Jerry: "minimalist wave patterns ... kind of bubbly"). Three looks to compare, by
// ?waves=: lines (thin flowing lines, the default, his pick), bands (soft filled bands), bubbles (rows of small arcs).
// Each wave is its own picture, twice the screen's width, sliding sideways for good (a CSS animation of its
// transform, which browsers run without redrawing it); together they flatten and fade as you scroll into the squares.
// Nothing here blurs, masks or blends: in Firefox those made the hero expensive. Goes inside Squares, above its room.

type Look = "lines" | "bands" | "bubbles";
const LOOKS: readonly Look[] = ["lines", "bands", "bubbles"];
const asked = (): Look => {
    const value = new URLSearchParams(window.location.search).get("waves") as Look;
    return LOOKS.includes(value) ? value : "lines";
};

// The scroll by which they're flat and gone (hero heights), as the halo was.
const FLAT_AT = 0.36;

// Drawn in a box two screens wide (W) and 100 high, stretched over the waves' area. A wave: `periods` ups and downs per
// screen, `amp` high, around `y`; with `scallops`, every hump on the same side, like a row of bubbles. Whole humps per
// screen, so sliding by one screen loops without a seam.
const W = 2400;
function wave(periods: number, amp: number, y: number, scallops = false) {
    const half = 1200 / periods / 2;
    let d = `M0 ${y}`;
    for (let i = 0; i * half < W; i++) {
        const up = scallops || i % 2 === 0;
        d += ` Q${i * half + half / 2} ${up ? y - 2 * amp : y + 2 * amp} ${(i + 1) * half} ${y}`;
    }
    return d;
}
const band = (periods: number, amp: number, y: number) => `${wave(periods, amp, y)} L${W} 100 L0 100 Z`;

// Each look's waves, top to bottom: the path, how long one screen of drift takes (seconds), which way, how strong.
type Wave = {d: string; seconds: number; back?: boolean; strength: number};
const WAVES: Record<Look, Wave[]> = {
    lines: [
        {d: wave(1, 9, 34), seconds: 52, strength: 0.35},
        {d: wave(2, 5, 48), seconds: 38, back: true, strength: 0.45},
        {d: wave(1, 8, 62), seconds: 64, strength: 0.55},
        {d: wave(3, 3.5, 77), seconds: 30, back: true, strength: 0.65},
    ],
    bands: [
        {d: band(1, 9, 52), seconds: 60, strength: 0.12},
        {d: band(2, 6, 66), seconds: 44, back: true, strength: 0.16},
        {d: band(1, 7, 80), seconds: 70, strength: 0.22},
    ],
    bubbles: [
        {d: wave(12, 3, 42, true), seconds: 40, strength: 0.4},
        {d: wave(16, 2.5, 60, true), seconds: 32, back: true, strength: 0.5},
        {d: wave(10, 3.5, 78, true), seconds: 50, strength: 0.6},
    ],
};

export default function Waves() {
    const root = useRef<HTMLDivElement>(null);
    const [look] = useState(asked);

    // Flatter and fainter as you scroll down out of the hero, gone by FLAT_AT. A transform and one variable the
    // strokes read, nothing that needs the waves drawn again as a group.
    useGSAP(() => {
        const el = root.current;
        const hero = document.querySelector<HTMLElement>(".hero");
        if (!el || !hero) return;
        const mm = gsap.matchMedia();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
            gsap.fromTo(el, {scaleY: 1, "--fade": 1}, {
                scaleY: 0.25,
                "--fade": 0,
                ease: "none",
                scrollTrigger: {trigger: hero, start: "top top", end: () => `+=${hero.offsetHeight * FLAT_AT}`, scrub: true},
            });
        });
        return () => mm.revert();
    }, {scope: root});

    return (
        <div className={`waves waves--${look}`} ref={root} aria-hidden="true">
            {WAVES[look].map((one) => (
                <div
                    key={one.d}
                    className={`waves_one${one.back ? " is-back" : ""}`}
                    style={{"--seconds": `${one.seconds}s`, "--strength": one.strength} as CSSProperties}
                >
                    <svg viewBox={`0 0 ${W} 100`} preserveAspectRatio="none">
                        <path d={one.d} />
                    </svg>
                </div>
            ))}
        </div>
    );
}
