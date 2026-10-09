import {type ReactNode, useEffect, useState} from "react";
import {ChartNoAxesColumn} from "lucide-react";
import Disclosure from "./Disclosure.tsx";
import "./TextStats.scss";

// The server's limit for a text drop, in UTF-8 bytes (MAX_TEXT_SIZE in the API), and how it says it: "500 KB".
export const TEXT_LIMIT_BYTES = 500_000;

const segmenter = (granularity: "word" | "sentence") =>
    typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, {granularity}) : null;
const wordSegmenter = segmenter("word");
const sentenceSegmenter = segmenter("sentence");

// Words, by the browser's own rules where it has them (accents, apostrophes, any script), else letters and digits.
function wordsOf(text: string): string[] {
    if (wordSegmenter) return [...wordSegmenter.segment(text)].filter((s) => s.isWordLike).map((s) => s.segment);
    return text.match(/[\p{L}\p{N}'’-]+/gu) ?? [];
}

function sentencesOf(text: string): string[] {
    if (sentenceSegmenter) return [...sentenceSegmenter.segment(text)].map((s) => s.segment).filter((s) => /[\p{L}\p{N}]/u.test(s));
    return text.match(/[^.!?]+[.!?]*/g)?.filter((s) => /[\p{L}\p{N}]/u.test(s)) ?? [];
}

// The ten words (or names) used most, at least twice, every one counted: "the" and "const" too.
function mostUsed(list: string[]): [string, number][] {
    const counts = new Map<string, number>();
    for (const word of list) {
        const key = word.toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10);
}

// "under a minute", "about 3 min", "about 2 h 05 min": at 238 words a minute, an adult's average silent reading speed.
function readingTime(wordCount: number): string {
    if (wordCount < 238) return "under a minute";
    const minutes = Math.round(wordCount / 238);
    if (minutes < 60) return `about ${minutes} min`;
    return `about ${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

// How the code is indented: tabs, or the smallest step of spaces its lines use. Not a doc comment's " * " lines, one
// space in from their /**.
function indentation(lines: string[]): string {
    const indents = lines
        .filter((l) => !/^\s+\*/.test(l))
        .map((l) => l.match(/^[ \t]+/)?.[0])
        .filter((i): i is string => !!i);
    if (!indents.length) return "none";
    if (indents.filter((i) => i.startsWith("\t")).length > indents.length / 2) return "tabs";
    let step = Infinity; // the smallest, in a loop for the reason given at longest()
    for (const i of indents) if (i.length < step) step = i.length;
    return `${step} space${step === 1 ? "" : "s"}`;
}

// The largest of many numbers. Not Math.max(...list): a browser takes only so many arguments (Safari 65,536, Chrome
// about 125,000), and a long text's lines or sentences are more, which threw and took the page down.
function longest(list: number[]): number {
    let most = 0;
    for (const n of list) if (n > most) most = n;
    return most;
}

/** Characters as people count them, about: code points, so an emoji is one and not the two halves JavaScript sees. */
export function characterCount(text: string): number {
    return text.length - (text.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g)?.length ?? 0);
}

const count = (n: number) => n.toLocaleString();

interface Stat {
    label: string;
    value: ReactNode;
    wide?: boolean;
}

interface Stats {
    /** Beside the settings. */
    basic: Stat[];
    /** Folded under them. */
    more: Stat[];
    /** The most used words (or names), most first, for the chart. */
    top: [string, number][];
}

function statsFor(text: string, code: boolean): Stats {
    const bytes = new TextEncoder().encode(text).length;
    const over = bytes > TEXT_LIMIT_BYTES;
    const size: Stat = {
        label: "Size",
        value: (
            <span className={over ? "expedite_stats-over" : undefined}>
                {(bytes / 1000).toLocaleString(undefined, {maximumFractionDigits: 1})} KB of 500 KB
                {over && ": too long for a text drop, send it as a file"}
            </span>
        ),
        wide: over,
    };
    const lines = text ? text.split("\n") : [];
    const characters = characterCount(text);

    // Past the limit the text can't be sent, so its size is what matters: counting the words of megabytes would only
    // slow the page down.
    if (over) {
        return {
            basic: [{label: "Lines", value: count(lines.length)}, {label: "Characters", value: count(characters)}, size],
            more: [],
            top: [],
        };
    }

    if (code) {
        const names = text.match(/[A-Za-z_$][\w$]*/g) ?? [];
        return {
            basic: [
                {label: "Lines", value: count(lines.length)},
                {label: "Characters", value: count(characters)},
                {label: "Longest line", value: `${count(longest(lines.map(characterCount)))} characters`},
                size,
            ],
            more: [
                {label: "Indentation", value: indentation(lines)},
                {label: "Blank lines", value: count(lines.filter((l) => !l.trim()).length)},
                {label: "Comment lines", value: count(lines.filter((l) => /^\s*(\/\/|#(?!include|!)|--|\/\*|\*|<!--)/.test(l)).length)},
                {label: "Unique names", value: count(new Set(names).size)},
            ],
            top: mostUsed(names),
        };
    }

    const list = wordsOf(text);
    const sentences = sentencesOf(text);
    const letters = list.reduce((sum, w) => sum + [...w].length, 0);
    const longestWord = list.reduce((best, w) => ([...w].length > [...best].length ? w : best), "");
    const longestSentence = longest(sentences.map((s) => wordsOf(s).length));
    const unique = new Set(list.map((w) => w.toLowerCase())).size;
    return {
        basic: [
            {label: "Words", value: count(list.length)},
            {label: "Characters", value: count(characters)},
            {label: "Lines", value: count(lines.length)},
            {label: "Reading time", value: list.length ? readingTime(list.length) : "—"},
            size,
        ],
        more: [
            {label: "Sentences", value: count(sentences.length)},
            {label: "Paragraphs", value: count(text.split(/\n\s*\n/).filter((p) => p.trim()).length)},
            {label: "Unique words", value: count(unique)},
            // Distinct words over all words: a short note is near 100%, a long or repetitive text much lower.
            {label: "Vocabulary variety", value: list.length ? `${Math.round((unique / list.length) * 100)}%` : "—"},
            {label: "Average word", value: list.length ? `${(letters / list.length).toFixed(1)} letters` : "—"},
            {label: "Longest word", value: longestWord || "—"},
            {label: "Longest sentence", value: longestSentence ? `${count(longestSentence)} word${longestSentence === 1 ? "" : "s"}` : "—"},
        ],
        top: mostUsed(list),
    };
}

// How long the typing has to pause before the statistics are counted again.
const STATS_PAUSE_MS = 250;

/**
 * The text box's statistics, counted again once the typing pauses: counting a long text takes a moment (a tenth of a
 * second for 500 KB), which never falls between two keys.
 */
export function useTextStats(text: string, code: boolean): Stats {
    const [stats, setStats] = useState(() => statsFor(text, code));
    useEffect(() => {
        const timer = setTimeout(() => setStats(statsFor(text, code)), STATS_PAUSE_MS);
        return () => clearTimeout(timer);
    }, [text, code]);
    return stats;
}

function StatGrid({stats}: { stats: Stat[] }) {
    return (
        <div className="expedite_meta-grid">
            {stats.map(({label, value, wide}) => (
                <div key={label} className={`expedite_meta-item${wide ? " is-wide" : ""}`}>
                    <span className="expedite_meta-label">{label}</span>
                    <span className="expedite_meta-value">{value}</span>
                </div>
            ))}
        </div>
    );
}

/** The basics, as the text is written: a table beside the settings, under the text box. */
export default function TextStats({stats, code}: { stats: Stats; code: boolean }) {
    return (
        <section className="expedite_meta">
            <div className="expedite_meta-section">
                <h2 className="expedite_meta-header">
                    <ChartNoAxesColumn size={14} />
                    {code ? "Code statistics" : "Text statistics"}
                </h2>
                <StatGrid stats={stats.basic} />
            </div>
        </section>
    );
}

/**
 * The rest, folded under the text box's row (remembered open in this browser): more counts, and a chart of the words
 * (or, for code, the names) used most.
 */
export function MoreTextStats({stats, code}: { stats: Stats; code: boolean }) {
    const most = stats.top[0]?.[1] ?? 1;
    return (
        <Disclosure id="text-stats" title="More statistics">
            <div className="expedite_more-stats">
                <section className="expedite_meta">
                    {/* In a section, as in the other tables, so it spans its box (the box is two columns wide). */}
                    <div className="expedite_meta-section">
                        <StatGrid stats={stats.more} />
                    </div>
                </section>
                <section className="expedite_meta">
                    <div className="expedite_meta-section">
                        <h2 className="expedite_meta-header">{code ? "Most used names" : "Most used words"}</h2>
                        {stats.top.length ? (
                            <ol className="expedite_freq">
                                {stats.top.map(([word, n]) => (
                                    <li key={word}>
                                        <span className="expedite_freq-word">{word}</span>
                                        <span className="expedite_freq-bar" style={{width: `${(n / most) * 100}%`}} />
                                        <span className="expedite_freq-count">{count(n)}</span>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="expedite_freq-empty">Nothing used twice yet.</p>
                        )}
                    </div>
                </section>
            </div>
        </Disclosure>
    );
}

/** Words and reading time, for a received text drop's details. */
export function wordStats(text: string): { words: number; reading: string } {
    const n = wordsOf(text).length;
    return {words: n, reading: n ? readingTime(n) : "—"};
}
