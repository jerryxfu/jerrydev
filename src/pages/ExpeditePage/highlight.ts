// Code highlighting for Expedite: code files' previews, text drops marked as code, and the text box while writing one.
// Shiki, loaded only when code is first shown: the core, the JavaScript regex engine (no WebAssembly), the light and dark
// GitHub themes (as on the blog), and one grammar per language as it's needed. The grammars are listed one by one so
// the build emits these and no others (Shiki has 300).

export interface Language {
    label: string;
    load: () => Promise<unknown>;
}

/** The languages Expedite highlights, by Shiki's id (what a text drop stores), in the order the menu shows them. */
export const LANGUAGES: Record<string, Language> = {
    typescript: {label: "TypeScript", load: () => import("shiki/langs/typescript.mjs")},
    tsx: {label: "TSX", load: () => import("shiki/langs/tsx.mjs")},
    javascript: {label: "JavaScript", load: () => import("shiki/langs/javascript.mjs")},
    jsx: {label: "JSX", load: () => import("shiki/langs/jsx.mjs")},
    python: {label: "Python", load: () => import("shiki/langs/python.mjs")},
    java: {label: "Java", load: () => import("shiki/langs/java.mjs")},
    kotlin: {label: "Kotlin", load: () => import("shiki/langs/kotlin.mjs")},
    c: {label: "C", load: () => import("shiki/langs/c.mjs")},
    cpp: {label: "C++", load: () => import("shiki/langs/cpp.mjs")},
    csharp: {label: "C#", load: () => import("shiki/langs/csharp.mjs")},
    go: {label: "Go", load: () => import("shiki/langs/go.mjs")},
    rust: {label: "Rust", load: () => import("shiki/langs/rust.mjs")},
    swift: {label: "Swift", load: () => import("shiki/langs/swift.mjs")},
    html: {label: "HTML", load: () => import("shiki/langs/html.mjs")},
    css: {label: "CSS", load: () => import("shiki/langs/css.mjs")},
    scss: {label: "SCSS", load: () => import("shiki/langs/scss.mjs")},
    json: {label: "JSON", load: () => import("shiki/langs/json.mjs")},
    yaml: {label: "YAML", load: () => import("shiki/langs/yaml.mjs")},
    toml: {label: "TOML", load: () => import("shiki/langs/toml.mjs")},
    xml: {label: "XML", load: () => import("shiki/langs/xml.mjs")},
    markdown: {label: "Markdown", load: () => import("shiki/langs/markdown.mjs")},
    sql: {label: "SQL", load: () => import("shiki/langs/sql.mjs")},
    bash: {label: "Shell", load: () => import("shiki/langs/bash.mjs")},
    latex: {label: "LaTeX", load: () => import("shiki/langs/latex.mjs")},
};

/** A language above by its id; not a name every object answers to, such as "constructor". */
function languageOf(id: string): Language | undefined {
    return Object.hasOwn(LANGUAGES, id) ? LANGUAGES[id] : undefined;
}

export function isLanguage(id: string): boolean {
    return !!languageOf(id);
}

/** A file's language by its extension; null for text shown without colours. Extensions not here aren't text files. */
export const EXTENSIONS: Record<string, string | null> = {
    ts: "typescript", mts: "typescript", cts: "typescript", tsx: "tsx",
    js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "jsx",
    py: "python", java: "java", kt: "kotlin", c: "c", h: "c", cpp: "cpp", hpp: "cpp", cs: "csharp",
    go: "go", rs: "rust", swift: "swift", html: "html", css: "css", scss: "scss", json: "json",
    yaml: "yaml", yml: "yaml", toml: "toml", xml: "xml", md: "markdown", sql: "sql",
    sh: "bash", bash: "bash", zsh: "bash", tex: "latex",
    txt: null, log: null, csv: null, tsv: null, ini: null, conf: null, env: null,
};

type Highlighter = Awaited<ReturnType<typeof import("shiki/core")["createHighlighterCore"]>>;
type GrammarState = NonNullable<ReturnType<Highlighter["codeToTokens"]>["grammarState"]>;
let highlighter: Promise<Highlighter> | null = null;

const THEMES = {light: "github-light", dark: "github-dark"};
// Lines past 1,000 characters (minified code) stay plain: colouring one can take a second.
const MAX_LINE = 1000;

// The highlighter, with the language's grammar loaded.
async function shikiFor(id: string): Promise<Highlighter> {
    const language = languageOf(id);
    if (!language) throw new Error(`No grammar for ${id}`);
    highlighter ??= Promise.all([import("shiki/core"), import("shiki/engine/javascript")]).then(
        ([{createHighlighterCore}, {createJavaScriptRegexEngine}]) => createHighlighterCore({
            themes: [import("shiki/themes/github-light.mjs"), import("shiki/themes/github-dark.mjs")],
            langs: [],
            engine: createJavaScriptRegexEngine(),
        }),
    );
    const shiki = await highlighter;
    if (!shiki.getLoadedLanguages().includes(id)) {
        await shiki.loadLanguage(language.load() as Parameters<Highlighter["loadLanguage"]>[0]);
    }
    return shiki;
}

