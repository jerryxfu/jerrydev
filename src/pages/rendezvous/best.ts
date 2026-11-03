import {type EventMeta, PARTS} from "./types.ts";
import {formatDateShort, formatTime12h, generateTimeSlots, slotKey, zoneName} from "./utils.ts";

/** A stretch of one day with the same people free: a whole day, a part of it, or slots side by side. */
export interface Stretch {
    date: string;
    start: string;      // HH:MM, the first slot's
    end: string;        // HH:MM, after the last slot (slots at a time of day only)
    names: string[];
}

/** Who is free in each slot, by slot key. */
export function freeAt(event: EventMeta): Map<string, string[]> {
    const free = new Map<string, string[]>();
    for (const r of event.responses) {
        for (const s of r.slots) free.set(s, [...free.get(s) ?? [], r.name]);
    }
    return free;
}

const sameNames = (a: string[], b: string[]) => a.length === b.length && a.every(n => b.includes(n));
const later = (time: string, minutes: number) => Temporal.PlainTime.from(time).add({minutes}).toString({smallestUnit: "minute"});

/** The best times: the most people free first, then the longest stretch, then the soonest. */
export function bestTimes(event: EventMeta, count = 3): Stretch[] {
    const free = freeAt(event);
    const step = typeof event.granularity === "number" ? event.granularity : 0;
    const times = generateTimeSlots(event.timeStart, event.timeEnd, event.granularity);

    // Slots side by side join while the same people are free; days and parts stay one each.
    const stretches: Stretch[] = [];
    for (const date of event.dates) {
        let run: Stretch | null = null;
        for (const time of times) {
            const names = free.get(slotKey(date, time)) ?? [];
            if (run && step && sameNames(run.names, names)) {
                run.end = later(time, step);
                continue;
            }
            if (run?.names.length) stretches.push(run);
            run = {date, start: time, end: later(time, step), names};
        }
        if (run?.names.length) stretches.push(run);
    }

    const minutes = (s: Stretch) => Temporal.PlainTime.from(s.start).until(s.end).total("minutes");
    return stretches
        .sort((a, b) => b.names.length - a.names.length || minutes(b) - minutes(a) ||
            slotKey(a.date, a.start).localeCompare(slotKey(b.date, b.start)))
        .slice(0, count);
}

/** Who's free, as a line says it: "everyone (6)", "5 of 6, not Alex", "3 of 8". */
export function whoText(event: EventMeta, s: Stretch): string {
    const all = event.responses.map(r => r.name);
    const missing = all.filter(n => !s.names.includes(n));
    if (missing.length === 0) return all.length === 1 ? s.names[0] ?? "" : `everyone (${all.length})`;
    const of = `${s.names.length} of ${all.length}`;
    return missing.length <= 3 ? `${of}, not ${missing.join(", ")}` : of;
}

/** When, as text, on the event's own clock: "Sat, Nov 14", "Sat, Nov 14, evening", "Sat, Nov 14, 7 PM to 9 PM". */
export function whenText(event: EventMeta, s: Stretch): string {
    const {day, month, date} = formatDateShort(s.date);
    const on = `${day}, ${month} ${date}`;
    if (event.granularity === "day") return on;
    if (event.granularity === "parts") return `${on}, ${(PARTS.find(p => p.time === s.start)?.label ?? "").toLowerCase()}`;
    return `${on}, ${formatTime12h(s.start)} to ${formatTime12h(s.end)}`;
}

// The event's clock reads differently from this one's: its times then say whose they are.
function otherClock(event: EventMeta): boolean {
    const date = event.dates[0];
    if (!event.timeZone || !date || typeof event.granularity !== "number") return false;
    const at = Temporal.PlainDateTime.from(`${date}T12:00`);
    return at.toZonedDateTime(event.timeZone).offsetNanoseconds !== at.toZonedDateTime(Temporal.Now.timeZoneId()).offsetNanoseconds;
}

/** The best times, to paste in the chat: the title, a line each, the link. */
export function summaryText(event: EventMeta, stretches: Stretch[], url: string): string {
    const title = otherClock(event) && event.timeZone ? `${event.title} (${zoneName(event.timeZone)})` : event.title;
    return [title, ...stretches.map(s => `${whenText(event, s)}: ${whoText(event, s)}`), url].join("\n");
}

// A moment on the event's clock, as Unix seconds.
function unix(event: EventMeta, date: string, time: string): number {
    const zone = event.timeZone ?? Temporal.Now.timeZoneId();
    return Math.floor(Temporal.PlainDateTime.from(`${date}T${time}`).toZonedDateTime(zone).epochMilliseconds / 1000);
}

/** The same for Discord (slots at a time of day only): its timestamps show each reader their own time. */
export function discordText(event: EventMeta, stretches: Stretch[], url: string): string {
    const lines = stretches.map(s =>
        `<t:${unix(event, s.date, s.start)}:f> to <t:${unix(event, s.date, s.end)}:t>: ${whoText(event, s)}`
    );
    return [event.title, ...lines, url].join("\n");
}
