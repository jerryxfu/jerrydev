import type {ReactNode} from "react";

// The text with the letters found marked. A long line starts a few letters before its first mark, so the mark is in
// view even on a phone's narrow row.
export default function Marked({text, marks, cut = false}: { text: string; marks?: number[]; cut?: boolean }) {
    let start = 0;
    if (cut && marks?.length) {
        const first = Math.min(...marks);
        if (first > 16) start = first - 12;
    }
    const marked = new Set(marks);
    const parts: ReactNode[] = [];
    let run = "";
    let inMark = false;
    for (let i = start; i < text.length; i++) {
        const here = marked.has(i);
        if (here !== inMark && run) {
            parts.push(inMark ? <mark key={i}>{run}</mark> : run);
            run = "";
        }
        inMark = here;
        run += text[i];
    }
    if (run) parts.push(inMark ? <mark key="end">{run}</mark> : run);
    return <>{start > 0 && "…"}{parts}</>;
}
