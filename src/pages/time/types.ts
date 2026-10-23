import {CalendarDays, Clock, Hourglass, type LucideIcon, Radar, Timer, Wrench} from "lucide-react";

export type TabId = "time" | "countdown" | "stopwatch" | "calculator" | "sync" | "tools";

export interface Tab {
    id: TabId;
    label: string;
    icon: LucideIcon;
}

export const TABS: Tab[] = [
    {id: "time", label: "Time", icon: Clock},
    {id: "countdown", label: "Countdown", icon: Hourglass},
    {id: "stopwatch", label: "Stopwatch", icon: Timer},
    {id: "calculator", label: "Date calc", icon: CalendarDays},
    {id: "sync", label: "Sync", icon: Radar},
    {id: "tools", label: "Tools", icon: Wrench},
];
