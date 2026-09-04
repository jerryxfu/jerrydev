import {type ComponentType, lazy, type ReactElement} from "react";
import {type SyllabusEntry, type TopicId, topicIds, TOPICS} from "./topics.tsx";

// assets
import {Mdx} from "@/assets/projects/mdx.tsx";

// Tags are a closed set, so a typo fails `tsc` instead of quietly rendering a filter chip that matches nothing. Declaration order here is the order the chips render in on /blog.
export const TAGS = [
    "ai",
    "devlog",
    "excel",
    "gaming",
    "git",
    "med",
    "notes",
    "python",
    "random",
    "robotics",
    "vision",
    "webdev",
] as const;

export type Tag = typeof TAGS[number];

export const isTag = (value: string): value is Tag => (TAGS as readonly string[]).includes(value);

// `new Date("2026-08-25")` is parsed as UTC midnight, which is the 24th at 20:00 anywhere west of Greenwich, so the
// card renders the wrong day. The T00:00:00 suffix forces local parsing instead. Wrapped in a helper. Same fix as in ProjectCards
const postDate = (iso: `${number}-${number}-${number}`): Date => new Date(`${iso}T00:00:00`);

export type Post = {
    slug: string;          // must match the filename in ./posts/<slug>.mdx
    title: string;
    description: string;   // card copy, and the meta description on the post route
    date: Date;
    tags: Tag[];
    lang: "en" | "fr" | "es";
    image?: string | ReactElement;
    draft?: boolean;       // listed either way, but greyed and unreadable in production (BYPASSED IN DEV)
};


