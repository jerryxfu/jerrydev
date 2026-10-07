import {useLayoutEffect, useRef, useState} from "react";
import {gsap} from "gsap";
import {useGSAP} from "@gsap/react";

// The line under "Hello", drawn as an ECG trace with a single beat in it: medicine, robotics and live, in one line.
// It draws itself left to right, the way a monitor sweeps, then a brighter pulse runs along it every few seconds.
// With reduced motion it's simply there. Takes the place of the old glowing separator, in the same glow.

// Height of the drawing, and where the flat line sits in it; the beat rises 18px above and dips 9px below.
const HEIGHT = 34;
const BASE = 21;
// Where the beat falls, as a share of the width.
const BEAT_AT = 0.26;

// The flat line, then P, the PR segment, Q, R, S, back to the line, the ST segment, T, and flat to the end.
const trace = (width: number) => {
    const x = Math.round(width * BEAT_AT);
    return `M0 ${BASE} H${x} q5 -5 10 0 h5 l2 3 l4 -21 l4 27 l3 -9 h7 q7 -9 14 0 H${width}`;
};

export default function HeartbeatLine() {
    const box = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    // Its width is the old separator's, 130% of the hero's title block, so the path is laid out in real pixels:
    // stretched instead, the beat would widen with it.
    // Measured at once, before the first paint, then again whenever it changes.
    useLayoutEffect(() => {
        const el = box.current;
        if (!el) return;
        setWidth(Math.round(el.getBoundingClientRect().width));
        const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry?.contentRect.width ?? 0)));
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const drawn = useRef(false);
    useGSAP(() => {
        const el = box.current;
        if (!el || !width) return;
        const line = el.querySelector<SVGPathElement>(".hero_heartbeat-line");
        const pulse = el.querySelector<SVGPathElement>(".hero_heartbeat-pulse");
        if (!line || !pulse) return;
        const length = line.getTotalLength();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        // Drawn once, on arrival; a resize after that only re-lays it. Marked drawn when the drawing ends, not when it
        // starts, so a run that is reverted halfway (StrictMode's double mount, a resize mid-sweep) draws again.
        gsap.set(line, {strokeDasharray: length, strokeDashoffset: drawn.current || reduce ? 0 : length});
        if (reduce) return;
        if (!drawn.current) {
            gsap.to(line, {
                strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut", delay: 0.1,
                onComplete: () => {
                    drawn.current = true;
                },
            });
        }

        // A short bright stretch of the same path, run from one end to the other.
        const stretch = 70;
        gsap.fromTo(pulse, {strokeDasharray: `${stretch} ${length}`, strokeDashoffset: stretch, opacity: 1}, {
            strokeDashoffset: -length, duration: 1.8, ease: "power1.inOut", delay: 1.6, repeat: -1, repeatDelay: 2.8,
        });
    }, {dependencies: [width], scope: box, revertOnUpdate: true});

    return (
        <div className="hero_heartbeat" ref={box} aria-hidden="true">
            {width > 0 && (
                <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} fill="none">
                    <path className="hero_heartbeat-line" d={trace(width)} />
                    <path className="hero_heartbeat-pulse" d={trace(width)} />
                </svg>
            )}
        </div>
    );
}
