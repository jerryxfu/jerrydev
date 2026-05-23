import {type Granularity} from "./types.ts";

/**
 * Generate time slot labels between start and end at given granularity.
 * Returns array of "HH:MM" strings.
 */
export function generateTimeSlots(start: string, end: string, granularity: Granularity): string[] {
    if (granularity === "day") return ["00:00"];

    const slots: string[] = [];
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
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
    if (selectedDates.length === 0) return [];

    const sorted = [...selectedDates].sort();
    const min = new Date(sorted[0] + "T00:00:00");
    const max = new Date(sorted[sorted.length - 1] + "T00:00:00");
    const selectedSet = new Set(sorted);
    const result: { date: string; isSelected: boolean }[] = [];

    for (let d = new Date(min); d <= max; d.setDate(d.getDate() + 1)) {
        const iso = d.toISOString().split("T")[0];
        result.push({date: iso, isSelected: selectedSet.has(iso)});
    }

    return result;
}

/**
 * Format a date string to a short display, e.g. "Mon 26"
 */
export function formatDateShort(dateStr: string): { day: string; date: number; month: string } {
    const d = new Date(dateStr + "T00:00:00");
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return {
        day: days[d.getDay()],
        date: d.getDate(),
        month: months[d.getMonth()],
    };
}

/**
 * Format time "14:00" to "2 PM" or "14:30" to "2:30 PM"
 */
export function formatTime12h(time: string): string {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, "0")} ${period}`;
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
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "expired";
    const hours = Math.floor(diff / 3_600_000);
    if (hours < 1) return `${Math.floor(diff / 60_000)}m`;
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
 * Generate a calendar month grid for a date picker.
 * Returns weeks (arrays of Date | null for padding).
 */
export function getCalendarMonth(year: number, month: number): (Date | null)[][] {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const weeks: (Date | null)[][] = [];
    let week: (Date | null)[] = [];

    // Pad start
    for (let i = 0; i < firstDay.getDay(); i++) {
        week.push(null);
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
        week.push(new Date(year, month, d));
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

/**
 * Convert a Date to ISO date string "YYYY-MM-DD"
 */
export function toISODate(d: Date): string {
    return d.toISOString().split("T")[0];
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
    if (selectedDates.length === 0) return [];

    const selectedSet = new Set(selectedDates);
    const sorted = [...selectedDates].sort();

    // Find the Monday of the earliest date's week and Sunday of the latest
    const firstDate = new Date(sorted[0] + "T00:00:00");
    const lastDate = new Date(sorted[sorted.length - 1] + "T00:00:00");

    // getDay: 0=Sun,1=Mon,...,6=Sat → convert to 0=Mon,...,6=Sun
    const toMondayBased = (d: Date) => (d.getDay() + 6) % 7;

    const monday = new Date(firstDate);
    monday.setDate(monday.getDate() - toMondayBased(firstDate));

    const sunday = new Date(lastDate);
    sunday.setDate(sunday.getDate() + (6 - toMondayBased(lastDate)));

    // Build all weeks in range
    const allWeeks: WeekCell[][] = [];
    const weekStart = new Date(monday);

    while (weekStart <= sunday) {
        const week: WeekCell[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            const iso = toISODate(d);
            week.push({
                date: iso,
                isSelected: selectedSet.has(iso),
                dayOfWeek: i,
            });
        }
        allWeeks.push(week);
        weekStart.setDate(weekStart.getDate() + 7);
    }

    // Filter to only weeks containing at least one selected date
    return allWeeks.filter(week => week.some(cell => cell.isSelected));
}