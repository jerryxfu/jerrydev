import {type CSSProperties, Fragment, useEffect, useRef, useState} from "react";
import {ChevronDown, ChevronUp} from "lucide-react";
import useMediaQuery from "../../../hooks/useMediaQuery.ts";
import "./FilePreview.scss";

type Kind = "image" | "video" | "audio" | "pdf" | "text";

/** What the preview learns about the file as it shows it, for the details beside it. */
export interface PreviewInfo {
    lines?: number;
    /** Only the start was read (TEXT_LIMIT), so `lines` counts that part. */
    partial?: boolean;
    lineEndings?: "LF" | "CRLF";
    /** The whole text, when the file was read whole (not cut at TEXT_LIMIT): what "Content" copies. */
    text?: string;
    width?: number;
    height?: number;
    /** In seconds. */
    duration?: number;
}

interface FilePreviewProps {
    /** Where the file is: an object URL for a file picked here, or a drop's signed link. */
    src: string;
    name: string;
    mimeType?: string | null;
    size: number;
    /** The file itself, when it was picked on this device: its text is read from it rather than fetched. */
    file?: File | null;
    onInfo?: (info: PreviewInfo) => void;
}

// Shiki's grammar per extension, loaded only when a file of that kind is shown. Listed one by one so the build emits
// these and no others (it has 300). Extensions missing here, and those mapped to null, show as plain text.
const LANGS: Record<string, [string, () => Promise<unknown>] | null> = {
    ts: ["typescript", () => import("shiki/langs/typescript.mjs")],
    mts: ["typescript", () => import("shiki/langs/typescript.mjs")],
    cts: ["typescript", () => import("shiki/langs/typescript.mjs")],
    tsx: ["tsx", () => import("shiki/langs/tsx.mjs")],
    js: ["javascript", () => import("shiki/langs/javascript.mjs")],
    mjs: ["javascript", () => import("shiki/langs/javascript.mjs")],
    cjs: ["javascript", () => import("shiki/langs/javascript.mjs")],
    jsx: ["jsx", () => import("shiki/langs/jsx.mjs")],
    py: ["python", () => import("shiki/langs/python.mjs")],
    java: ["java", () => import("shiki/langs/java.mjs")],
    kt: ["kotlin", () => import("shiki/langs/kotlin.mjs")],
    c: ["c", () => import("shiki/langs/c.mjs")],
    h: ["c", () => import("shiki/langs/c.mjs")],
    cpp: ["cpp", () => import("shiki/langs/cpp.mjs")],
    hpp: ["cpp", () => import("shiki/langs/cpp.mjs")],
    cs: ["csharp", () => import("shiki/langs/csharp.mjs")],
    go: ["go", () => import("shiki/langs/go.mjs")],
    rs: ["rust", () => import("shiki/langs/rust.mjs")],
    swift: ["swift", () => import("shiki/langs/swift.mjs")],
    html: ["html", () => import("shiki/langs/html.mjs")],
    css: ["css", () => import("shiki/langs/css.mjs")],
    scss: ["scss", () => import("shiki/langs/scss.mjs")],
    json: ["json", () => import("shiki/langs/json.mjs")],
    yaml: ["yaml", () => import("shiki/langs/yaml.mjs")],
    yml: ["yaml", () => import("shiki/langs/yaml.mjs")],
    toml: ["toml", () => import("shiki/langs/toml.mjs")],
    xml: ["xml", () => import("shiki/langs/xml.mjs")],
    md: ["markdown", () => import("shiki/langs/markdown.mjs")],
    sql: ["sql", () => import("shiki/langs/sql.mjs")],
    sh: ["bash", () => import("shiki/langs/bash.mjs")],
    bash: ["bash", () => import("shiki/langs/bash.mjs")],
    zsh: ["bash", () => import("shiki/langs/bash.mjs")],
    tex: ["latex", () => import("shiki/langs/latex.mjs")],
    txt: null, log: null, csv: null, tsv: null, ini: null, conf: null, env: null,
};

const IMAGE = ["png", "jpg", "jpeg", "gif", "webp", "avif", "svg", "bmp", "ico"];
const VIDEO = ["mp4", "m4v", "webm", "mov", "ogv"];
const AUDIO = ["mp3", "wav", "ogg", "oga", "opus", "m4a", "aac", "flac"];

