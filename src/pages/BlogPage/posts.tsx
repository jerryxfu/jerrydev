import {type ComponentType, lazy, type ReactElement} from "react";
import {Mdx} from "@/assets/projects/mdx.tsx";

// Tags are a closed set, so a typo fails `tsc` instead of quietly rendering a
// filter chip that matches nothing. Declaration order here is the order the chips render in on /blog.
export const TAGS = ["devlog", "ai", "webdev", "minecraft", "notes", "random"] as const;
export type Tag = typeof TAGS[number];

export const isTag = (value: string): value is Tag => (TAGS as readonly string[]).includes(value);

export type Post = {
    slug: string;          // must match the filename in ./posts/<slug>.mdx
    title: string;
    description: string;   // card copy, and the meta description on the post route
    date: Date;
    tags: Tag[];
    image?: string | ReactElement;
    draft?: boolean;       // listed either way, but greyed and unreadable in production (BYPASSED IN DEV)
};

// Metadata only. Bodies live in ./posts/<slug>.mdx and are joined by slug, so
// the list page can rank and render every card without touching any prose.
export const posts: Post[] = [
    {
        slug: "hello-blog",
        title: "How this blog works",
        description: "Reference for future me: every manifest field, every gotcha, and everything that renders.",
        date: new Date("2026-08-25"),
        tags: ["notes", "webdev"],
        image: <Mdx />,
    },
];

// Non-eager on purpose: this is a map of import *functions*, not the modules.
// Each post compiles to its own chunk, fetched only when its route is opened.
const postBodies = import.meta.glob<{ default: ComponentType }>("./posts/*.mdx");

const PREFIX = "./posts/";
const SUFFIX = ".mdx";
const slugOf = (key: string): string => key.slice(PREFIX.length, -SUFFIX.length);

// lazy() only stores the loader, so building the whole map up front fetches
// nothing and every post keeps its own chunk. Module scope rather than inside
// the page because creating components during render is exactly what
// react-hooks/static-components exists to catch.
export const postComponents: Record<string, ComponentType> = Object.fromEntries(
    Object.entries(postBodies).map(([key, loader]) => [slugOf(key), lazy(loader)])
);

// Newest first. Everything is listed now, drafts included, so the spread matters: sort() mutates in place and posts is exported.
export const listedPosts: Post[] = [...posts].sort((a, b) => b.date.getTime() - a.date.getTime());

// The single gate for whether a post can be opened. A draft is listed but inert in production. Bypassed in dev
export const isReadable = (post: Post): boolean => !post.draft || import.meta.env.DEV;

export const formatPostDate = (date: Date): string =>
    date.toLocaleDateString("en-CA", {year: "numeric", month: "long", day: "numeric"});

// The manifest and the folder are joined by slug and nothing enforces that at build time.
// A missing entry is a post that silently never appears; a missing file is a card that leads to a dead route. Both get named out loud in dev.
if (import.meta.env.DEV) {
    const files = new Set(Object.keys(postComponents));
    const listed = new Set(posts.map((post) => post.slug));

    for (const slug of files) {
        if (!listed.has(slug)) console.error(`[blog] posts/${slug}.mdx has no entry in posts.ts`);
    }
    for (const slug of listed) {
        if (!files.has(slug)) console.error(`[blog] posts.ts lists "${slug}" but posts/${slug}.mdx is missing`);
    }
}
