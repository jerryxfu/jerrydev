import {Fragment, useEffect, useRef, useState} from "react";
import {ChevronDown, ChevronUp} from "lucide-react";
import "./FilePreview.scss";

type Kind = "image" | "video" | "audio" | "pdf" | "text";

interface FilePreviewProps {
    /** Where the file is: an object URL for a file picked here, or a drop's signed link. */
    src: string;
    name: string;
    mimeType?: string | null;
    size: number;
    /** The file itself, when it was picked on this device: its text is read from it rather than fetched. */
    file?: File | null;
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

/**
 * What a file looks like, without downloading it (issue #68): pictures, videos, audio and PDFs from the link itself,
 * text and code read in (the start of a big one) and highlighted. Shown on the drop before it's sent and on the drop
 * received. A file the browser can't show says so, and anything else shows nothing.
 */
export default function FilePreview({src, name, mimeType, size, file}: FilePreviewProps) {
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

    const onError = () => setFailed(true);
    return (
        <div className="expedite_file-preview">
            {kind === "image" && <img src={src} alt={name} className="expedite_preview-img" onError={onError} />}
            {kind === "video" && (
                // #t=0.1: starts a tenth of a second in, so the browser draws that frame rather than a black box before
                // it plays (iOS Safari shows nothing otherwise). A fragment, so the link sent to the server is unchanged.
                <video src={`${src}#t=0.1`} controls playsInline preload="metadata" className="expedite_preview-media" onError={onError} />
            )}
            {kind === "audio" && <audio src={src} controls preload="metadata" className="expedite_preview-audio" onError={onError} />}
            {kind === "pdf" && <iframe src={src} title={name} className="expedite_preview-frame" />}
            {kind === "text" && <TextPreview src={src} name={name} size={size} file={file} />}
        </div>
    );
}

// How much of a text file is read and shown: enough for any source file, and the start of a log or a dump.
const TEXT_LIMIT = 128 * 1024;

// A long file shows its first 20 lines until it's opened ($collapsed-lines in FilePreview.scss, which fades the last
// three). One only a little longer shows whole, rather than hiding a line or two behind a button.
const COLLAPSE_FROM = 25;

type Text = { text: string; html: string | null; lines: number; truncated: boolean };

function TextPreview({src, name, size, file}: { src: string; name: string; size: number; file?: File | null }) {
    // The text, keyed to where it came from so a new file never shows the last one's.
    const [read, setRead] = useState<{ src: string; result: Text | null } | null>(null);
    const [open, setOpen] = useState(false);
    const box = useRef<HTMLDivElement>(null);

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
            .then(async (buffer) => {
                const decoded = decode(buffer.slice(0, TEXT_LIMIT), truncated);
                if (decoded === null) return null;
                // Without the file's last newline, which would show as an empty numbered line.
                const text = decoded.replace(/\r\n/g, "\n").replace(/\n$/, "");
                const lang = LANGS[extension(name)];
                const html = lang ? await highlight(text, lang).catch(() => null) : null;
                return {text, html, lines: text.split("\n").length, truncated};
            })
            // Unreadable (no permission to read the link, or gone): no preview, as for any other file.
            .catch(() => null)
            .then((result) => {
                if (!cancelled) setRead({src, result});
            });
        return () => {
            cancelled = true;
        };
    }, [src, name, size, file]);

    const result = read?.src === src ? read.result : null;
    if (!result) return null;

    const long = result.lines >= COLLAPSE_FROM;
    // Closing a long file from far down it would leave the page scrolled past where it now ends: back to its top.
    const toggle = () => {
        const above = (box.current?.getBoundingClientRect().top ?? 0) < 0;
        setOpen(!open);
        if (open && above) requestAnimationFrame(() => box.current?.scrollIntoView({block: "start"}));
    };

    return (
        <div ref={box} className={`expedite_code${long && !open ? " is-collapsed" : ""}`}>
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