// The extension decides first: the browser's guess at a type is often wrong for code (a TypeScript file comes as an
// MPEG video, video/mp2t, and many come as nothing at all). The type is for files without a known extension.
function kindOf(name: string, mimeType?: string | null): Kind | null {
    const ext = extension(name);
    if (ext in LANGS) return "text";
    if (IMAGE.includes(ext)) return "image";
    if (VIDEO.includes(ext)) return "video";
    if (AUDIO.includes(ext)) return "audio";
    if (ext === "pdf") return "pdf";
    const type = mimeType ?? "";
    if (type === "application/pdf") return "pdf";
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("audio/")) return "audio";
    if (type.startsWith("video/") && type !== "video/mp2t") return "video";
    if (type.startsWith("text/") || /json|xml|javascript/.test(type)) return "text";
    return null;
}

function extension(name: string): string {
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

const NOUN: Record<Kind, string> = {image: "picture", video: "video", audio: "audio", pdf: "PDF", text: "file"};

// What a file is, in words, by its extension: the browser's type can't be trusted for code (see kindOf).
const LABELS: Record<string, string> = {
    ts: "TypeScript", mts: "TypeScript", cts: "TypeScript", tsx: "TypeScript (JSX)",
    js: "JavaScript", mjs: "JavaScript", cjs: "JavaScript", jsx: "JavaScript (JSX)",
    py: "Python", java: "Java", kt: "Kotlin", c: "C", h: "C header", cpp: "C++", hpp: "C++ header", cs: "C#",
    go: "Go", rs: "Rust", swift: "Swift", html: "HTML", css: "CSS", scss: "SCSS", json: "JSON", yaml: "YAML",
    yml: "YAML", toml: "TOML", xml: "XML", md: "Markdown", sql: "SQL", sh: "Shell script", bash: "Shell script",
    zsh: "Shell script", tex: "LaTeX", txt: "Plain text", log: "Log", csv: "CSV", tsv: "TSV", ini: "INI",
    conf: "Configuration", env: "Environment file", pdf: "PDF document", zip: "ZIP archive", rar: "RAR archive",
    "7z": "7-Zip archive", gz: "Gzip archive", tar: "TAR archive", docx: "Word document", xlsx: "Excel spreadsheet",
    pptx: "PowerPoint deck", dmg: "Disk image", exe: "Windows program", apk: "Android app",
};

/** The file's type in words: "Python", "PNG picture". The raw type when the extension says nothing. */
export function describeType(name: string, mimeType?: string | null): string {
    const ext = extension(name);
    if (LABELS[ext]) return LABELS[ext];
    const kind = kindOf(name, mimeType);
    if (ext && (kind === "image" || kind === "video" || kind === "audio")) return `${ext.toUpperCase()} ${NOUN[kind]}`;
    return mimeType || "File";
}

/**
 * What a file looks like, without downloading it (issue #68): pictures, videos, audio and PDFs from the link itself,
 * text and code read in (the start of a big one) and highlighted. Shown on the drop before it's sent and on the drop
 * received. A file the browser can't show says so, and anything else shows nothing.
 */
export default function FilePreview({src, name, mimeType, size, file, onInfo}: FilePreviewProps) {
    const kind = kindOf(name, mimeType);
    const [failed, setFailed] = useState(false);
    if (!kind) return null;

    if (failed) {
        return (
            <p className="expedite_preview-note">
                This browser can't show this {NOUN[kind]}. Download it to open it.
            </p>
        );
    }

    // Text draws its own box, once it's read: one that can't be read leaves nothing behind.
    if (kind === "text") return <TextPreview src={src} name={name} size={size} file={file} onInfo={onInfo} />;

    const onError = () => setFailed(true);
    return (
        <div className={`expedite_file-preview${kind === "pdf" ? " is-pdf" : ""}`}>
            {kind === "image" && (
                <img
                    src={src} alt={name} className="expedite_preview-img" onError={onError}
                    onLoad={(e) => onInfo?.({width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight})}
                />
            )}
            {kind === "video" && (
                // #t=0.1: starts a tenth of a second in, so the browser draws that frame rather than a black box before
                // it plays (iOS Safari shows nothing otherwise). A fragment, so the link sent to the server is unchanged.
                <video
                    src={`${src}#t=0.1`} controls playsInline preload="metadata" className="expedite_preview-media" onError={onError}
                    onLoadedMetadata={(e) => {
                        const v = e.currentTarget;
                        onInfo?.({duration: v.duration, width: v.videoWidth || undefined, height: v.videoHeight || undefined});
                    }}
                />
            )}
            {kind === "audio" && (
                <audio
                    src={src} controls preload="metadata" className="expedite_preview-audio" onError={onError}
                    onLoadedMetadata={(e) => onInfo?.({duration: e.currentTarget.duration})}
                />
            )}
            {/* A whole page, at the width of the preview: the viewer fits the page's width (view=FitH for Chromium's
                viewer, zoom=page-width for Firefox's) with its thumbnails closed (navpanes=0), and the frame is a
                portrait page tall (FilePreview.scss). */}
            {kind === "pdf" && (
                <iframe src={`${src}#view=FitH&navpanes=0&zoom=page-width`} title={name} className="expedite_preview-frame" />
            )}
        </div>
    );
}

// How much of a text file is read and shown: enough for any source file, and the start of a log or a dump.
const TEXT_LIMIT = 128 * 1024;

// A long file shows its first lines until it's opened: 30 where the preview has a laptop's room, 20 on a phone. One only
// a little longer than that shows whole, rather than hiding a line or two behind a button.
const COLLAPSED_LINES = {wide: 30, narrow: 20};
const COLLAPSE_MARGIN = 5;

type Text = { text: string; html: string | null; lines: number; truncated: boolean };

function TextPreview({src, name, size, file, onInfo}: {
    src: string; name: string; size: number; file?: File | null; onInfo?: (info: PreviewInfo) => void;
}) {
    // The text, keyed to where it came from so a new file never shows the last one's.
    const [read, setRead] = useState<{ src: string; result: Text | null } | null>(null);
    const [open, setOpen] = useState(false);
    const box = useRef<HTMLDivElement>(null);
    const collapsedLines = useMediaQuery("(min-width: 900px)") ? COLLAPSED_LINES.wide : COLLAPSED_LINES.narrow;

    useEffect(() => {
        let cancelled = false;
        const truncated = size > TEXT_LIMIT;
        // A drop's link is read by its first bytes only (a Range request, which needs no extra permission).
        const bytes = file
            ? file.slice(0, TEXT_LIMIT).arrayBuffer()
            : fetch(src, {headers: {Range: `bytes=0-${TEXT_LIMIT - 1}`}}).then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.arrayBuffer();
            });

        bytes
            .then((buffer): Text | null => {
                const decoded = decode(buffer.slice(0, TEXT_LIMIT), truncated);
                if (decoded === null) return null;
                // Without the file's last newline, which would show as an empty numbered line.
                const text = decoded.replace(/\r\n/g, "\n").replace(/\n$/, "");
                const lines = text.split("\n").length;
                if (!cancelled) {
                    onInfo?.({lines, partial: truncated, lineEndings: decoded.includes("\r\n") ? "CRLF" : "LF", text: truncated ? undefined : decoded});
                }
                return {text, html: null, lines, truncated};
            })
            // Unreadable (no permission to read the link, or gone): no preview, as for any other file.
            .catch(() => null)
            .then((result) => {
                if (cancelled) return;
                // The text shows as soon as it's read; its colours follow, a moment later on the first code file
                // (Shiki and the grammar load then).
                setRead({src, result});
                const lang = LANGS[extension(name)];
                if (result && lang) {
                    highlight(result.text, lang)
                        .then((html) => {
                            if (!cancelled) setRead({src, result: {...result, html}});
                        })
                        .catch(() => undefined);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [src, name, size, file, onInfo]);

    // Being read: lines standing in for the text, about as many as it will show, so what's under it doesn't jump.
    if (read?.src !== src) {
        const guess = Math.max(3, Math.ceil(size / 40)); // about 40 bytes a line of code
        return <TextPlaceholder lines={Math.min(collapsedLines, guess)} bar={guess >= collapsedLines + COLLAPSE_MARGIN} />;
    }
    const result = read.result;
    if (!result) return null;

    const long = result.lines >= collapsedLines + COLLAPSE_MARGIN;
    // Closing a long file from far down it would leave the page scrolled past where it now ends: back to its top.
    const toggle = () => {
        const above = (box.current?.getBoundingClientRect().top ?? 0) < 0;
        setOpen(!open);
        if (open && above) requestAnimationFrame(() => box.current?.scrollIntoView({block: "start"}));
    };

    return (
        <div
            ref={box}
            className={`expedite_file-preview expedite_code${long && !open ? " is-collapsed" : ""}`}
            style={{"--collapsed-lines": collapsedLines} as CSSProperties}
        >
            {result.html
                ? <div dangerouslySetInnerHTML={{__html: result.html}} /> // Shiki escapes the text it's given
                : <pre><code>{result.text.split("\n").map((line, i) => <Fragment key={i}><span className="line">{line}</span>{"\n"}</Fragment>)}</code></pre>}
            {/* Sticks to the bottom of the screen while the open file runs past it, so closing it is always one click
                away, wherever one is in it. */}
            {long && (
                <div className="expedite_code-bar">
                    <button type="button" className="expedite_code-toggle" aria-expanded={open} onClick={toggle}>
                        {open ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
                        {open ? "Collapse" : `Show all ${result.lines.toLocaleString()} lines`}
                    </button>
                </div>
            )}
            {result.truncated && <p className="expedite_code-more">Showing the start. Download it to see it all.</p>}
        </div>
    );
}

// Lengths for the placeholder's lines, in percent of the width: ragged, like code.
const PLACEHOLDER_WIDTHS = [58, 82, 44, 71, 90, 36, 64, 77, 50, 28];

// `bar`: the file will likely be long enough to collapse, so the room of its "Show all" bar is kept too.
function TextPlaceholder({lines, bar}: { lines: number; bar: boolean }) {
    return (
        <div
            className={`expedite_file-preview expedite_code is-loading${bar ? " is-collapsed" : ""}`}
            style={{"--collapsed-lines": lines} as CSSProperties}
            role="status"
            aria-label="Loading the preview"
        >
            <pre>
                {Array.from({length: lines}, (_, i) => (
                    <span key={i} className="expedite_code-placeholder" style={{width: `${PLACEHOLDER_WIDTHS[i % PLACEHOLDER_WIDTHS.length]}%`}} />
                ))}
            </pre>
            {bar && (
                <div className="expedite_code-bar" aria-hidden="true">
                    <span className="expedite_code-toggle" style={{visibility: "hidden"}}>Show all</span>
                </div>
            )}
        </div>
    );
}

// UTF-8 text, or null for anything binary. Strict, so a picture or an archive renamed .txt isn't shown as garbage; a
// cut file may end halfway through a character, which `stream` lets go.
function decode(buffer: ArrayBuffer, truncated: boolean): string | null {
    try {
        const text = new TextDecoder("utf-8", {fatal: true}).decode(buffer, {stream: truncated});
        return text.includes("\u0000") ? null : text;
    } catch {
        return null;
    }
}

// One highlighter for the page, made on the first code file shown: the light and dark GitHub themes (as on the blog),
// and the JavaScript regex engine, so no WebAssembly. Each grammar is added as it's needed.
type Highlighter = Awaited<ReturnType<typeof import("shiki/core")["createHighlighterCore"]>>;
let highlighter: Promise<Highlighter> | null = null;

async function highlight(text: string, [lang, load]: [string, () => Promise<unknown>]): Promise<string> {
    highlighter ??= Promise.all([import("shiki/core"), import("shiki/engine/javascript")]).then(
        ([{createHighlighterCore}, {createJavaScriptRegexEngine}]) => createHighlighterCore({
            themes: [import("shiki/themes/github-light.mjs"), import("shiki/themes/github-dark.mjs")],
            langs: [],
            engine: createJavaScriptRegexEngine(),
        }),
    );
    const shiki = await highlighter;
    if (!shiki.getLoadedLanguages().includes(lang)) {
        await shiki.loadLanguage(load() as Parameters<Highlighter["loadLanguage"]>[0]);
    }
    return shiki.codeToHtml(text, {lang, themes: {light: "github-light", dark: "github-dark"}});
}
