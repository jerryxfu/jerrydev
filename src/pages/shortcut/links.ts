// The links made in this browser, by name: the token that deletes each (the API gives it once, when the link is made),
// where it goes, when it was made (the list's order) and when it ends. Apart from the API's calls (api.ts), so the
// page's page.ts can list them for the palette without loading those. Clearing the site's data loses this list and the
// right to delete, not the links.

const LINKS_KEY = "shortcut:links";

export type MyLink = { token: string; url: string; at: string; expiresAt: string };

// Whole, and still running. Each entry is read on its own: one that can't be read is left out, and the others stay.
const running = (link: MyLink): boolean => {
    try {
        return typeof link.token === "string" && typeof link.url === "string" && typeof link.at === "string"
            && Temporal.Instant.from(link.expiresAt).epochMilliseconds > Date.now();
    } catch {
        return false;
    }
};

export function readLinks(): Record<string, MyLink> {
    try {
        const all = JSON.parse(localStorage.getItem(LINKS_KEY) ?? "{}") as Record<string, MyLink>;
        return Object.fromEntries(Object.entries(all).filter(([, link]) => running(link)));
    } catch {
        return {};
    }
}

const write = (links: Record<string, MyLink>): void => {
    try {
        localStorage.setItem(LINKS_KEY, JSON.stringify(links));
    } catch { /* storage refused (a private window): the link works, but can't be deleted from this page later */
    }
};

export const keepLink = (name: string, link: MyLink): void => write({...readLinks(), [name]: link});

export const forgetLink = (name: string): void =>
    write(Object.fromEntries(Object.entries(readLinks()).filter(([kept]) => kept !== name)));
