import {isReadable, posts} from "@/pages/BlogPage/posts.tsx";
import {TOPIC_IDS, TOPICS} from "@/pages/BlogPage/topics.tsx";

// What search engines and link previews read about each page: its title, description, address and language.
// The build writes it into each page's own HTML file (pageHeads in vite.config.ts), because link previews and most
// search engines read that HTML without running the app. <PageHead> (main.tsx) keeps it right as the app moves
// between pages. A new route needs its entry here: without one it gets NOT_FOUND, which keeps it out of search.

export const SITE = "https://jerryxf.net";
const SITE_NAME = "jerryxf";

export type Head = {
    path: string;                   // the route, no trailing slash ("/" for the home page)
    name: string;                   // the page's own name; the title adds " | jerryxf"
    description: string;            // the snippet under the result, and the preview's text
    lang?: "en" | "fr" | "es";      // <html lang>, "en" when absent
    article?: boolean;              // a blog post, for link previews
    noindex?: boolean;              // kept out of search results and the sitemap
};

const PAGES: Head[] = [
    {
        path: "/", name: SITE_NAME,
        description: "Hi, I'm Jerry. I build things in robotics, AI, medicine and code, and share them here: my projects, a blog, and tools like Expedite and Rendezvous.",
    },
    {path: "/blog", name: "Blog", description: "Writing about the things I discover, build, and learn along the way"},
    {
        path: "/expedite", name: "Expedite 📦",
        description: "Quickly share files and text snippets with other people or across your own devices.",
    },
    {
        path: "/rendezvous", name: "Rendezvous 📌",
        description: "Find the best time for your group to meet. Share availabilities and schedule events effortlessly.",
    },
    {path: "/scheduler", name: "Scheduler", description: "View and compare schedules"},
    {
        path: "/time", name: "Time",
        description: "Time tools on one page: a Unix time converter, a countdown, a stopwatch, a date calculator, world clocks and an A/V sync test pattern.",
    },
    {path: "/supericu", name: "SuperICU", description: "A tool to preview ICU data in a patient monitor-like interface."},
    {path: "/elements", name: "Elements", description: "Coming soon.", noindex: true},
];

// Every page with its own HTML file. Drafts are left out the way the post page leaves them out: in production they're a dead end.
export const PAGE_HEADS: Head[] = [
    ...PAGES,
    ...TOPIC_IDS.map((id): Head => ({path: `/blog/topics/${id}`, name: TOPICS[id].name, description: TOPICS[id].description})),
    ...posts.filter(isReadable).map((post): Head => ({
        path: `/blog/${post.slug}`, name: post.title, description: post.description,
        lang: post.lang, article: true,
    })),
];

const NOT_FOUND: Head = {path: "", name: "404 Not Found", description: "How did we end up here?", noindex: true};

const byPath = new Map(PAGE_HEADS.map((head) => [head.path, head]));

export const headFor = (path: string): Head | undefined => byPath.get(path.length > 1 ? path.replace(/\/+$/, "") : path);

const titleOf = (head: Head): string => head.name === SITE_NAME ? SITE_NAME : `${head.name} | ${SITE_NAME}`;

type Tag = [element: string, attributes: Record<string, string>];

// The tags that change from page to page. The title is set apart: the document has one.
const tagsOf = (head: Head): Tag[] => {
    const url = SITE + head.path;
    const tags: Tag[] = [
        ["meta", {name: "description", content: head.description}],
        ["meta", {
            name: "robots",
            content: head.noindex ? "noindex" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        }],
        ["meta", {property: "og:type", content: head.article ? "article" : "website"}],
        ["meta", {property: "og:title", content: head.name}],
        ["meta", {property: "og:description", content: head.description}],
    ];
    // A page kept out of search (a 404 among them) has no address to give as the one to list.
    if (!head.noindex) tags.push(["meta", {property: "og:url", content: url}], ["link", {rel: "canonical", href: url}]);
    return tags;
};

// In the app: swaps the page's tags for the new page's (data-page marks them, in the built HTML too).
export const applyHead = (head: Head | undefined): void => {
    const page = head ?? NOT_FOUND;
    document.title = titleOf(page);
    document.documentElement.lang = page.lang ?? "en";
    document.head.querySelectorAll("[data-page]").forEach((el) => el.remove());
    for (const [tag, attributes] of tagsOf(page)) {
        const el = document.createElement(tag);
        for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
        el.setAttribute("data-page", "");
        document.head.append(el);
    }
};

const escapeHtml = (text: string): string =>
    text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// At build time: the built index.html with this page's tags in place of its <!-- page head --> comment.
// The home page also names the site for Google, which shows that name above its results.
export const renderPage = (template: string, head: Head): string => {
    if (!template.includes("<!-- page head -->") || !template.includes("<html lang=\"en\">")) {
        throw new Error("index.html lost its <!-- page head --> comment or its <html lang=\"en\">");
    }
    const tags = [
        `<title>${escapeHtml(titleOf(head))}</title>`,
        ...tagsOf(head).map(([tag, attributes]) =>
            `<${tag} ${Object.entries(attributes).map(([key, value]) => `${key}="${escapeHtml(value)}"`).join(" ")} data-page />`),
    ];
    if (head.path === "/") {
        tags.push(`<script type="application/ld+json">${JSON.stringify({
            "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: `${SITE}/`,
        })}</script>`);
    }
    return template
        .replace("<html lang=\"en\">", `<html lang="${head.lang ?? "en"}">`)
        .replace("<!-- page head -->", tags.join("\n    "));
};

// At build time: every page search engines may list. No lastmod: a post's date is when it came out, not when it last
// changed, and Google stops reading a sitemap's dates once they prove wrong.
export const sitemap = (): string => [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...PAGE_HEADS.filter((head) => !head.noindex).map((head) =>
        `    <url><loc>${SITE}${head.path}</loc></url>`),
    `</urlset>`,
    ``,
].join("\n");
