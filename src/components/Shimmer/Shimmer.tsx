import type {CSSProperties, ReactNode} from "react";
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
    return <span className={className ? `shimmer ${className}` : "shimmer"} style={style}>{children}</span>;
}