// Metadata only. Bodies live in ./posts/<slug>.mdx and are joined by slug, so the list page can rank and render every card without touching any prose.
export const posts: Post[] = [
    {
        slug: "math_ia-devlog0",
        title: "Language models can't do math",
        description: "Devlog #0: The plan. Do the numbers inside GPT-2 have a geometric structure, and if so, which one?",
        date: postDate("2026-09-01"),
        tags: ["ai", "devlog"],
        lang: "en"
    },
    // Robotics course. All drafts until each lesson is actually written; the topic page lists them either way, so the syllabus is visible from day one.
    // Same date on every lesson on purpose: the topic page orders by syllabus, and /blog would otherwise scatter them by whichever day each was finished.
    {
        slug: "vision-intro",
        title: "Vision sur le robot: introduction 🍋‍🟩",
        description: "L'objectif de ce cours.",
        date: postDate("2026-08-30"),
        tags: ["robotics", "vision"],
        lang: "fr"
    },
    {
        slug: "vision-cameras",
        title: "Caméras et images",
        description: "Une image est une grille de nombres, une caméra est une projection.",
        date: postDate("2026-08-30"),
        tags: ["robotics", "vision"],
        lang: "fr"
    },
    {
        slug: "vision-apriltags",
        title: "Les AprilTags",
        description: "Ce qu'est un AprilTag, comment le détecteur en trouve un dans l'image, et pourquoi quatre coins suffisent à se repérer.",
        date: postDate("2026-08-30"),
        tags: ["robotics", "vision"],
        lang: "fr",
        draft: true,
    },
    {
        slug: "vision-pose-estimation",
        title: "L'estimation de pose avec SolvePnP",
        description: "De quatre coins dans l'image à une position sur le terrain : le problème Perspective-n-Point, ses solutions, et l'ambiguïté qui vient avec.",
        date: postDate("2026-08-30"),
        tags: ["robotics", "vision"],
        lang: "fr",
        draft: true,
    },
    {
        slug: "vision-localization",
        title: "Localisation robuste: sur le robot",
        description: "Fusionner l'odométrie et la vision sans se faire mentir : écarts-types, rejet des mauvaises mesures, et ce que le code de l'équipe fait de plus.",
        date: postDate("2026-08-30"),
        tags: ["robotics", "vision"],
        lang: "fr",
        draft: true,
    },
    {
        slug: "vision-limelight-tuning",
        title: "Calibrer les Limelight",
        description: "Exposition, gain, pipeline AprilTag, calibration, carte du terrain : les réglages qui comptent et dans quel ordre les faire.",
        date: postDate("2026-08-30"),
        tags: ["robotics", "vision"],
        lang: "fr",
        draft: true,
    },
    {
        slug: "ai-basics",
        title: "Artificial intelligence and machine learning",
        description: "For the curious. What \"learning\" means for a machine, why we don't write the rules by hand, and the kinds of learning.",
        date: postDate("2026-08-30"),
        tags: ["ai", "robotics"],
        lang: "en",
        draft: true,
    },
    {
        slug: "ai-neural-networks",
        title: "Neural networks",
        description: "A neuron is a weighted sum, a network is a function, learning is descent. With just enough math.",
        date: postDate("2026-08-30"),
        tags: ["ai", "robotics"],
        lang: "en",
        draft: true,
    },
    {
        slug: "ai-object-detection",
        title: "Object detection",
        description: "How a network turns an image into labeled boxes: convolutions, YOLO, IoU, and what runs on a Limelight.",
        date: postDate("2026-08-30"),
        tags: ["ai", "robotics"],
        lang: "en",
        draft: true,
    },
    {
        slug: "ai-llms",
        title: "Large language models",
        description: "Next-token prediction at very large scale: tokens, embeddings, attention, and how to use them without getting burned.",
        date: postDate("2026-08-30"),
        tags: ["ai", "robotics"],
        lang: "en",
        draft: true,
    },
    {
        slug: "cheatsheet-limelight",
        title: "Aide-mémoire Limelight",
        description: "Les réglages, les clés NetworkTables et les appels LimelightLib qu'on cherche toujours, sur une page.",
        date: postDate("2026-08-30"),
        tags: ["robotics", "vision", "notes"],
        lang: "fr",
        draft: true,
    },
    {
        slug: "cheatsheet-coordinates",
        title: "Repères, unités et conventions",
        description: "Quel axe pointe où, dans WPILib et dans les Limelight, et comment passer d'un repère à l'autre sans inverser un signe.",
        date: postDate("2026-08-30"),
        tags: ["robotics", "vision", "notes"],
        lang: "fr",
        draft: true,
    },
    {
        slug: "cheatsheet-math",
        title: "Boîte à outils mathématiques",
        description: "Vecteurs, matrices, rotations, coordonnées homogènes et la notation Σ : tout ce que les leçons supposent, au même endroit.",
        date: postDate("2026-08-30"),
        tags: ["robotics", "notes"],
        lang: "fr",
        draft: true,
    },
    {
        slug: "cheatsheet-vision-debug",
        title: "Checklist de débogage vision",
        description: "Le tag n'est pas détecté, la pose saute, la latence explose : par quoi commencer, dans l'ordre.",
        date: postDate("2026-08-30"),
        tags: ["robotics", "vision", "notes"],
        lang: "fr",
        draft: true,
    },
    // region python
    {
        slug: "python-basics",
        title: "Python I — The basics",
        description: "Variables, loops, functions, lists and debugging, starting from the first print(). Read top to bottom; each section builds on the last.",
        date: postDate("2026-08-29"),
        tags: ["python"],
        lang: "en",
    },
    {
        slug: "python-going-further",
        title: "Python II — Going further",
        description: "Dictionaries, classes, exceptions, files and environments. Written as reference rather than tutorial: skim the headings and come back when you need them.",
        date: postDate("2026-08-29"),
        tags: ["python"],
        lang: "en",
    },
    {
        slug: "python-scientific",
        title: "Python III — Scientific Python",
        description: "NumPy, matplotlib and numerical data. For anything involving arrays, plots, or a lot of numbers.",
        date: postDate("2026-08-29"),
        tags: ["python"],
        lang: "en",
    },
    {
        slug: "python-appendices",
        title: "Python — Appendices",
        description: "The gotchas that eat hours, a cheat sheet, and where to go next.",
        date: postDate("2026-08-29"),
        tags: ["python", "notes"],
        lang: "en",
    },
    // endregion
    // region git
    {
        slug: "git-basics",
        title: "Git & GitHub I — Git",
        description: "Commits, branches, merges, and how to undo almost anything. The half of version control that runs on your own machine.",
        date: postDate("2026-08-29"),
        tags: ["git"],
        lang: "en",
    },
    {
        slug: "git-github",
        title: "Git & GitHub II — GitHub",
        description: "Remotes, pull requests, collaboration and Pages. Putting the work online and letting other people near it.",
        date: postDate("2026-08-29"),
        tags: ["git"],
        lang: "en",
    },
    {
        slug: "git-reference",
        title: "Git & GitHub III — Reference",
        description: "Workflows, fixing mistakes, and a command list to come back to once the concepts have stuck.",
        date: postDate("2026-08-29"),
        tags: ["git", "notes"],
        lang: "en",
    },
    // endregion
    {
        slug: "excel-formulas",
        title: "Excel formula handbook",
        description: "Quick reference for the formulas that come up constantly: math, stats, lookups, text and dates.",
        date: postDate("2026-08-29"),
        tags: ["excel", "notes"],
        lang: "en",
    },
    {
        slug: "excel-formulas-es",
        title: "Manual de fórmulas de Excel",
        description: "Referencia rápida de las fórmulas más habituales de Excel: matemáticas, estadística, búsquedas, texto y fechas.",
        date: postDate("2026-08-29"),
        tags: ["excel", "notes"],
        lang: "es",
    },
    {
        slug: "medive-devlog0",
        title: "MEDIVE Devlog #0: Starting over",
        description: "Where MEDIVE came from, why I threw out the first implementation before it produced a single number, and what the next few months look like.",
        date: postDate("2026-08-28"),
        tags: ["ai", "devlog", "med"],
        lang: "en"
    },
    {
        slug: "hello-blog",
        title: "How this blog works",
        description: "Reference for future me: every manifest field, every gotcha, and everything that renders.",
        date: postDate("2026-08-25"),
        tags: ["notes", "webdev"],
        lang: "en",
        image: <Mdx />,
    },
];


