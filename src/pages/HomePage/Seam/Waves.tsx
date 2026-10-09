import {type CSSProperties, useRef} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import "./Waves.scss";

gsap.registerPlugin(ScrollTrigger);

// Big soft shapes over the hero's lower part, like the blobs and long curved lines on a presentation's title slide,
// and not symmetric (Jerry, with such a slide for an example: "more like bigger blobs ... not exactly like the slides
// but that sort of waves. and it doesn't have to be symmetric"). Each shape is its own layer, drifting a little on a CSS
// transform animation, which browsers run without redrawing it. As you scroll into the squares, each slides down behind
// the hero's edge and off to one side (Jerry: "let them slide instead of compressing them", then "slide a bit more (not
// necessarily faster, but more) and also make them go sideways too"), each as far down as it takes to be out of sight by
// the same point, so the higher ones go faster and the layers part on the way. Nothing here blurs, masks or blends: in
// Firefox those made the hero expensive. Goes inside Squares, above its room.

// The scroll by which they're all gone (hero heights).
const GONE_AT = 0.5;

// Drawn in a 1600 x 500 box stretched over the hero's lower part, 500 being the hero's bottom edge. Blobs are filled
// and lines stroked, with `strength` of the light colour; `drift` is which slow movement each makes (Waves.scss).
// `sink` is how far down it slides by GONE_AT, in box heights: past its highest point, wherever its drift has it; `side`
// how far across, in box widths (the hill and the blob out through their own edge, the others parting); `enter` when it
// comes in, in seconds into the way in.
// What a slide or a drift could bring into view carries on out of sight: the long shapes a quarter of the width past
// each side, on curves of their own (they go up to 18% across and drift 4% more), the hill and the blob 100 past their
// edge, everything down to 560.
type Shape = {d: string; line?: boolean; strength: number; drift: "a" | "b" | "c" | "d"; sink: number; side: number; enter: number};
const SHAPES: Shape[] = [
    // A long wave across the whole width, behind, its crests uneven and rising to the right edge.
    {d: "M-400 560 L-400 345 C-330 318 -120 352 0 330 C160 300 300 362 470 348 C640 334 760 258 960 268 C1160 278 1260 362 1420 302 C1500 272 1560 206 1600 186 C1660 156 1760 118 1860 150 C1920 170 1960 220 2000 240 L2000 560 Z", strength: 0.1, drift: "b", sink: 0.8, side: 0.14, enter: 0},
    // A lower one in front, on another rhythm.
    {d: "M-400 560 L-400 430 C-300 455 -120 405.6 0 420 C200 444 360 380 560 394 C760 408 860 462 1060 442 C1260 422 1380 376 1600 402 C1710 415 1840 440 2000 405 L2000 560 Z", strength: 0.14, drift: "d", sink: 0.3, side: -0.16, enter: 0.36},
    // A hill rising from the left edge.
    {d: "M-100 560 L-100 342 L0 300 C90 262 230 228 380 246 C560 268 640 380 720 500 L760 560 Z", strength: 0.12, drift: "a", sink: 0.65, side: -0.3, enter: 0.24},
    // A rounder one hugging the right edge, higher up.
    {d: "M1700 32 L1600 40 C1520 46 1430 98 1420 182 C1410 266 1470 320 1600 330 L1700 338 Z", strength: 0.16, drift: "c", sink: 1, side: 0.3, enter: 0.12},
    // A long line sweeping across, down and up and down again.
    {d: "M-400 230 C-300 160 -136 181 -10 190 C200 205 400 420 640 410 S1000 215 1210 250 S1490 450 1610 440 C1682 434 1880 420 2000 330", line: true, strength: 0.5, drift: "d", sink: 0.7, side: 0.18, enter: 0.2},
];

// The light that runs along the line now and then, like the glow along the hero's separator: a window of its gradient
// (in the drawing's units, LIGHT wide) moved from past the line's left end, wherever a slide or drift has it, to past
// its right one. Every 9s, from 7s in (the way in has its own, below).
const LIGHT = 360;
const LIGHT_FROM = -760;
const LIGHT_TO = 1700;

// The way in, when the page opens (Jerry: "could we however add an intro animation to the blobs? and the line too? maybe
// the line could be drawn from side to side"): from INTRO_AT, each blob rises from behind the hero's edge, from the side
// it leaves by, over ENTER, at its own `enter` (the far ones first); the line is drawn from side to side over DRAW, the
// light at its tip.
const INTRO_AT = 0.4;
const ENTER = 1.8;
const DRAW = 1.8;

