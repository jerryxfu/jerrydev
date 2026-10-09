import {type KeyboardEvent, useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import {highlighterFor, isLanguage} from "../highlight.ts";
import "./CodeEditor.scss";

interface CodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
    /** The highlighting language, by Shiki's id. */
    language: string;
    placeholder?: string;
    className?: string;
}

// Past this, the box stays plain: colouring it would hold the page up for seconds. The receiver's view colours as much
// (FilePreview's TEXT_LIMIT), so what's coloured here is coloured there.
const HIGHLIGHT_LIMIT = 128 * 1024;

// Colouring takes longer the longer the text. While it fits in a key's time the colours follow every key; past that,
// the text shows plain as it's typed and is coloured once the typing pauses: for a long text (half a second for 68 KB),
// a pause twice that long, so that typing again rarely waits for it.
const KEY_BUDGET_MS = 16;
const PAUSE_MS = 300;

// What the device is timed on when a grammar loads: about 4 KB of ordinary code.
const SAMPLE = "const value = compute(items[index], 42); // a note\n".repeat(80);

// Tab in the code box indents, as in an editor: the caret's line, or every line selected; Shift+Tab takes a level off.
// Through the browser's own editing (insertText), so undo takes it back like typing. A tab if the code is indented with
// tabs, else four spaces.
function indent(box: HTMLTextAreaElement, out: boolean) {
    const {value, selectionStart: start, selectionEnd: end} = box;
    const unit = /^\t/m.test(value) ? "\t" : "    ";
    const oneLine = !value.slice(start, end).includes("\n");
    if (!out && oneLine) {
        document.execCommand("insertText", false, unit);
        return;
    }
    // Whole lines, from the first selected to the last (not the line a selection merely ends at the start of).
    const from = value.lastIndexOf("\n", start - 1) + 1;
    const last = end > start && value[end - 1] === "\n" ? end - 1 : end;
    const lineEnd = value.indexOf("\n", last);
    const to = lineEnd === -1 ? value.length : lineEnd;
    const block = value.slice(from, to);
    const changed = block
        .split("\n")
        .map((line) => (out ? line.replace(/^(\t| {1,4})/, "") : unit + line))
        .join("\n");
    if (changed === block) return;
    box.setSelectionRange(from, to);
    document.execCommand(changed ? "insertText" : "delete", false, changed);
    if (oneLine) {
        // A caret stays where it was in its line, moved back with the text.
        const removed = block.length - changed.length;
        box.setSelectionRange(Math.max(from, start - removed), Math.max(from, end - removed));
    } else {
        box.setSelectionRange(from, from + changed.length);
    }
}

interface Colourer {
    language: string;
    colour: (text: string) => string;
    /** How long colouring takes on this device, per character. */
    msPerChar: number;
}

/**
 * The text box for a text drop sent as code: a real <textarea> (typing, selecting, undo and paste as ever), its text
 * transparent over a highlighted copy of it in the same font, size and spacing, scrolled with it. The colours follow
 * every key once the grammar is loaded, or the pauses in the typing for a long text; until then, or for a very long
 * text, the box is plain.
 */
export default function CodeEditor({value, onChange, onKeyDown, language, placeholder, className}: CodeEditorProps) {
    // The colouring function for the language, once its grammar is loaded.
    const [colourer, setColourer] = useState<Colourer | null>(null);
    // The colours of a text too long to colour on every key, made once the typing paused.
    const [late, setLate] = useState<{ key: string; html: string } | null>(null);
    const layer = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLTextAreaElement>(null);
    // Escape, then Tab: the way out of the box from the keyboard, since Tab itself indents (as in VS Code).
    const escaped = useRef(false);

    useEffect(() => {
        // Plain code (Auto recognized nothing): no colours to load.
        if (!isLanguage(language)) return;
        let cancelled = false;
        highlighterFor(language)
            .then((colour) => {
                // Timed on the second run: the first also pays for warming the engine up.
                colour(SAMPLE);
                const start = performance.now();
                colour(SAMPLE);
                const msPerChar = (performance.now() - start) / SAMPLE.length;
                if (!cancelled) setColourer({language, colour, msPerChar});
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [language]);

    const ready = colourer?.language === language && value.length <= HIGHLIGHT_LIMIT ? colourer : null;
    // Quick enough to colour with every key, in the render; otherwise after a pause, in the effect below.
    const perKey = !!ready && value.length * ready.msPerChar <= KEY_BUDGET_MS;
    const key = `${language}\u0000${value}`;
    // A trailing newline: the copy then has the empty last line the text box shows after one.
    const now = useMemo(() => (perKey && ready ? ready.colour(`${value}\n`) : null), [perKey, ready, value]);
    useEffect(() => {
        if (!ready || perKey) return;
        const pause = Math.max(PAUSE_MS, 2 * value.length * ready.msPerChar);
        const timer = setTimeout(() => setLate({key, html: ready.colour(`${value}\n`)}), pause);
        return () => clearTimeout(timer);
    }, [ready, perKey, key, value]);
    const html = now ?? (late?.key === key ? late.html : null);

    // A copy that appears (the grammar has loaded, the typing has paused) starts at its top, while the box may be
    // scrolled to the end of a paste: it's put where the box is before it shows.
    useLayoutEffect(() => {
        if (!layer.current || !input.current) return;
        layer.current.scrollTop = input.current.scrollTop;
        layer.current.scrollLeft = input.current.scrollLeft;
    }, [html]);

    return (
        <div className={`expedite_editor${html ? " is-coloured" : ""}${className ? ` ${className}` : ""}`}>
            {html && <div ref={layer} className="expedite_editor-colours" aria-hidden="true" dangerouslySetInnerHTML={{__html: html}} />}
            <textarea
                ref={input}
                className="expedite_editor-input"
                value={value}
                placeholder={placeholder}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                wrap="off"
                autoFocus
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                    onKeyDown?.(e);
                    if (e.defaultPrevented || e.nativeEvent.isComposing) return;
                    if (e.key === "Escape") {
                        escaped.current = true;
                        return;
                    }
                    const leaving = escaped.current;
                    escaped.current = false;
                    if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey || leaving) return;
                    e.preventDefault();
                    indent(e.currentTarget, e.shiftKey);
                }}
                onScroll={(e) => {
                    if (!layer.current) return;
                    layer.current.scrollTop = e.currentTarget.scrollTop;
                    layer.current.scrollLeft = e.currentTarget.scrollLeft;
                }}
            />
        </div>
    );
}
