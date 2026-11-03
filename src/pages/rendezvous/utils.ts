import {type Granularity} from "./types.ts";

/**
 * Generate time slot labels between start and end at given granularity.
 * Returns array of "HH:MM" strings.
 */
export function generateTimeSlots(start: string, end: string, granularity: Granularity): string[] {
    if (granularity === "day") return ["00:00"];
    if (granularity === "half") return ["00:00", "12:00"];

    const slots: string[] = [];
    const [startH = 0, startM = 0] = start.split(":").map(Number);
    const [endH = 0, endM = 0] = end.split(":").map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    for (let m = startMin; m < endMin; m += granularity) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
    }
    return slots;
}

/**
 * Build a slot key from a date and time, e.g. "2026-05-25T14:00"
 */
export function slotKey(date: string, time: string): string {
    return `${date}T${time}`;
}

/**
 * Get all dates between min and max of selected dates (inclusive), for display.
 * Returns {date: string, isSelected: boolean}[]
 */
export function getDateRange(selectedDates: string[]): { date: string; isSelected: boolean }[] {
    const sorted = [...selectedDates].sort();
    const [first] = sorted;
    const last = sorted.at(-1);
    if (!first || !last) return [];
    const selectedSet = new Set(sorted);
    const result: { date: string; isSelected: boolean }[] = [];
    for (let d = Temporal.PlainDate.from(first); Temporal.PlainDate.compare(d, last) <= 0; d = d.add({days: 1})) {
        const iso = d.toString();
        result.push({date: iso, isSelected: selectedSet.has(iso)});
    }
    return result;
}

/**
 * Format a date string to a short display, e.g. "Mon 26"
 */
export function formatDateShort(dateStr: string): { day: string; date: number; month: string } {
    const d = Temporal.PlainDate.from(dateStr);
    return {
        day: d.toLocaleString("en-US", {weekday: "short"}),
        date: d.day,
        month: d.toLocaleString("en-US", {month: "short"}),
    };
}

/**
 * Format time "14:00" to "2 PM" or "14:30" to "2:30 PM"
 */
export function formatTime12h(time: string): string {
    const [h = 0, m = 0] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * A slot's time on the viewer's clock, for an event made in another time zone: "8 PM" for the event's "2 PM". `day` is
 * 1 when that's already the next day for the viewer, -1 the day before. Null when there's nothing to convert: an event
 * from before time zones were kept, or one whose clock reads as the viewer's that day.
 */
export function viewerTime(date: string, time: string, timeZone?: string): { time: string; day: number } | null {
    if (!timeZone) return null;
    const theirs = Temporal.PlainDateTime.from(`${date}T${time}`).toZonedDateTime(timeZone);
    const mine = theirs.withTimeZone(Temporal.Now.timeZoneId());
    if (mine.offsetNanoseconds === theirs.offsetNanoseconds) return null;
    return {
        time: formatTime12h(mine.toPlainTime().toString({smallestUnit: "minute"})),
        day: Temporal.PlainDate.from(date).until(mine.toPlainDate()).days,
    };
}

/**
 * A time zone as people say it: "Eastern Time", "Central European Time". Named as of now: at another moment Intl may give
 * the zone's standard-time name instead (Paris in 1970: "Central European Standard Time"). UTC it calls "GMT+00:00".
 */
export function zoneName(timeZone: string): string {
    if (timeZone === "UTC") return "UTC";
    const parts = new Intl.DateTimeFormat("en-US", {timeZone, timeZoneName: "longGeneric"}).formatToParts(Date.now());
    return parts.find(p => p.type === "timeZoneName")?.value ?? timeZone;
}

/**
 * Format duration in ms to human readable
 */
export function formatDuration(ms: number): string {
    const hours = ms / 3_600_000;
    if (hours < 24) return `${hours}h`;
    const days = hours / 24;
    return `${days}d`;
}

/**
 * Time remaining until an expiration date
 */
export function timeUntil(expiresAt: string): string {
    const left = Temporal.Now.instant().until(Temporal.Instant.from(expiresAt));
    if (left.sign <= 0) return "expired";
    const hours = Math.floor(left.total("hours"));
    if (hours < 1) return `${Math.floor(left.total("minutes"))}m`;
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

/**
 * Build the shareable URL for an event
 */
export function getEventUrl(code: string): string {
    return `${window.location.origin}/rendezvous?code=${code}`;
}

/**
 * Generate a calendar month grid for a date picker, weeks from Sunday.
 * Returns weeks (arrays of PlainDate | null for padding).
 */
export function getCalendarMonth(month: Temporal.PlainYearMonth): (Temporal.PlainDate | null)[][] {
    const weeks: (Temporal.PlainDate | null)[][] = [];
    // dayOfWeek counts Monday as 1 and Sunday as 7: the 1st's place in a week from Sunday.
    let week: (Temporal.PlainDate | null)[] = Array.from({length: month.toPlainDate({day: 1}).dayOfWeek % 7}, () => null);

    for (let d = 1; d <= month.daysInMonth; d++) {
        week.push(month.toPlainDate({day: d}));
        if (week.length === 7) {
            weeks.push(week);
            week = [];
        }
    }

    // Pad end
    if (week.length > 0) {
        while (week.length < 7) week.push(null);
        weeks.push(week);
    }

    return weeks;
}

export interface WeekCell {
    date: string;         // ISO date
    isSelected: boolean;  // part of the event's selected dates
    dayOfWeek: number;    // 0=Mon, 1=Tue, ..., 6=Sun
}

/**
 * Group selected dates into Mon–Sun week rows.
 * Only returns weeks containing at least one selected date.
 * Each week is padded to 7 cells with context days.
 */
export function getWeekRows(selectedDates: string[]): WeekCell[][] {
    const sorted = [...selectedDates].sort();
    const [first] = sorted;
    const last = sorted.at(-1);
    if (!first || !last) return [];
    const selectedSet = new Set(sorted);

    // The Monday of the earliest date's week and the Sunday of the latest (dayOfWeek: Monday 1, Sunday 7)
    const firstDate = Temporal.PlainDate.from(first);
    const lastDate = Temporal.PlainDate.from(last);
    const monday = firstDate.subtract({days: firstDate.dayOfWeek - 1});
    const sunday = lastDate.add({days: 7 - lastDate.dayOfWeek});

    // Build all weeks in range
    const allWeeks: WeekCell[][] = [];
    for (let weekStart = monday; Temporal.PlainDate.compare(weekStart, sunday) <= 0; weekStart = weekStart.add({weeks: 1})) {
        const start = weekStart;
        allWeeks.push(Array.from({length: 7}, (_, i) => {
            const iso = start.add({days: i}).toString();
            return {date: iso, isSelected: selectedSet.has(iso), dayOfWeek: i};
        }));
    }

    // Filter to only weeks containing at least one selected date
    return allWeeks.filter(week => week.some(cell => cell.isSelected));
}
