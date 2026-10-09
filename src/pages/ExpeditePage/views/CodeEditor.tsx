import {type KeyboardEvent, memo, useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import {type ColouredLine, type ColouredText, isLanguage, lineColourerFor} from "../highlight.ts";
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

// Past this, the box stays plain: the first colouring, on a paste, would hold the page up for seconds (about half a
// second for 68 KB). The receiver's view colours as much (FilePreview's TEXT_LIMIT), so what's coloured here is
// coloured there.
const HIGHLIGHT_LIMIT = 128 * 1024;

// How long the typing pauses before the lines an edit left with their old colours (past lineColourerFor's budget) are
// coloured again.
const FINISH_MS = 300;

// Past this many lines the box is at its tallest on any screen (70vh), so it stops measuring its text to size itself
// (field-sizing), which costs more than the rest of a key in a long text.
const FULL_LINES = 200;

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

function lineCount(text: string): number {
    let lines = 1;
    for (let at = text.indexOf("\n"); at !== -1; at = text.indexOf("\n", at + 1)) lines++;
    return lines;
}

interface Colourer {
    language: string;
    colour: (text: string, finish?: boolean) => ColouredText;
}

// One line of the coloured copy. Memoized: an edit redraws the lines it coloured again, and React leaves the rest alone.
const Line = memo(function Line({line}: { line: ColouredLine }) {
    return (
        <span className="line">
            {line.pieces.map((piece, i) => <span key={i} style={piece.style}>{piece.text}</span>)}
        </span>
    );
});

/**
 * The text box for a text drop sent as code: a real <textarea> (typing, selecting, undo and paste as ever), its text
 * transparent over a highlighted copy of it in the same font, size and spacing, scrolled with it. The colours follow
 * every key once the grammar is loaded: only the lines an edit changes are coloured and drawn again (lineColourerFor),
 * so a long text is as quick to type in as a short one. Until the grammar is loaded, or past HIGHLIGHT_LIMIT, the box
 * is plain.
 */
export default function CodeEditor({value, onChange, onKeyDown, language, placeholder, className}: CodeEditorProps) {
    // The colouring function for the language, once its grammar is loaded. Its own for this box: it remembers the last
    // text it coloured.
    const [colourer, setColourer] = useState<Colourer | null>(null);
    // The text whose leftover lines are to be coloured now that the typing has paused.
    const [finishing, setFinishing] = useState<string | null>(null);
    const layer = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLTextAreaElement>(null);
    // Escape, then Tab: the way out of the box from the keyboard, since Tab itself indents (as in VS Code).
    const escaped = useRef(false);

    useEffect(() => {
        // Plain code (Auto recognized nothing): no colours to load.
        if (!isLanguage(language)) return;
        let cancelled = false;
        lineColourerFor(language)
            .then((colour) => {
                if (!cancelled) setColourer({language, colour});
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [language]);

    const full = useMemo(() => lineCount(value) > FULL_LINES, [value]);
    const ready = colourer?.language === language && value.length <= HIGHLIGHT_LIMIT ? colourer : null;
    const finish = finishing === value;
    const coloured = useMemo(() => (ready ? ready.colour(value, finish) : null), [ready, value, finish]);
    // An edit that left lines with their old colours (an opened comment): they're coloured once the typing pauses.
    useEffect(() => {
        if (!coloured?.stale) return;
        const timer = setTimeout(() => setFinishing(value), FINISH_MS);
        return () => clearTimeout(timer);
    }, [coloured, value]);

    // A copy that appears (the grammar has loaded) starts at its top, while the box may be scrolled to the end of a
    // paste: it's put where the box is before it shows.
    useLayoutEffect(() => {
        if (!layer.current || !input.current) return;
        layer.current.scrollTop = input.current.scrollTop;
        layer.current.scrollLeft = input.current.scrollLeft;
    }, [coloured]);

    return (
        <div
            className={`expedite_editor${coloured ? " is-coloured" : ""}${full ? " is-full" : ""}${className ? ` ${className}` : ""}`}
        >
            {coloured && (
                <div ref={layer} className="expedite_editor-colours" aria-hidden="true">
                    <pre className="shiki">
                        <code>
                            {coloured.lines.map((line) => <Line key={line.id} line={line} />)}
                        </code>
                    </pre>
                </div>
            )}
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