export default function Waves() {
    const root = useRef<HTMLDivElement>(null);
    const light = useRef<SVGLinearGradientElement>(null);

    // The way in, then, as you scroll down out of the hero, each layer slides down behind its edge and off to one side,
    // all of them gone by GONE_AT: only transforms, nothing drawn again. The drift is on each layer's picture, so the
    // movements add up, and the way in moves the layers in px (x, y), the slide in % (CSS translate, or xPercent and
    // yPercent), so those add up too if the page is scrolled meanwhile. The line's light rests once they're gone.
    useGSAP(() => {
        const el = root.current;
        const hero = document.querySelector<HTMLElement>(".hero");
        if (!el || !hero) return;
        const mm = gsap.matchMedia();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
            const layers = gsap.utils.toArray<HTMLElement>(".waves_one", el);
            const run = light.current && gsap.fromTo(light.current, {attr: {x1: LIGHT_FROM, x2: LIGHT_FROM + LIGHT}}, {
                attr: {x1: LIGHT_TO, x2: LIGHT_TO + LIGHT}, duration: 4, ease: "sine.inOut", repeat: -1, repeatDelay: 5, delay: 7,
            });

            const intro = gsap.timeline({delay: INTRO_AT});
            layers.forEach((layer, i) => {
                const shape = SHAPES[i];
                if (!shape) return;
                if (!shape.line) {
                    intro.from(layer, {y: () => el.offsetHeight * shape.sink, x: () => (el.offsetWidth * shape.side) / 2, duration: ENTER, ease: "power3.out"}, shape.enter);
                    return;
                }
                // The line: a clip opening from just before its left end to past its right one (with room around the
                // drawing's box, which the line overruns), gone once it's open; the light's window rides its tip, from
                // -2% of the box (-32) to 130% (2080).
                intro.fromTo(layer.querySelector("svg"), {clipPath: "inset(-50% 102% -50% -30%)"}, {
                    clipPath: "inset(-50% -30% -50% -30%)", duration: DRAW, ease: "power2.inOut", clearProps: "clipPath",
                }, shape.enter);
                if (light.current) intro.fromTo(light.current, {attr: {x1: -32 - LIGHT / 2, x2: -32 + LIGHT / 2}}, {
                    attr: {x1: 2080 - LIGHT / 2, x2: 2080 + LIGHT / 2}, duration: DRAW, ease: "power2.inOut",
                }, shape.enter);
            });

            const rest = (self: ScrollTrigger) => run?.paused(self.progress >= 1);
            const range = {
                trigger: hero, start: "top top", end: () => `+=${hero.offsetHeight * GONE_AT}`, onUpdate: rest, onRefresh: rest,
            };
            // The slide away is the browser's own where it can (Waves.scss), moved with the scroll itself. Set from here,
            // after each scroll, it trailed the page on a phone as soon as you swiped. Firefox may not have it yet.
            if (CSS.supports("animation-timeline: scroll()")) {
                ScrollTrigger.create(range);
                return;
            }
            const away = gsap.timeline({scrollTrigger: {...range, scrub: true}});
            layers.forEach((layer, i) => {
                const shape = SHAPES[i];
                if (shape) away.to(layer, {yPercent: 100 * shape.sink, xPercent: 100 * shape.side, ease: "none"}, 0);
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
                    style={{"--strength": shape.strength, "--sink": shape.sink, "--side": shape.side} as CSSProperties}
                >
                    <svg viewBox="0 0 1600 500" preserveAspectRatio="none">
                        <path d={shape.d} />
                        {shape.line && (
                            <>
                                <defs>
                                    <linearGradient id="waves-light" ref={light} gradientUnits="userSpaceOnUse" x1={LIGHT_FROM} y1="0" x2={LIGHT_FROM + LIGHT} y2="0">
                                        <stop offset="0" stopOpacity="0" />
                                        <stop offset="0.5" />
                                        <stop offset="1" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path className="waves_glow" d={shape.d} />
                                <path className="waves_glow is-core" d={shape.d} />
                            </>
                        )}
                    </svg>
                </div>
            ))}
        </div>
    );
}
