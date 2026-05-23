export type ViewMode = "idle" | "creating" | "created" | "joining" | "responding" | "result";

export type Granularity = "day" | 15 | 30 | 60;

export const GRANULARITY_OPTIONS: { label: string; value: Granularity }[] = [
    {label: "Full day", value: "day"},
    {label: "15 min", value: 15},
    {label: "30 min", value: 30},
    {label: "1 hour", value: 60},
];

export const TTL_PRESETS: { label: string; value: number }[] = [
    {label: "1h", value: 3_600_000},
    {label: "6h", value: 21_600_000},
    {label: "24h", value: 86_400_000},
    {label: "3d", value: 259_200_000},
    {label: "7d", value: 604_800_000},
];

export interface EventSettings {
    title: string;
    dates: string[];           // ISO date strings, e.g. "2026-05-25"
    timeStart: string;         // "09:00"
    timeEnd: string;           // "21:00"
    granularity: Granularity;
    ttlMs: number;
}

export const DEFAULT_SETTINGS: EventSettings = {
    title: "",
    dates: [],
    timeStart: "09:00",
    timeEnd: "21:00",
    granularity: 30,
    ttlMs: 259_200_000, // 3 days
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
    responses: EventResponse[];
    createdAt: string;
    expiresAt: string;
}