// Non-eager on purpose: this is a map of import *functions*, not the modules. Each post compiles to its own chunk, fetched only when its route is opened.
// `**` rather than `*`: a single star does not cross a directory separator.
const postBodies = import.meta.glob<{ default: ComponentType }>("./posts/**/*.mdx");

// Basename, not path-minus-prefix. Folders under posts/ are filing, not routing: the slug for posts/guides/python-basics.mdx is "python-basics",
// because /blog/:slug is a single wouter segment and a slug with a slash in it matches no route at all.
const SUFFIX = ".mdx";
const slugOf = (key: string): string => key.slice(key.lastIndexOf("/") + 1, -SUFFIX.length);

// lazy() only stores the loader, so building the whole map up front fetches nothing and every post keeps its own chunk. Module scope rather than inside
// the page because creating components during render is exactly what react-hooks/static-components exists to catch.
export const postComponents: Record<string, ComponentType> = Object.fromEntries(
    Object.entries(postBodies).map(([key, loader]) => [slugOf(key), lazy(loader)])
);

// Newest first. Everything is listed now, drafts included, so the spread matters: sort() mutates in place and posts is exported.
export const listedPosts: Post[] = [...posts].sort((a, b) => b.date.getTime() - a.date.getTime());

// The single gate for whether a post can be opened. A draft is listed but inert in production. Bypassed in dev
export const isReadable = (post: Post): boolean => !post.draft || import.meta.env.DEV;

// Derived from the topic manifests rather than stored on the post, so a post cannot claim a topic that does not list
// it. Returns the first match; the dev check below complains if a slug appears in more than one.
export const topicOf = (slug: string): TopicId | undefined =>
    topicIds.find((id) => syllabusSlugs(TOPICS[id].posts).includes(slug));

// Drops chapter markers, leaving just the slugs in order.
const syllabusSlugs = (entries: SyllabusEntry[]): string[] =>
    entries.filter((entry): entry is string => typeof entry === "string");

// The topic's own order, not date order. Drafts are listed here exactly as /blog lists them, so a course shows the
// lessons still being written instead of a gap. isReadable governs whether a card opens, never whether it appears.
export const postsInTopic = (id: TopicId): Post[] =>
    syllabusSlugs(TOPICS[id].posts)
        .map((slug) => listedPosts.find((post) => post.slug === slug))
        .filter((post): post is Post => post !== undefined);

export type Chapter = { name?: string; anchor?: string; posts: Post[] };

// A chapter marker with break: true makes prev/next stop at that boundary instead. Without any breaking markers this returns a single run.
// The one place isReadable still filters. A draft belongs on the topic page as a card, but must never be a prev/next
// target: in production its route is a dead end, so "Next" would walk the reader into "Post not found".
const sequencesInTopic = (id: TopicId): Post[][] => {
    const runs: Post[][] = [];
    let current: Post[] = [];

    for (const entry of TOPICS[id].posts) {
        if (typeof entry === "string") {
            const post = listedPosts.find((p) => p.slug === entry);
            if (post && isReadable(post)) current.push(post);
        } else if (entry.break) {
            if (current.length > 0) runs.push(current);
            current = [];
        }
    }
    if (current.length > 0) runs.push(current);

    return runs;
};

