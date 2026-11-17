import {type ComponentType, lazy} from "react";

// A deploy replaces every hashed filename, so a tab opened against an older build can ask for a page's chunk that no
// longer exists. A reload lands on the current build. Only for a page's own chunk, where a reload loses nothing: the
// page isn't on screen yet. What a page loads later (the palette, a post's text for it, a language's colours, PDF
// pages) fails on its own and says so there: a reload would throw away what's typed (#92). In the build only: on the
// dev server a chunk that fails is a mistake in its code, to read, not to reload.
// Timestamped so a deploy that is actually broken surfaces the error instead of reloading forever.
const RELOADED_AT = "preload-reloaded-at";

function reloadOnce(): boolean {
    if (!import.meta.env.PROD) return false;
    try {
        if (Date.now() - Number(sessionStorage.getItem(RELOADED_AT) ?? 0) < 10_000) return false;
        sessionStorage.setItem(RELOADED_AT, String(Date.now()));
    } catch {
        return false; // storage blocked: without the timestamp a reload could loop, so the error shows instead
    }
    window.location.reload();
    return true;
}

/** `lazy()` for a page: a chunk that can't be loaded reloads the site once, then is an error like any other. */
export default function lazyPage<Props>(load: () => Promise<{ default: ComponentType<Props> }>) {
    return lazy(() => load().catch((error: unknown) => {
        if (!reloadOnce()) throw error;
        // The reload is on its way: the page keeps loading until then, with no error in between.
        return new Promise<never>(() => undefined);
    }));
}
