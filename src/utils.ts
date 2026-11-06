// A calendar day as the site's data writes it, "2026-09-01": the blog's posts, the projects, the experiences. Kept as
// text in the data, so no module needs Temporal while it loads (main.tsx); Temporal.PlainDate.from reads it.
export type IsoDay = `${number}-${number}-${number}`;

// "18-05-2026 (141 days ago)": a project's or an experience's date, and how many calendar days ago it was.
export function formatDate(iso: IsoDay): string {
    const date = Temporal.PlainDate.from(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    const days = date.until(Temporal.Now.plainDateISO()).days;
    return `${pad(date.day)}-${pad(date.month)}-${date.year} (${days} days ago)`;
}

// A text's characters as a reader sees them (graphemes): not UTF-16 units, which cut an emoji in two (half of one shows
// as a broken character), nor code points (Array.from splits 🛰️ into the satellite and its variation selector).
const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, {granularity: "grapheme"}) : null;
export const graphemes = (text: string): string[] =>
    segmenter ? Array.from(segmenter.segment(text), (part) => part.segment) : Array.from(text);

// Puts text on the clipboard; true once it's there. The Clipboard API first. Where there's none (an http address, like
// the dev server's on the network) or it refuses, the old way: a hidden text box, selected and copied, then the focus
// back where it was.
export async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const focused = document.activeElement as HTMLElement | null;
        const box = document.createElement("textarea");
        box.value = text;
        box.readOnly = true;
        box.style.cssText = "position: fixed; top: 0; left: 0; opacity: 0;";
        document.body.append(box);
        box.select();
        try {
            return document.execCommand("copy");
        } catch {
            return false;
        } finally {
            box.remove();
            focused?.focus({preventScroll: true});
        }
    }
}

const relativeTime = new Intl.RelativeTimeFormat("en", {numeric: "auto"});

// "in 42 minutes", "in 3 hours", "in 2 days": how long until something, from a count of ms (the palette's saved items).
export function fromNow(ms: number): string {
    const minutes = Math.max(1, Math.round(ms / 60_000));
    if (minutes < 60) return relativeTime.format(minutes, "minute");
    const hours = Math.round(minutes / 60);
    if (hours < 48) return relativeTime.format(hours, "hour");
    return relativeTime.format(Math.round(hours / 24), "day");
}