// The same syllabus, grouped. Posts before the first marker land in a leading chapter with no name, which is what lets a topic open with a couple of ungrouped lessons.
// A syllabus that opens with a marker instead produces that leading chapter empty, so empty ones are dropped rather than rendered as a heading
// with nothing under it — which also keeps them out of the Chapters nav, built from this same list, where the link would point at an id no section renders.
export const chaptersInTopic = (id: TopicId): Chapter[] => {
    const out: Chapter[] = [];
    let current: Chapter = {posts: []};

    for (const entry of TOPICS[id].posts) {
        if (typeof entry === "string") {
            const post = listedPosts.find((p) => p.slug === entry);
            if (post) current.posts.push(post);
        } else if (entry.chapter !== undefined) {
            out.push(current);
            current = {name: entry.chapter, anchor: slugifyChapter(entry.chapter), posts: []};
        }
        // An unnamed marker is a prev/next break only, so it is skipped here and the posts either side of it stay in the same chapter.
    }
    out.push(current);

    return out.filter((chapter) => chapter.posts.length > 0);
};

const slugifyChapter = (name: string): string =>
    "chapter-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Previous and next lesson within the post's own topic. Undefined at either end, and undefined entirely for a post in
// no topic, which is what keeps the control off ordinary blog posts.
export const neighbours = (slug: string): { topic?: TopicId; prev?: Post; next?: Post } => {
    const topic = topicOf(slug);
    if (!topic) return {};

    for (const run of sequencesInTopic(topic)) {
        const index = run.findIndex((post) => post.slug === slug);
        if (index !== -1) return {topic, prev: run[index - 1], next: run[index + 1]};
    }

    return {topic};
};

export const formatPostDate = (date: Date): string =>
    date.toLocaleDateString("en-CA", {year: "numeric", month: "long", day: "numeric"});

const relative = new Intl.RelativeTimeFormat("en", {numeric: "auto"});

// Both sides are collapsed to local midnight before differencing, so the answer is a whole number of calendar days regardless of the time of day either fell on
// (that's the same rounding issue that bit the project footer). numeric: "auto" turns 0 and 1 into "today" and "yesterday" instead of "0 days ago".
export const formatPostAge = (date: Date): string => {
    const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((midnight(date) - midnight(new Date())) / 86_400_000);

    if (days > -30) return relative.format(days, "day");
    if (days > -365) return relative.format(Math.round(days / 30), "month");
    return relative.format(Math.round(days / 365), "year");
};

// The manifest and the folder are joined by slug and nothing enforces that at build time.
// A missing entry is a post that silently never appears; a missing file is a card that leads to a dead route. Both get named out loud in dev.
if (import.meta.env.DEV) {
    const files = new Set(Object.keys(postComponents));
    const listed = new Set(posts.map((post) => post.slug));

    for (const slug of files) {
        if (!listed.has(slug)) console.error(`[blog] posts/${slug}.mdx has no entry in posts.ts`);
    }

    // Only possible now that posts/ has subfolders. Slugs are basenames, so posts/a.mdx and posts/guides/a.mdx collapse to the same key and Object.fromEntries
    // keeps whichever came last — one post silently starts rendering the other one's prose, with nothing else to notice it by.
    const byBasename = new Map<string, string>();
    for (const key of Object.keys(postBodies)) {
        const slug = slugOf(key);
        const other = byBasename.get(slug);
        if (other) console.error(`[blog] ${other} and ${key} share the slug "${slug}"; one shadows the other`);
        byBasename.set(slug, key);
    }
    for (const slug of listed) {
        if (!files.has(slug)) console.error(`[blog] posts.ts lists "${slug}" but posts/${slug}.mdx is missing`);
    }

    // Topic slug arrays are plain strings, tsc cannot check them against post slugs, because slugs are not a union type.
    // This check is the only thing between a typo and a lesson silently vanishing from its course.
    const seen = new Map<string, TopicId>();
    for (const id of topicIds) {
        for (const slug of syllabusSlugs(TOPICS[id].posts)) {
            if (!listed.has(slug)) console.error(`[blog] topic "${id}" lists "${slug}", which is not a post`);
            const other = seen.get(slug);
            if (other) console.error(`[blog] "${slug}" is in both "${other}" and "${id}"; a post belongs to one topic`);
            seen.set(slug, id);
        }
    }
}
