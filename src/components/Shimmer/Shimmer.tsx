import {type CSSProperties, type ReactNode, useCallback, useLayoutEffect, useRef} from "react";
import "./Shimmer.scss";

// Text that says something is under way: it keeps its own colour, and a lighter band sweeps across it, left to right,
// again and again (as the grey "Thinking" of a chat that's working). For a short line that waits on something. The
// text is plain text for a screen reader, and stays still with reduced motion. Usage:
//
//     <Shimmer>Taking you to</Shimmer>                        a sweep of 1.2 s, then 0.4 s of rest
//     <Shimmer sweep={2} pause={1}>Waiting for them</Shimmer>  slower, with a longer rest between two sweeps
//
// Its colour is its parent's. The band's width and colour can be set from a class: --shimmer-band (4em) and
// --shimmer-light (the text's colour, most of the way to white).
//
// Every shimmer runs on the wall clock: where the band is depends on the time of day alone, so two lines with the same
// pace sweep together, whenever each appeared, on one page, in two tabs, or on two devices whose clocks agree (Jerry).
// A line that appears joins the clock where it is, mid-sweep or at rest. Two with different paces meet again whenever
// their cycles do (1.6 s and 2.4 s: every 4.8 s).

type Props = {
    children: ReactNode;
    sweep?: number;     // seconds the band takes to cross the text
    pause?: number;     // seconds of rest between two sweeps
    className?: string;
};

export default function Shimmer({children, sweep = 1.2, pause = 0.4, className}: Props) {
    // The rest is made of distance, not of time: the band keeps going past the text's end, unseen, for as long as the
    // pause lasts. So the styles need the whole cycle's length, and the pause as a share of the sweep.
    const style = {"--shimmer-cycle": `${sweep + pause}s`, "--shimmer-rest": pause / sweep} as CSSProperties;

    // The clock: the animation is put where the wall clock says it is in its cycle. Before the first paint and when
    // the pace changes; and again whenever the browser starts the animation or a cycle ends, which brings back a line
    // that drifted (a laptop that slept, an animation the browser started anew). Left alone when it's already there,
    // within a frame or so. With reduced motion there's no animation, and nothing to set.
    const text = useRef<HTMLSpanElement>(null);
    const cycle = (sweep + pause) * 1000;
    const sync = useCallback(() => {
        const now = Date.now() % cycle;
        for (const animation of text.current?.getAnimations() ?? []) {
            const off = Math.abs(Number(animation.currentTime ?? 0) % cycle - now);
            if (Math.min(off, cycle - off) > 20) animation.currentTime = now;
        }
    }, [cycle]);
    useLayoutEffect(sync, [sync]);

    return (
        <span
            ref={text} className={className ? `shimmer ${className}` : "shimmer"} style={style}
            onAnimationStart={sync} onAnimationIteration={sync}
        >
            {children}
        </span>
    );
}
