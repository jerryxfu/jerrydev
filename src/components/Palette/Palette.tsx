import {
    type KeyboardEvent,
    useDeferredValue,
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import {useLocation} from "wouter";
import {
    BookOpen,
    Code,
    FileText,
    FolderOpen,
    HardDrive,
    Hash,
    Library,
    Link,
    type LucideIcon,
    Palette as PaletteIcon,
    ScrollText,
    Search,
    SquareTerminal,
    TextQuote,
    Users,
} from "lucide-react";
import useMediaQuery from "@/hooks/useMediaQuery.ts";
import {useTheme} from "@/context/ThemeContext.tsx";
import {copyText} from "@/utils.ts";
import {APPLE, runAfterNavigation, setPaletteOpen} from "./host.ts";
import {type Bodies, bodiesNow, loadBodies, type PostText, subscribeBodies} from "./bodies.ts";
import {fold, fuzzy, grep, termsOf} from "./match.ts";
import {type Action, type Item, KIND_LABEL, type Kind, namedItems} from "./sources.ts";
import {type Command, commandsFor} from "./commands.ts";
import {currentPost, reveal} from "./reveal.ts";
import Preview from "./Preview.tsx";
import Marked from "./Marked.tsx";
import "./Palette.scss";

// The site's command palette (issue #82), opened by PaletteHost. One field for everything: the names (pages, sections,
// projects, posts, themes, friends, links, what's saved here) match at once; the posts' full text fills in as each one
// arrives, and the counter in the footer climbs with it: plain text, no animation (Jerry). The list is in fixed groups,
// the post lines always last, so what arrives never moves the selection.

export type Row = {
    id: string;
    icon: LucideIcon;
    title: string;
    titleMarks?: number[];
    detail?: string;
    detailMarks?: number[];
    label: string;
    action?: Action;               // all but the post lines
    item?: Item;                   // a name, for the preview
    hit?: { text: PostText; index: number; terms: string[] }; // a post line
};

const ICONS: Record<Kind, LucideIcon> = {
    page: FileText, section: Hash, topic: Library, project: FolderOpen, post: BookOpen, cheatsheet: ScrollText,
    theme: PaletteIcon, friend: Users, link: Link, saved: HardDrive, action: SquareTerminal,
};

// At most this many rows drawn; the counter says how many there are.
const MAX_ROWS = 200;
// Letters typed before the post text is searched: with one, nearly every line has it.
const LINES_FROM = 2;

type Prepared = { item: Item; title: string; words: string; detail: string };

const prepare = (items: Item[]): Prepared[] =>
    items.map((item) => ({item, title: fold(item.title), words: fold(item.words ?? ""), detail: fold(item.detail ?? "")}));

// A name's points: each word typed found in its title (fuzzy), in its other names (fuzzy, a little less), or in its
// description (as written, like a post line, and less again). Null if a word is found in none of them.
function scoreName(terms: string[], p: Prepared): { score: number; title: number[]; detail: number[] } | null {
    let score = 0;
    const title: number[] = [];
    const detail: number[] = [];
    for (const term of terms) {
        const options: { score: number; title?: number[]; detail?: number[] }[] = [];
        const inTitle = fuzzy([term], p.item.title, p.title);
        if (inTitle) options.push({score: inTitle.score, title: inTitle.positions});
        const inWords = p.words ? fuzzy([term], p.item.words!, p.words) : null;
        if (inWords) options.push({score: inWords.score - 8});
        const at = p.detail.indexOf(term);
        if (at >= 0) options.push({score: term.length * 8, detail: Array.from({length: term.length}, (_, i) => at + i)});
        if (options.length === 0) return null;
        const best = options.reduce((a, b) => (b.score > a.score ? b : a));
        score += best.score;
        title.push(...(best.title ?? []));
        detail.push(...(best.detail ?? []));
    }
    return {score, title, detail};
}

const nameRow = (item: Item, marks?: { title: number[]; detail: number[] }): Row => ({
    id: item.id, icon: ICONS[item.kind], title: item.title, titleMarks: marks?.title, detail: item.detail,
    detailMarks: marks?.detail, label: KIND_LABEL[item.kind], action: item.action, item,
});

const commandRow = (command: Command): Row => ({
    id: command.id, icon: SquareTerminal, title: command.title, detail: command.detail, label: "command", action: command.action,
});

function search(query: string, names: Prepared[], bodies: Bodies): { rows: Row[]; matches: number } {
    const {first, later} = commandsFor(query);
    let terms = termsOf(query);
    let pool = names;
    // "theme glacier": only the themes.
    if (terms[0] === "theme") {
        pool = names.filter((p) => p.item.kind === "theme");
        terms = terms.slice(1);
    }

    const named = terms.length === 0
        ? pool.map((p) => nameRow(p.item))
        : pool.map((p, i) => ({p, i, found: scoreName(terms, p)}))
            .filter((x): x is typeof x & { found: NonNullable<typeof x.found> } => x.found !== null)
            .sort((a, b) => b.found.score - a.found.score || a.p.item.title.length - b.p.item.title.length || a.i - b.i)
            .map(({p, found}) => nameRow(p.item, found));

    const lines: Row[] = [];
    let lineMatches = 0;
    if (pool === names && terms.join("").length >= LINES_FROM) {
        for (const text of bodies.posts) {
            text.lines.forEach((line, index) => {
                const marks = grep(terms, line.folded);
                if (!marks) return;
                lineMatches++;
                if (lines.length < MAX_ROWS) {
                    lines.push({
                        id: `line:${text.post.slug}:${line.n}`, icon: line.code ? Code : TextQuote, title: line.text,
                        titleMarks: marks, label: text.post.title, hit: {text, index, terms},
                    });
                }
            });
        }
    }

    const rows = [...first.map(commandRow), ...named, ...later.map(commandRow), ...lines].slice(0, MAX_ROWS);
    return {rows, matches: first.length + named.length + later.length + lineMatches};
}

const count = (n: number) => n.toLocaleString("en");

export default function Palette() {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listId = useId();
    const [pathname, navigate] = useLocation();
    const {setTheme} = useTheme();
    const wide = useMediaQuery("(min-width: 900px)");

    const [query, setQuery] = useState("");
    const deferred = useDeferredValue(query);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const byKeys = useRef(false);

    // Read once per opening: what's saved here may have changed since the last.
    const names = useMemo(() => prepare(namedItems()), []);
    const bodies = useSyncExternalStore(subscribeBodies, bodiesNow);
    const {rows, matches} = useMemo(() => search(deferred, names, bodies), [deferred, names, bodies]);

    const found = rows.findIndex((row) => row.id === selectedId);
    const index = found >= 0 ? found : 0;
    const selected = rows[index];
    const optionId = (i: number) => `${listId}-${i}`;

    useLayoutEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        dialog.showModal();
        inputRef.current?.focus();
        // Closed by the keys or a page change rather than Escape: close() puts the focus back where it was.
        return () => {
            if (dialog.open) dialog.close();
        };
    }, []);

    useEffect(() => {
        void loadBodies();
    }, []);

    useEffect(() => {
        if (!copied) return;
        const timer = window.setTimeout(() => setCopied(null), 1500);
        return () => window.clearTimeout(timer);
    }, [copied]);

    // Only a move by the keys scrolls the list to the selection: the pointer is already on it.
    useEffect(() => {
        if (!byKeys.current) return;
        byKeys.current = false;
        document.getElementById(optionId(index))?.scrollIntoView({block: "nearest"});
    });

    const close = () => setPaletteOpen(false);

    const move = (step: number) => {
        if (rows.length === 0) return;
        byKeys.current = true;
        setSelectedId(rows[Math.min(rows.length - 1, Math.max(0, index + step))]!.id);
    };

    // A page of the site, or a home page anchor. From another page, an anchor loads the home page on it (as the bar's
    // links do); on the home page, the address changes and the page goes there (Projects opens a project's card).
    const go = (href: string, newTab: boolean) => {
        if (newTab) return void window.open(href.startsWith("#") ? `/${href}` : href, "_blank", "noopener");
        if (href.startsWith("#")) {
            if (pathname !== "/") return window.location.assign(`/${href}`);
            // Once the dialog is gone, the page goes there itself and the address shows the anchor: the browser's own jump
            // didn't happen from behind the dialog, nor to the anchor already in the address. Projects hears it and opens
            // the card.
            window.setTimeout(() => {
                if (window.location.hash !== href) window.history.pushState(null, "", href);
                window.dispatchEvent(new HashChangeEvent("hashchange"));
                document.getElementById(href.slice(1))?.scrollIntoView();
            });
            return;
        }
        navigate(href);
    };

    const run = (row: Row, newTab: boolean) => {
        if (row.hit) {
            const {text, index: at, terms} = row.hit;
            const href = `/blog/${text.post.slug}`;
            if (newTab) return void window.open(href, "_blank", "noopener");
            // Which time the longest word comes on that line, counted from the post's start: where to scroll.
            const anchor = terms.reduce((a, b) => (b.length > a.length ? b : a), "");
            const nth = text.lines.slice(0, at).reduce((sum, line) => sum + line.folded.split(anchor).length - 1, 0);
            close();
            if (pathname === href) return reveal(terms, nth);
            const before = currentPost();
            runAfterNavigation(() => reveal(terms, nth, before));
            return navigate(href);
        }
        const action = row.action;
        if (!action) return;
        if (action.type === "copy") {
            void copyText(action.text).then((ok) => ok && setCopied(row.id));
            return;
        }
        close();
        if (action.type === "theme") setTheme(action.theme);
        else if (action.type === "open") window.open(action.href, "_blank", "noopener,noreferrer");
        else go(action.href, newTab);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.nativeEvent.isComposing) return;
        const key = e.key.toLowerCase();
        const ctrl = e.ctrlKey && !e.metaKey && !e.altKey;
        if (e.key === "ArrowDown" || (ctrl && (key === "n" || key === "j"))) {
            e.preventDefault();
            move(1);
        } else if (e.key === "ArrowUp" || (ctrl && (key === "p" || key === "k"))) {
            e.preventDefault(); // and PaletteHost leaves Ctrl+K alone
            move(-1);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (selected) run(selected, e.metaKey || e.ctrlKey);
        } else if (e.key === "Escape") {
            // The dialog closes itself; the page's own Escape (an open project card, the drawer) stays out of it.
            e.stopPropagation();
        }
    };

    const searched = names.length + bodies.lines;
    const arrived = bodies.posts.length;
    const counter = (deferred.trim() ? `${count(matches)} / ${count(searched)}` : `${count(searched)} items`)
        + (arrived + bodies.failed < bodies.total ? ` · posts ${arrived}/${bodies.total}` : "")
        + (bodies.failed ? ` · ${bodies.failed} couldn't load` : "");

    return (
        <dialog
            ref={dialogRef}
            className={`palette${wide ? " palette--wide" : ""}`}
            aria-label="Search the site"
            // Escape. A close() from the cleanup above sends this too, later: in development, StrictMode runs that
            // effect twice, and the dialog is open again by then.
            onClose={() => !dialogRef.current?.open && close()}
            // A click on the backdrop lands on the dialog itself: its contents fill it.
            onClick={(e) => e.target === dialogRef.current && close()}
        >
            <div className="palette_field">
                <Search size={18} strokeWidth={1.9} aria-hidden="true" />
                <input
                    ref={inputRef}
                    className="palette_input"
                    type="text"
                    role="combobox"
                    aria-expanded="true"
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={selected ? optionId(index) : undefined}
                    placeholder="Search the site, or type a command"
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="go"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setSelectedId(null);
                    }}
                    onKeyDown={onKeyDown}
                />
            </div>

            <div className="palette_body">
                <ul id={listId} className="palette_list" role="listbox" aria-label="Results">
                    {rows.map((row, i) => (
                        <li
                            key={row.id}
                            id={optionId(i)}
                            className={`palette_row${row.hit?.text.lines[row.hit.index]!.code ? " is-code" : ""}`}
                            role="option"
                            aria-selected={i === index}
                            onPointerMove={() => row.id !== selected?.id && setSelectedId(row.id)}
                            onClick={(e) => run(row, e.metaKey || e.ctrlKey)}
                        >
                            <row.icon className="palette_icon" size={16} strokeWidth={1.9} aria-hidden="true" />
                            <span className="palette_text">
                                <span className="palette_title"><Marked text={row.title} marks={row.titleMarks} cut={!!row.hit} /></span>
                                {row.detail && (
                                    <span className="palette_detail"><Marked text={row.detail} marks={row.detailMarks} /></span>
                                )}
                            </span>
                            <span className="palette_label">{copied === row.id ? "Copied" : row.label}</span>
                        </li>
                    ))}
                    {rows.length === 0 && <li className="palette_empty" role="presentation">Nothing found</li>}
                </ul>
                {wide && <Preview row={selected} bodies={bodies} terms={termsOf(deferred)} />}
            </div>

            <div className="palette_foot">
                <span className="palette_count">{counter}</span>
                <span className="palette_keys" aria-hidden="true">
                    ↑↓ move · ↵ open · {APPLE ? "⌘" : "Ctrl "}↵ new tab · esc close
                </span>
            </div>
        </dialog>
    );
}