/**
 * Once the highlighter and the language's grammar are loaded, a function that colours a whole text in that language:
 * text as HTML (Shiki's <pre>, escaped), light colours inline and dark ones as --shiki-dark. For code shown, not edited.
 */
export async function highlighterFor(id: string): Promise<(text: string) => string> {
    const shiki = await shikiFor(id);
    return (text) => shiki.codeToHtml(text, {lang: id, themes: THEMES, tokenizeMaxLineLength: MAX_LINE});
}

/** A line of code in colour: its pieces, each with its light colour inline and its dark one as --shiki-dark. */
export interface ColouredLine {
    /** Kept while the line is reused, so React keeps its element. */
    id: number;
    pieces: { text: string; style: Record<string, string> }[];
    /** Where the language stands at the end of the line (in a comment, a string...): what the next line starts from. */
    end: GrammarState | undefined;
}

export interface ColouredText {
    lines: ColouredLine[];
    /** Some lines kept their old colours, past the budget of one edit: to colour again once the typing pauses. */
    stale: boolean;
}

// The most lines one edit colours again past the lines it changed, when it changes how the rest reads (an opened
// comment makes all that follows a comment): a key then waits on a few dozen milliseconds at most. The rest keeps its old
// colours until the code box finishes it.
const LINE_BUDGET = 150;

let lineIds = 0;

// The same starting point for a line: the grammar's stack the same, for each theme. (getInternalStack is marked
// internal in Shiki's types, but it's the only way to compare.)
function sameStart(a: GrammarState | undefined, b: GrammarState | undefined): boolean {
    if (!a || !b) return a === b;
    return a.themes.every((theme) => {
        const stack = a.getInternalStack(theme);
        const other = b.getInternalStack(theme);
        return !!stack && !!other && stack.equals(other);
    });
}

// Shiki's style names as React wants them: fontStyle, not font-style (custom properties such as --shiki-dark as they are).
function reactStyle(style: Record<string, string>): Record<string, string> {
    return Object.fromEntries(Object.entries(style).map(([key, value]) => [
        key.startsWith("--") ? key : key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()),
        value,
    ]));
}

/**
 * Colours code as it's edited, for the code box: each call colours again only the lines that changed, and the lines
 * after them while the edit changes how they start (an opened comment), stopping at the first line that starts as it
 * did before; the others keep their colours, and their elements. A long paste is coloured once, whole. Each code box
 * has its own, which remembers the last text it coloured. `finish` colours what the budget left for later.
 */
export async function lineColourerFor(id: string): Promise<(text: string, finish?: boolean) => ColouredText> {
    const shiki = await shikiFor(id);
    const colourLine = (line: string, start: GrammarState | undefined): ColouredLine => {
        const result = shiki.codeToTokens(line, {
            lang: id, themes: THEMES, tokenizeMaxLineLength: MAX_LINE, grammarState: start,
        });
        return {
            id: lineIds++,
            pieces: (result.tokens[0] ?? []).map((token) => ({
                text: token.content,
                style: token.htmlStyle ? reactStyle(token.htmlStyle) : {color: token.color ?? ""},
            })),
            end: result.grammarState,
        };
    };

    // The last text coloured, its lines in colour, and from which line their colours may be out of date.
    let previous = {lines: [] as string[], coloured: [] as ColouredLine[], staleFrom: 0};

    return (text, finish = false) => {
        const lines = text.split("\n");
        const old = previous;
        // The first line changed, or whose colours may be out of date.
        let start = 0;
        const unchanged = Math.min(lines.length, old.lines.length, old.staleFrom);
        while (start < unchanged && lines[start] === old.lines[start]) start++;
        // The lines after the edit, the same text as before.
        let endNew = lines.length;
        let endOld = old.lines.length;
        while (endNew > start && endOld > start && lines[endNew - 1] === old.lines[endOld - 1]) {
            endNew--;
            endOld--;
        }

        const out = old.coloured.slice(0, start);
        let at = out[start - 1]?.end;
        const colour = (line: string) => {
            const coloured = colourLine(line, at);
            out.push(coloured);
            at = coloured.end;
        };
        for (let i = start; i < endNew; i++) colour(lines[i] ?? "");
        // After the edit, the old colours hold again from the first line that starts as it did before (and whose colours
        // were up to date). Until then each line is coloured again, within the budget unless finishing.
        let staleFrom = lines.length;
        for (let i = endNew, j = endOld, budget = finish ? Infinity : LINE_BUDGET; i < lines.length; i++, j++, budget--) {
            if (j < old.staleFrom && sameStart(at, old.coloured[j - 1]?.end)) {
                out.push(...old.coloured.slice(j));
                if (old.staleFrom < old.lines.length) staleFrom = i + old.staleFrom - j;
                break;
            }
            if (budget <= 0) {
                out.push(...old.coloured.slice(j));
                staleFrom = i;
                break;
            }
            colour(lines[i] ?? "");
        }

        previous = {lines, coloured: out, staleFrom};
        return {lines: out, stale: staleFrom < lines.length};
    };
}

