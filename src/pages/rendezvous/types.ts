// Whole days, parts of the day, or slots of 30 or 60 minutes.
export type Granularity = "day" | "parts" | 30 | 60;

export const WHEN_OPTIONS: { label: string; value: Granularity }[] = [
    {label: "Any time", value: "day"},
    {label: "Morning, afternoon, evening", value: "parts"},
    {label: "By the hour", value: 60},
    {label: "By 30 min", value: 30},
];

// The parts of a day, as words: never converted between time zones, as whole days aren't. The times are only their keys.
export const PARTS: { time: string; label: string }[] = [
    {time: "09:00", label: "Morning"},
    {time: "13:00", label: "Afternoon"},
    {time: "18:00", label: "Evening"},
];

export interface EventSettings {
    title: string;
    dates: string[];           // ISO date strings, e.g. "2026-05-25"
    timeStart: string;         // "09:00"
    timeEnd: string;           // "21:00"
    granularity: Granularity;
}

export const DEFAULT_SETTINGS: EventSettings = {
    title: "",
    dates: [],
    timeStart: "09:00",
    timeEnd: "21:00",
    granularity: "day",
};

export interface EventResponse {
    name: string;
    slots: string[];           // slot keys like "2026-05-25T14:00"
    submittedAt: string;
}

export interface EventMeta {
    code: string;
    title: string;
    dates: string[];
    timeStart: string;
    timeEnd: string;
    granularity: Granularity;
    // The creator's time zone ("America/Toronto"): the slots' times are on its clock. Absent on events from before Nov 2026.
    timeZone?: string;
    responses: EventResponse[];
    createdAt: string;
    expiresAt: string;
}
