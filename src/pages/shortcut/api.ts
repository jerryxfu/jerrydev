import {apiBaseUrl} from "../../main.tsx";

// Shortcut's calls to the API (routes/links there); the links made here are in links.ts. A call gives its data, or
// throws an ApiError with a sentence to show: the API's, or this page's when the API couldn't be reached.
export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

export type Link = { name: string; url: string; createdAt: string; expiresAt: string; visits: number };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
        res = await fetch(`${apiBaseUrl}/links${path}`, init);
    } catch {
        throw new ApiError("Couldn't reach Shortcut. Check your connection and try again.", 0);
    }
    // Null when there's no JSON to read: a 204, or a proxy's error page.
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(json?.error?.message || "Something went wrong. Try again.", res.status);
    return json?.data as T;
}

/** A new link: with `name`, or with a random code when it's empty. The token is its maker's, to delete it. */
export const makeLink = (url: string, name: string, days: number) =>
    call<{ name: string; url: string; expiresAt: string; token: string }>("", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({url, days, ...(name ? {name} : {})}),
    });

export const getLink = (name: string) => call<Link>(`/${encodeURIComponent(name)}`);

export const deleteLink = (name: string, token: string) =>
    call<void>(`/${encodeURIComponent(name)}`, {method: "DELETE", headers: {"X-Link-Token": token}});

/** For the footer: the links that work, and the visits through them. */
export const getStats = () => call<{ activeLinks: number; visits: number }>("/stats");

/** One more visit, as the page leaves for the destination: the request outlives the page (keepalive). */
export function countVisit(name: string): void {
    void fetch(`${apiBaseUrl}/links/${encodeURIComponent(name)}/visit`, {method: "POST", keepalive: true}).catch(() => {
        // not counted: the visit goes on all the same
    });
}
