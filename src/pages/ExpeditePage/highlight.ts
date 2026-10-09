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
export function languageOf(id: string): Language | undefined {
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
let highlighter: Promise<Highlighter> | null = null;

/**
 * Once the highlighter and the language's grammar are loaded, a function that colours text in that language at once:
 * text as HTML (Shiki's <pre>, escaped), light colours inline and dark ones as --shiki-dark. The text box writing code
 * calls it on every key.
 */
export async function highlighterFor(id: string): Promise<(text: string) => string> {
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
    // Lines past 1,000 characters (minified code) stay plain: colouring one can take a second.
    return (text) => shiki.codeToHtml(text, {
        lang: id, themes: {light: "github-light", dark: "github-dark"}, tokenizeMaxLineLength: 1000,
    });
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

export function guessLanguage(text: string): string | null {
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
