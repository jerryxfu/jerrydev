import type {Page} from "@/head.ts";
import {fromNow} from "@/utils.ts";
import {readLinks} from "./links.ts";

const PATH = "/shortcut";
// A link has one address: the tool's letter, then its name (/s/party).
const LETTER = "s";
export const linkPath = (name: string): string => `/${LETTER}/${name}`;

// Where a link is reported: an address is enough. Jerry's, as in the home page's Contact.
export const REPORT_TO = "me@jerryxf.net";

// A destination as people read it: its host.
export const hostOf = (url: string): string => {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
};

export default {
    path: PATH,
    letter: LETTER,
    name: "Shortcut ✉️",
    description: "Make a long link short. Pick a name for it, or get a random one. A link lasts up to 30 days, with no account.",
    words: "short link url shorten shortener tiny redirect",
    // The links made in this browser. A row opens the tool's page, where the link is in "Your links" with Copy and
    // Delete: it doesn't follow the link (Jerry).
    saved: () => Object.entries(readLinks()).map(([name, link]) => ({
        id: `shortcut:${name}`,
        title: `Shortcut ${name}`,
        detail: `To ${hostOf(link.url)}, ends ${fromNow(Temporal.Instant.from(link.expiresAt).epochMilliseconds - Date.now())}`,
        href: PATH,
    })),
} satisfies Page;
