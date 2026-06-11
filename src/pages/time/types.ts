export type TabId = "unix" | "countdown" | "stopwatch" | "calculator" | "local";

export interface Tab {
    id: TabId;
    label: string;
}

export const TABS: Tab[] = [
    {id: "unix", label: "Unix"},
    {id: "countdown", label: "Countdown"},
    {id: "stopwatch", label: "Stopwatch"},
    {id: "calculator", label: "Date calc"},
    {id: "local", label: "Local time"},
];