import {type CSSProperties, useRef} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import "./Waves.scss";

gsap.registerPlugin(ScrollTrigger);

// Instead of the halo, to try on this branch: big soft shapes over the hero's lower part, like the blobs and long
// curved lines on a presentation's title slide, and not symmetric (Jerry, with such a slide for an example: "more like
// bigger blobs ... not exactly like the slides but that sort of waves. and it doesn't have to be symmetric"). Each
// shape is its own layer, drifting a little on a CSS transform animation, which browsers run without redrawing it;
// together they flatten and fade as you scroll into the squares. Nothing here blurs, masks or blends: in Firefox those
// made the hero expensive. Goes inside Squares, above its room.

// The scroll by which they're flat and gone (hero heights), as the halo was.
const FLAT_AT = 0.36;

// Drawn in a 1600 x 500 box stretched over the hero's lower part, 500 being the hero's bottom edge. Blobs are filled
// and lines stroked, with `strength` of the light colour; `drift` is which slow movement each makes (Waves.scss).
type Shape = {d: string; line?: boolean; strength: number; drift: "a" | "b" | "c" | "d"};
const SHAPES: Shape[] = [
    // A long wave across the whole width, behind, its crests uneven and rising to the right edge.
    {d: "M0 500 L0 330 C160 300 300 362 470 348 C640 334 760 258 960 268 C1160 278 1260 362 1420 302 C1500 272 1560 206 1600 186 L1600 500 Z", strength: 0.1, drift: "b"},
    // A lower one in front, on another rhythm.
    {d: "M0 500 L0 420 C200 444 360 380 560 394 C760 408 860 462 1060 442 C1260 422 1380 376 1600 402 L1600 500 Z", strength: 0.14, drift: "d"},
    // A hill rising from the left edge.
    {d: "M0 500 L0 300 C90 262 230 228 380 246 C560 268 640 380 720 500 Z", strength: 0.12, drift: "a"},
    // A rounder one hugging the right edge, higher up.
    {d: "M1600 40 C1520 46 1430 98 1420 182 C1410 266 1470 320 1600 330 Z", strength: 0.16, drift: "c"},
    // A long line sweeping across, down and up and down again.
    {d: "M-10 190 C200 205 400 420 640 410 S1000 215 1210 250 S1490 450 1610 440", line: true, strength: 0.5, drift: "d"},
];

export default function Waves() {
    const root = useRef<HTMLDivElement>(null);

    // Flatter and fainter as you scroll down out of the hero, gone by FLAT_AT. A transform and one variable the shapes
    // read, nothing that needs them drawn again as a group.
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
        <div className="waves" ref={root} aria-hidden="true">
            {SHAPES.map((shape) => (
                <div
                    key={shape.d}
                    className={`waves_one is-${shape.drift}${shape.line ? " is-line" : ""}`}
                    style={{"--strength": shape.strength} as CSSProperties}
                >
                    <svg viewBox="0 0 1600 500" preserveAspectRatio="none">
                        <path d={shape.d} />
                    </svg>
                </div>
            ))}
        </div>
    );
}
