import {type ReactNode, useEffect, useMemo, useRef, useState} from "react";
import {File as FileIcon, FileArchive, FileCode, FileText, Film, Image, type LucideIcon, Music} from "lucide-react";
import {formatBytes} from "../utils.ts";
import {kindOf} from "./FilePreview.tsx";
import {drawPdfPage} from "../pdfPage.ts";
import "./FileStack.scss";

/**
 * A file in a stack: its path (in the zip), its size, and how to get its bytes, for its small picture. Without them (a
 * file the page can't take out of a zip), it can't open either.
 */
export interface StackRow {
    key: string;
    path: string;
    size: number;
    bytes?: () => Promise<Blob>;
}

// A picture or a PDF up to this size shows a small copy of itself in its row; a bigger one, its icon (it would be read
// whole, from a drop's link too).
export const THUMB_MAX = 16 * 1024 * 1024;

// Past this many rows, the rest are counted, not shown (a folder of thousands): they're in the zip.
const ROWS_SHOWN = 500;

// The small picture's side, in CSS pixels (FileStack.scss).
const THUMB_PX = 40;

const ICONS: Record<NonNullable<ReturnType<typeof kindOf>>, LucideIcon> = {
    image: Image, video: Film, audio: Music, pdf: FileText, text: FileCode,
};

interface FileStackProps {
    rows: StackRow[];
    /** The row whose preview shows (where one file's shows, under the form). */
    open: string | null;
    onOpen: (key: string | null) => void;
    /** What each row ends with: Remove when sending, Download when receiving. */
    action: (row: StackRow) => ReactNode;
}

/**
 * Several files, a row each: its small picture or its icon, its name (its folder before it, fainter), its size, and
 * what to do with it. A row the page can show opens its preview, one at a time. Rows are compared by object, so the
 * caller keeps them (useMemo) or the pictures are drawn again.
 */
export default function FileStack({rows, open, onOpen, action}: FileStackProps) {
    return (
        <ul className="expedite_stack">
            {rows.slice(0, ROWS_SHOWN).map((row) => {
                const slash = row.path.lastIndexOf("/");
                const name = (
                    <>
                        <Thumb row={row} />
                        <span className="expedite_stack-name">
                            {slash >= 0 && <span className="expedite_stack-folder">{row.path.slice(0, slash + 1)}</span>}
                            {row.path.slice(slash + 1)}
                        </span>
                        <span className="expedite_stack-size">{formatBytes(row.size)}</span>
                    </>
                );
                return (
                    <li key={row.key} className={`expedite_stack-row${row.key === open ? " is-open" : ""}`}>
                        {row.bytes && kindOf(row.path) ? (
                            <button
                                type="button"
                                className="expedite_stack-file"
                                aria-pressed={row.key === open}
                                title={row.key === open ? "Hide its preview" : "Show its preview"}
                                onClick={() => onOpen(row.key === open ? null : row.key)}
                            >
                                {name}
                            </button>
                        ) : (
                            <span className="expedite_stack-file">{name}</span>
                        )}
                        {action(row)}
                    </li>
                );
            })}
            {rows.length > ROWS_SHOWN && (
                <li className="expedite_stack-more">and {(rows.length - ROWS_SHOWN).toLocaleString()} more</li>
            )}
        </ul>
    );
}

// A picture's small copy, or a PDF's first page, drawn once its row comes near the screen; until then, and for anything
// else, its icon.
function Thumb({row}: { row: StackRow }) {
    const kind = kindOf(row.path);
    const bytes = row.bytes;
    const draw = useMemo(
        () => bytes && row.size <= THUMB_MAX && (kind === "image" || kind === "pdf")
            ? (canvas: HTMLCanvasElement) => bytes().then((blob) => kind === "pdf"
                ? drawPdfPage(blob, canvas, THUMB_PX)
                : drawPicture(blob, canvas))
            : null,
        [bytes, row.size, kind],
    );
    const {ref, drawn} = useCanvasNearScreen(draw);

    const Icon = kind ? ICONS[kind] : /\.(zip|rar|7z|gz|tgz|tar|xz|bz2)$/i.test(row.path) ? FileArchive : FileIcon;
    return (
        <span className="expedite_stack-thumb">
            {draw && <canvas ref={ref} hidden={!drawn} aria-hidden />}
            {!drawn && <Icon size={18} strokeWidth={1.5} aria-hidden />}
        </span>
    );
}

/**
 * A canvas that `draw` paints once it comes near the screen (200px ahead), and whether it has: what stands in for it
 * until then can go. Its parent is watched, as the canvas stays hidden until drawn. A new `draw` draws again.
 */
export function useCanvasNearScreen(draw: ((canvas: HTMLCanvasElement) => Promise<void>) | null) {
    const ref = useRef<HTMLCanvasElement>(null);
    const [drawn, setDrawn] = useState(false);

    useEffect(() => {
        const canvas = ref.current;
        if (!draw || !canvas?.parentElement) return;
        let cancelled = false;
        const watch = new IntersectionObserver((entries) => {
            if (!entries.some((e) => e.isIntersecting)) return;
            watch.disconnect();
            draw(canvas)
                .then(() => {
                    if (!cancelled) setDrawn(true);
                })
                .catch(() => undefined); // can't be drawn: what stands in for it stays
        }, {rootMargin: "200px"});
        watch.observe(canvas.parentElement);
        return () => {
            cancelled = true;
            watch.disconnect();
        };
    }, [draw]);

    return {ref, drawn};
}

// The picture, filling the square (its middle), at the screen's density. Through an <img>, which takes any format the
// browser shows (SVG, HEIC in Safari), and dropped once drawn, so a stack of photos doesn't keep them all decoded.
async function drawPicture(blob: Blob, canvas: HTMLCanvasElement): Promise<void> {
    const url = URL.createObjectURL(blob);
    try {
        const img = new window.Image();
        img.src = url;
        await img.decode();
        const side = Math.round(THUMB_PX * Math.min(window.devicePixelRatio || 1, 3));
        canvas.width = canvas.height = side;
        const w = img.naturalWidth || side;
        const h = img.naturalHeight || side;
        const scale = Math.max(side / w, side / h);
        canvas.getContext("2d")?.drawImage(img, (side - w * scale) / 2, (side - h * scale) / 2, w * scale, h * scale);
    } finally {
        URL.revokeObjectURL(url);
    }
}
