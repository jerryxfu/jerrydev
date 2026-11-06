import type {Action} from "./sources.ts";

// Commands, known by the shape of what's typed rather than picked from the list.
export type Command = { id: string; title: string; detail: string; action: Action };

// Expedite's codes: 5 characters, without I, O, 0 or 1 (the API's generateCode).
const CODE = /^[A-HJ-NP-Z2-9]{5}$/i;

// A Unix time: "unix" and a number, or a number alone of 10 digits (seconds) or 13 (milliseconds). The date, here and in
// UTC; Enter copies the first.
function unixTime(query: string): Command | null {
    const typed = /^unix\s+(-?\d{1,16})$/i.exec(query)?.[1] ?? (/^\d{10}$|^\d{13}$/.test(query) ? query : null);
    if (!typed) return null;
    const ms = typed.replace("-", "").length >= 12 ? Number(typed) : Number(typed) * 1000;
    try {
        const instant = Temporal.Instant.fromEpochMilliseconds(ms);
        const local = instant.toLocaleString(undefined, {
            weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit",
        });
        return {id: `command:unix:${ms}`, title: local, detail: `${instant.toString()} · Unix time`, action: {type: "copy", text: local}};
    } catch {
        return null; // past what a date can be
    }
}

// The commands for what's typed: those to show first, and a code made only of letters, which goes after the names
// found ("PAGES" is a word as much as a code).
export function commandsFor(query: string): { first: Command[]; later: Command[] } {
    const typed = query.trim();
    const unix = unixTime(typed);
    if (unix) return {first: [unix], later: []};
    if (!CODE.test(typed)) return {first: [], later: []};
    const code = typed.toUpperCase();
    const drop: Command = {
        id: `command:drop:${code}`, title: `Open drop ${code}`, detail: "Expedite", action: {type: "go", href: `/expedite?code=${code}`},
    };
    return /\d/.test(code) ? {first: [drop], later: []} : {first: [], later: [drop]};
}
