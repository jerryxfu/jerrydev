// Navigation data + types.
//
// A drawer item is either a leaf `link` or a `branch` (drills one level deeper).
// A branch's children are themselves NavItems, so the tree nests to any depth
// with no component changes — add data, get depth.
//
// Three kinds of href are supported, and they render differently:
//   "#projects"                 section anchor on the homepage (see resolveHref)
//   "/expedite"                 internal route, rendered as a wouter <Link>
//   "https://github.com/..."    external, needs `external: true` for the new tab
// Only the middle kind is client-side routed — see isRouted.

import home from "@/pages/HomePage/page.ts";

export type NavLink = {
    type: "link";
    label: string;
    href: string;
    external?: boolean; // opens in a new tab
    words?: string; // other words the palette finds it by
};

export type NavBranch = {
    type: "branch";
    label: string;
    key: string; // stable id, used for animation keys
    children: NavItem[];
};

export type NavItem = NavLink | NavBranch;

// Alt text for the logo image in the bar.
export const LOGO_ALT = "jerryxf sunset sky with moon icon";

// The home page and its sections (from its page.ts), inline in the bar on desktop and the drawer's first group.
// Hidden below the breakpoint in Navbar.scss, where the drawer takes over. These links and linksRight deliberately
// repeat in the drawer: it stays the complete menu at every size.
export const linksLeft: NavLink[] = [
    {type: "link", label: "Home", href: "#"},
    ...home.sections.map((section): NavLink => ({type: "link", label: section.label, href: section.anchor})),
];

export const linksRight: NavLink[] = [
    {type: "link", label: "Expedite 📦", href: "/expedite"},
    {type: "link", label: "Time ⏱️", href: "/time"},
    {type: "link", label: "Shortcut ✉️", href: "/shortcut"},
];

// The drawer's grouped menu. The root is an array of groups, rendered with a
// divider between each; every branch is a single group one level down.
export const menuGroups: NavItem[][] = [
    linksLeft,
    [
        {type: "link", label: "Expedite 📦", href: "/expedite"},
        {type: "link", label: "Time ⏱️", href: "/time"},
        {type: "link", label: "Rendezvous 📍", href: "/rendezvous"},
        {type: "link", label: "Shortcut ✉️", href: "/shortcut"},
        {type: "link", label: "Scheduler viewer 🗓️", href: "/scheduler"},
        // {
        //     type: "branch",
        //     label: "Tools",
        //     key: "tools",
        //     children: [
        //         {type: "link", label: "Expedite 📦", href: "/expedite"},
        //         {type: "link", label: "Rendezvous 📍", href: "/rendezvous"},
        //         {type: "link", label: "Scheduler viewer 🗓️", href: "/scheduler"}
        //     ],
        // },
    ],
    [
        {type: "link", label: "GitHub", href: "https://github.com/jerryxfu", external: true},
        {type: "link", label: "Curriculum Vitae", href: "https://cv.jerryxf.net/", external: true, words: "cv resume"},
    ],
];

// Section anchors only resolve on the homepage. From any other route, "#projects"
// would scroll nowhere, so it becomes "/#projects" and navigates home first.
export function resolveHref(href: string, pathname: string): string {
    if (!href.startsWith("#")) return href;
    if (pathname === "/") return href;
    return href === "#" ? "/" : `/${href}`;
}

// Which hrefs wouter is allowed to handle client-side.
// An absolute URL or a hash anchor must stay a plain <a>.
// wouter's <Link> intercepts the click and calls history.pushState, which for a cross-origin URL silently does nothing.
// For a hash, skip the browser's native scroll-to-id.
export function isRouted(item: NavLink): boolean {
    if (item.external) return false;
    if (item.href.startsWith("#")) return false;
    // Match any scheme ("https:", "mailto:", "tel:") and protocol-relative "//host".
    if (item.href.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(item.href)) return false;
    return true;
}