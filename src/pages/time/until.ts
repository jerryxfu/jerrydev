// Apart from Countdown.tsx, so Time.tsx and the page's page.ts can read it without the countdown's code.
const UNTIL = "time:until";

// A countdown to a moment, remembered in this browser until it's over (Jerry): when it ends, and when it was started
// (for the bar), in ms.
export type Until = { end: number; from: number };

const MAX_MS = 8.64e15; // the last moment a date, and Temporal's Instant, can be

export function loadUntil(): Until | null {
    try {
        const saved = JSON.parse(localStorage.getItem(UNTIL) ?? "null") as Partial<Until> | null;
        // Within what a date can hold: a number the page didn't write could be past it, and reading it would throw.
        if (typeof saved?.end === "number" && typeof saved.from === "number" && saved.end > Date.now() && saved.end <= MAX_MS) {
            return {end: saved.end, from: saved.from};
        }
    } catch {
        // storage refused, or something else in it
    }
    return null;
}

// Whether a countdown to a moment is under way here: the page then opens on it (Time.tsx).
export const untilUnderWay = () => loadUntil() !== null;

export function saveUntil(until: Until | null) {
    try {
        if (until) localStorage.setItem(UNTIL, JSON.stringify(until));
        else localStorage.removeItem(UNTIL);
    } catch {
        // not remembered
    }
}
