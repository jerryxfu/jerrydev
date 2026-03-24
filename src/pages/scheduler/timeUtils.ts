import {ScheduleEvent, BreakPeriod} from "../../types/schedule.ts";

// Time conversions
export const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
};

export const minutesToTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

export const getNowMinutes = (): number => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
};

export const getCurrentTime = (): string => minutesToTime(getNowMinutes());

/** Human-friendly duration label: "1h30m", "2h", "45m" */
export const formatDuration = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const mm = String(m).padStart(2, "0");
    if (h && m) return `${h}h${mm}m`;
    if (h) return `${h}h`;
    return `${m}m`;
};

// Event status helpers
export type EventStatus = "current" | "next" | "ended" | "upcoming";

export interface EventTimeInfo {
    status: EventStatus;
    /** e.g. "Ends in 30m" / "Starts in 1h" / "Ended 15m ago" */
    statusLabel: string;
    durationLabel: string;
}

export const getEventTimeInfo = (event: ScheduleEvent, isNext: boolean): EventTimeInfo => {
    const now = getNowMinutes();
    const start = timeToMinutes(event.startTime);
    const end = timeToMinutes(event.endTime);
    const durationLabel = formatDuration(Math.max(0, end - start));

    if (now >= start && now < end) {
        return {status: "current", statusLabel: `Ends in ${formatDuration(end - now)}`, durationLabel};
    }
    if (now >= end) {
        return {status: "ended", statusLabel: `Ended ${formatDuration(now - end)} ago`, durationLabel};
    }
    return {
        status: isNext ? "next" : "upcoming",
        statusLabel: `Starts in ${formatDuration(start - now)}`,
        durationLabel,
    };
};

export const isCurrentEvent = (event: ScheduleEvent): boolean => {
    const now = getNowMinutes();
    return now >= timeToMinutes(event.startTime) && now < timeToMinutes(event.endTime);
};

export const getNextEvent = (events: ScheduleEvent[]): ScheduleEvent | null => {
    const now = getNowMinutes();
    return events
        .filter(e => timeToMinutes(e.startTime) > now)
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))[0] ?? null;
};

// Time slot builder
interface SlotInput {
    time: string;
    label?: string;
    endTime?: string;
    endLabel?: string;
}

interface TimeSlot {
    time: string;
    label?: string;
    endLabel?: string;
    startMinutes: number;
    endMinutes: number;
}

export const buildTimeSlots = ({startTime = "08:00", endTime = "18:00", slotMinutes = 60, slots}: {
    startTime?: string;
    endTime?: string;
    slotMinutes?: number;
    slots?: SlotInput[];
}): TimeSlot[] => {
    const rangeStart = timeToMinutes(startTime);
    const rangeEnd = timeToMinutes(endTime);

    if (slots?.length) {
        const hasExplicitEnds = slots.some(s => s.endTime !== undefined);
        const result = hasExplicitEnds
            ? buildFromExplicitEnds(slots, rangeStart, rangeEnd)
            : buildFromBoundaries(slots, rangeStart, rangeEnd);
        if (result.length > 0) return result;
    }

    return buildUniform(rangeStart, rangeEnd, slotMinutes);
};

function buildFromExplicitEnds(slots: SlotInput[], rangeStart: number, rangeEnd: number): TimeSlot[] {
    const sorted = slots
        .map(s => ({...s, startMin: timeToMinutes(s.time), endMin: s.endTime ? timeToMinutes(s.endTime) : undefined}))
        .filter(s => !isNaN(s.startMin))
        .sort((a, b) => a.startMin - b.startMin);

    const result: TimeSlot[] = [];
    for (let i = 0; i < sorted.length; i++) {
        const item = sorted[i]!;
        const end = item.endMin ?? sorted[i + 1]?.startMin;
        if (end === undefined || end <= item.startMin) continue;

        const cStart = Math.max(rangeStart, item.startMin);
        const cEnd = Math.min(rangeEnd, end);
        if (cEnd <= cStart) continue;

        const slot: TimeSlot = {
            time: minutesToTime(cStart),
            startMinutes: cStart,
            endMinutes: cEnd,
        };
        if (item.label !== undefined) slot.label = item.label;
        if (item.endLabel !== undefined) slot.endLabel = item.endLabel;
        result.push(slot);
    }
    return result;
}

function buildFromBoundaries(slots: SlotInput[], rangeStart: number, rangeEnd: number): TimeSlot[] {
    const boundaries = slots
        .map((s) => ({...s, minutes: timeToMinutes(s.time)}))
        .filter((s) => !isNaN(s.minutes) && s.minutes >= rangeStart && s.minutes <= rangeEnd)
        .sort((a, b) => a.minutes - b.minutes);

    const result: TimeSlot[] = [];
    for (let i = 0; i + 1 < boundaries.length; i++) {
        const current = boundaries[i]!;
        const next = boundaries[i + 1]!;
        const slot: TimeSlot = {
            time: minutesToTime(current.minutes),
            startMinutes: current.minutes,
            endMinutes: next.minutes,
        };
        if (current.label !== undefined) slot.label = current.label;
        if ((current as any).endLabel !== undefined) slot.endLabel = (current as any).endLabel;
        result.push(slot);
    }
    return result;
}

function buildUniform(rangeStart: number, rangeEnd: number, slotMinutes: number): TimeSlot[] {
    const low = Math.min(rangeStart, rangeEnd);
    const high = Math.max(rangeStart, rangeEnd);
    const result: TimeSlot[] = [];
    for (let minutes = low; minutes < high; minutes += slotMinutes) {
        result.push({time: minutesToTime(minutes), startMinutes: minutes, endMinutes: Math.min(minutes + slotMinutes, high)});
    }
    return result;
}

// Comparison helpers

export const findCommonBreaksInRange = (
    schedule1: ScheduleEvent[],
    schedule2: ScheduleEvent[],
    startTime: string,
    endTime: string,
    stepMinutes: number = 30,
): BreakPeriod[] => {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    if (end <= start || stepMinutes <= 0) return [];

    const overlaps = (events: ScheduleEvent[], slotStart: number, slotEnd: number) =>
        events.some((e) => timeToMinutes(e.startTime) < slotEnd && timeToMinutes(e.endTime) > slotStart);

    const breaks: BreakPeriod[] = [];
    for (let minutes = start; minutes < end; minutes += stepMinutes) {
        const next = Math.min(minutes + stepMinutes, end);
        if (!overlaps(schedule1, minutes, next) && !overlaps(schedule2, minutes, next)) {
            const last = breaks[breaks.length - 1];
            if (last?.endTime === minutesToTime(minutes)) {
                last.endTime = minutesToTime(next);
            } else {
                breaks.push({startTime: minutesToTime(minutes), endTime: minutesToTime(next)});
            }
        }
    }
    return breaks;
};