// A first guess at pasted code's language, from telltale lines: right more often than not for the usual snippets, and
// only a default in the menu, which the sender changes when it's wrong. Most specific first.
const TYPESCRIPT = /\binterface \w+|\btype \w+ = |: (string|number|boolean)\b|\bas const\b|<\w+>\(/;
const GUESSES: [string, RegExp][] = [
    ["bash", /^#!\/(usr\/)?bin\/(env )?(ba|z)?sh|^\s*\$ \w/m],
    ["html", /^\s*<(!doctype html|html|head|body|div|span|p|a|ul|section|script)[\s>]/im],
    ["xml", /^\s*<\?xml/],
    // Before Python and Go, which have an `import Name` and a `func` of their own.
    ["swift", /^import (SwiftUI|Foundation|UIKit|Combine)$|\bfunc \w+\(.*\)\s*->|\bguard let\b/m],
    ["python", /^\s*(def \w+\(.*\)( -> .+)?:|class \w+(\(.*\))?:|from [\w.]+ import |import \w+$|if __name__ == )/m],
    ["rust", /\bfn \w+\(|\blet mut\b|\bimpl\b.*\{|println!\(/],
    ["go", /^package \w+$|\bfunc (\(\w+ \*?\w+\) )?\w+\(|:= /m],
    // C++, C# then Java: C++ has namespaces too, and C# a `public class` like Java's.
    ["cpp", /#include\s*[<"]|std::|\bcout\s*<</],
    ["csharp", /\busing System\b|^\s*namespace [\w.]+|Console\.Write|static void Main\(/m],
    ["java", /\bpublic (static )?(class|void|final)\b|System\.out\.print/],
    ["kotlin", /\bfun \w+\(|\bval \w+\s*[:=]/],
    ["typescript", TYPESCRIPT],
    ["javascript", /\b(const|let|var) \w+ = |\bfunction\b|=>|\bconsole\.log\(|\brequire\(/],
    // After the languages that hold SQL in their strings. A plain list of columns, or a WHERE, so that "Select the
    // photos from the album" isn't SQL.
    ["sql", /^\s*(select\s+(\*|[\w.]+(\s*,\s*[\w.]+)*)\s+from\s|select\s.+\sfrom\s.+\swhere\s|insert\s+into|update\s+\w+\s+set|create\s+table)/im],
    // [ \t], not \s: a pattern free to cross lines tries every line after each one (seconds on a long list).
    ["css", /^[.#]?[\w-]+([ \t]+[.#]?[\w-]+)*[ \t]*\{[ \t]*$|^[ \t]*[\w-]+:[ \t]*[^;\n]+;[ \t]*$/m],
    ["yaml", /^[\w-]+:(\s|$)/m],
    // A script without a #! is known by its usual commands (a Dockerfile's too), before its # comments pass for
    // Markdown headings.
    ["bash", /^\s*(sudo|cd|echo|npm|pnpm|yarn|npx|git|curl|brew|pip3?|chmod|mkdir) \S|^\s*export \w+=|^(FROM|RUN) \S/m],
    ["markdown", /^#{1,6} \S|^\s*[-*] \[[ x]\]/m],
];

// React components: their tags would pass for HTML, and the TypeScript grammar can't read them (TSX can).
const JSX = /\bclassName=|\bon[A-Z]\w*=\{|\breturn \(\s*\n\s*<\w/;

/** Code with no colours: what Auto sends when it recognizes nothing. Numbered and in monospace, not highlighted. */
export const PLAIN = "text";

/** The menu's first choice, which follows the text: its guess, else PLAIN. */
export const AUTO = "auto";

/** What a text drop's language choice means: Auto resolved to its guess (or PLAIN) for the text as it is now. */
export function resolveLanguage(choice: string, text: string): string {
    return choice === AUTO ? guessLanguage(text) ?? PLAIN : choice;
}

/** A language in words, PLAIN included. */
export function languageLabel(id: string): string {
    return id === PLAIN ? "Plain text" : languageOf(id)?.label ?? id;
}

// How much of the text the guess reads: its start tells the language, and a long paste stays quick.
const GUESS_SAMPLE = 10_000;

function guessLanguage(text: string): string | null {
    const sample = text.slice(0, GUESS_SAMPLE).trim();
    if (/^[{[]/.test(sample)) {
        // JSON: parsed when it's all in the sample, else known by its first key in quotes (a JavaScript object's isn't).
        if (text.length <= GUESS_SAMPLE) {
            try {
                JSON.parse(sample);
                return "json";
            } catch { /* not JSON: the patterns below */
            }
        } else if (/^\[?\s*\{\s*"[^"\n]*"\s*:/.test(sample)) {
            return "json";
        }
    }
    if (JSX.test(sample)) return TYPESCRIPT.test(sample) ? "tsx" : "jsx";
    return GUESSES.find(([, pattern]) => pattern.test(sample))?.[0] ?? null;
}
