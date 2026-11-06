import {isReadable, listedPosts, type Post} from "@/pages/BlogPage/posts.tsx";
import {fold} from "./match.ts";

// The full text of the posts, for the palette. Each post's source is its own small file (?raw: vite.config.ts keeps the
// MDX plugin off it), fetched only when the palette first opens, newest post first, one after the other, so the
// results and the counter fill in as they arrive. The text then stays for the rest of the visit.

const sources = import.meta.glob<string>("/src/pages/BlogPage/posts/**/*.mdx", {query: "?raw", import: "default"});

// By slug: the file's name, wherever it's filed under posts/ (as posts.tsx joins them).
const loaders = new Map(Object.entries(sources).map(([path, load]) => [path.slice(path.lastIndexOf("/") + 1, -".mdx".length), load]));

export type Line = {
    n: number;      // its number in the source, from 1
    text: string;   // as it reads, without the Markdown around the words
    folded: string; // fold(text), what's searched
    code: boolean;  // in a code block
};

export type PostText = { post: Post; lines: Line[] };

export type Bodies = {
    posts: PostText[]; // in the order they arrived
    lines: number;     // all their lines
    total: number;     // posts to load
    failed: number;    // posts that couldn't be fetched (offline): tried again at the next opening
};

const FENCE = /^\s*(`{3,}|~{3,})/;

// A line outside the code blocks as it reads, or null for one with nothing to read: MDX's imports, a comment, a rule,
// a table's separator, a tag alone. Tags go and keep what's between them; links and pictures keep their text; the
// marks of headings, quotes, lists, bold and code go. Single * and _ stay: _ is in too many names in code.
function clean(raw: string): string | null {
    const line = raw.trim();
    if (!line || /^(import|export)\s/.test(line) || /^\{\/\*.*\*\/}$/.test(line)) return null;
    if (/^([-*_])\1{2,}$/.test(line) || /^\|?[\s:|-]*-[\s:|-]*\|?$/.test(line) || line === "$$") return null;
    const text = line
        .replace(/<\/?[A-Za-z][^<>]*>/g, " ")
        .replace(/!?\[([^\]]*)]\([^)]*\)/g, "$1")
        .replace(/^(#{1,6}|>|[-*+]|\d+\.)\s+/, "")
        .replace(/\*\*|__|`/g, "")
        .replace(/^\||\|$/g, "")
        .replace(/\s*\|\s*/g, " · ")
        .replace(/\s+/g, " ")
        .trim();
    return text || null;
}

function linesOf(source: string): Line[] {
    const lines: Line[] = [];
    let fence: string | null = null;
    source.split("\n").forEach((raw, i) => {
        const opening = FENCE.exec(raw)?.[1];
        if (opening && (!fence || opening.startsWith(fence))) {
            fence = fence ? null : opening;
            return;
        }
        const text = fence ? raw.trim() : clean(raw);
        if (text) lines.push({n: i + 1, text, folded: fold(text), code: fence !== null});
    });
    return lines;
}

let bodies: Bodies = {posts: [], lines: 0, total: 0, failed: 0};
let loading = false;
const listeners = new Set<() => void>();

export const subscribeBodies = (listener: () => void) => {
    listeners.add(listener);
    return () => void listeners.delete(listener);
};

export const bodiesNow = (): Bodies => bodies;

const update = (next: Bodies) => {
    bodies = next;
    listeners.forEach((listener) => listener());
};

// Fetches the posts not here yet. No delay of any kind: the filling in is the fetching.
export async function loadBodies(): Promise<void> {
    if (loading) return;
    const have = new Set(bodies.posts.map(({post}) => post.slug));
    const queue = listedPosts.filter((post) => isReadable(post) && loaders.has(post.slug) && !have.has(post.slug));
    if (queue.length === 0) return;
    loading = true;
    update({...bodies, total: have.size + queue.length, failed: 0});
    for (const post of queue) {
        try {
            const lines = linesOf(await loaders.get(post.slug)!());
            update({...bodies, posts: [...bodies.posts, {post, lines}], lines: bodies.lines + lines.length});
        } catch {
            update({...bodies, failed: bodies.failed + 1});
        }
    }
    loading = false;
}
