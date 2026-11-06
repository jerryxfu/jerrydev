import {PAGE_HEADS, PAGES} from "@/head.ts";
import {menuGroups, type NavItem, type NavLink} from "@/components/Nav/nav.config.ts";
import {projects, type Project} from "@/pages/HomePage/Projects/projects.ts";
import {projectAnchor} from "@/pages/HomePage/Projects/Projects.tsx";
import {isReadable, listedPosts, type Post} from "@/pages/BlogPage/posts.tsx";
import {THEME_INFO, THEMES, type ThemePreference} from "@/context/ThemeContext.tsx";
import {type Friend, friendList} from "@/components/Friends/friends.ts";
import {EMAIL, medias} from "@/pages/HomePage/Contact/Contact.tsx";

// Everything the palette finds at once: what the site already has in its bundle, and what this browser has saved. The
// pages, their sections and what's saved for them come from each page's own page.ts (gathered in src/head.ts).

export type Kind =
    "page" | "section" | "topic" | "project" | "post" | "cheatsheet" | "theme" | "friend" | "link" | "saved" | "action";

// What Enter does.
export type Action =
    | { type: "go"; href: string }   // a page of the site ("/time"), or a home page anchor ("#projects")
    | { type: "open"; href: string } // another site, in a new tab
    | { type: "theme"; theme: ThemePreference }
    | { type: "copy"; text: string };

// What the preview on the right shows, besides the title and detail.
export type Source =
    | { type: "project"; project: Project }
    | { type: "post"; post: Post }
    | { type: "theme"; theme: ThemePreference }
    | { type: "friend"; friend: Friend };

export type Item = {
    id: string;
    kind: Kind;
    title: string;
    detail?: string;
    words?: string; // matched but not shown: tags, other names
    action: Action;
    source?: Source;
};

export const KIND_LABEL: Record<Kind, string> = {
    page: "page", section: "section", topic: "topic", project: "project", post: "post", cheatsheet: "cheat sheet",
    theme: "theme", friend: "friend", link: "link", saved: "on this device", action: "action",
};

const pages = (): Item[] => PAGES.filter((page) => !page.noindex).map((page) => ({
    id: `page:${page.path}`,
    kind: "page",
    title: page.name,
    detail: page.description,
    words: page.words,
    action: {type: "go", href: page.path},
}));

// The blog's topics, which are pages of their own made from topics.tsx.
const topics = (): Item[] => PAGE_HEADS.filter((head) => head.path.startsWith("/blog/topics/")).map((head) => ({
    id: `topic:${head.path}`,
    kind: "topic",
    title: head.name,
    detail: head.description,
    action: {type: "go", href: head.path},
}));

// The sections a page lists: the home page's, whose anchors the bar links to the same way.
const sections = (): Item[] => PAGES.flatMap((page) => (page.sections ?? []).map((section): Item => ({
    id: `section:${section.anchor}`,
    kind: "section",
    title: section.label,
    detail: section.line,
    action: {type: "go", href: section.anchor},
})));

const projectItems = (): Item[] => projects.map((project) => ({
    id: `project:${project.title}`,
    kind: "project",
    title: project.title,
    detail: project.subTitle,
    words: project.categories.join(" "),
    action: {type: "go", href: `#${projectAnchor(project.title)}`},
    source: {type: "project", project},
}));

const postItems = (): Item[] => listedPosts.filter(isReadable).map((post) => ({
    id: `post:${post.slug}`,
    kind: post.tags.includes("cheatsheet") ? "cheatsheet" : "post",
    title: post.title,
    detail: post.description,
    words: post.tags.join(" ").replace("cheatsheet", "cheat sheet"),
    action: {type: "go", href: `/blog/${post.slug}`},
    source: {type: "post", post},
}));

const themeItems = (): Item[] => [...THEMES, "auto" as const].map((theme) => ({
    id: `theme:${theme}`,
    kind: "theme",
    title: theme === "auto" ? "Auto" : THEME_INFO[theme].label,
    detail: theme === "auto" ? "Light or Night, as your device is set" : THEME_INFO[theme].dark ? "Dark theme" : "Light theme",
    words: "theme",
    action: {type: "theme", theme},
    source: {type: "theme", theme},
}));

const friendItems = (): Item[] => friendList.map((friend) => ({
    id: `friend:${friend.url}`,
    kind: "friend",
    title: friend.name,
    detail: friend.blurb,
    words: friend.site,
    action: {type: "open", href: friend.url},
    source: {type: "friend", friend},
}));

// The drawer's links to other sites (GitHub, the CV) and Contact's, once each.
const linkItems = (): Item[] => {
    const drawer = menuGroups.flat().filter((item: NavItem): item is NavLink => item.type === "link" && !!item.external);
    const all = [
        ...drawer.map((link) => ({title: link.label, href: link.href, detail: link.href.replace(/^https:\/\/|\/$/g, ""), words: link.words})),
        ...medias.map((media) => ({title: media.title, href: media.url, detail: media.username, words: undefined})),
    ];
    const seen = new Set<string>();
    return all
        .filter(({href}) => !seen.has(href) && !!seen.add(href))
        .map(({title, href, detail, words}): Item => ({
            id: `link:${href}`, kind: "link", title, detail, words, action: {type: "open", href},
        }));
};

const email = (): Item => ({
    id: "action:email",
    kind: "action",
    title: "Copy email",
    detail: EMAIL,
    words: "mail contact",
    action: {type: "copy", text: EMAIL},
});

// What this browser keeps for each page (its page.ts reads it): your seats in live rooms, the events you answered, a
// countdown under way. Found by the page's name too.
const saved = (): Item[] => PAGES.flatMap((page) => (page.saved?.() ?? []).map((entry): Item => ({
    id: `saved:${entry.id}`,
    kind: "saved",
    title: entry.title,
    detail: entry.detail,
    words: page.name,
    action: {type: "go", href: entry.href},
})));

// The list, in the order it shows with nothing typed: what's saved first, then the site from top to bottom.
export const namedItems = (): Item[] => [
    ...saved(), ...pages(), ...topics(), ...sections(), ...projectItems(), ...postItems(), ...themeItems(), ...friendItems(),
    ...linkItems(), email(),
];
