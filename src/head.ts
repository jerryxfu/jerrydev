import {isReadable, posts} from "@/pages/BlogPage/posts.tsx";
import {TOPIC_IDS, TOPICS} from "@/pages/BlogPage/topics.tsx";

// What search engines and link previews read about each page: its title, description, address and language.
// The build writes it into each page's own HTML file (pageHeads in vite.config.ts), because link previews and most
// search engines read that HTML without running the app. <PageHead> (main.tsx) keeps it right as the app moves
// between pages. Each page says it in its own folder's page.ts (src/pages/time/page.ts), gathered here; the blog's
// topics and posts come from their own lists. A new route needs its page.ts: without one it gets NOT_FOUND, which
// keeps it out of search.

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

// A page of its own, in its folder's page.ts: its head, and what the bar and the palette (components/Palette) use.
export type Page = Head & {
    words?: string;          // the palette only: other words people type for it
    sections?: Section[];    // the parts the bar and the palette link to (the home page's)
    saved?: () => Saved[];   // what this browser keeps for it, listed in the palette: read each time it opens
};

export type Section = { label: string; anchor: string; line: string };

export type Saved = { id: string; title: string; detail: string; href: string };

// Every page.ts, the home page first, then by name. They import nothing that runs in a browser as they load: the build
// reads this file in Node.
export const PAGES: Page[] = Object.values(import.meta.glob<Page>("./pages/*/page.ts", {eager: true, import: "default"}))
    .sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : a.name.localeCompare(b.name)));

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
