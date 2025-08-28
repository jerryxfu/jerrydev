import {ScheduleEvent, BreakPeriod} from "../../types/schedule.ts";

export const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
};

export const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

export const getCurrentTime = (): string => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
};

export const isCurrentEvent = (event: ScheduleEvent): boolean => {
    const now = getCurrentTime();
    const nowMinutes = timeToMinutes(now);
    const startMinutes = timeToMinutes(event.startTime);
    const endMinutes = timeToMinutes(event.endTime);

    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
};

export const getNextEvent = (events: ScheduleEvent[]): ScheduleEvent | null => {
    const now = getCurrentTime();
    const nowMinutes = timeToMinutes(now);

    const upcomingEvents = events
        .filter(event => timeToMinutes(event.startTime) > nowMinutes)
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    return upcomingEvents[0] || null;
};

// Build time slots either from explicit intervals/boundaries or from start/end with fixed slot size
export const buildTimeSlots = ({startTime = "08:00", endTime = "18:00", slotMinutes = 60, slots}: {
    startTime?: string; endTime?: string; slotMinutes?: number;
    slots?: { time: string; label?: string; endTime?: string; endLabel?: string }[];
}): Array<{ time: string; label?: string; endLabel?: string; startMinutes: number; endMinutes: number }> => {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    if (slots && slots.length > 0) {
        const anyEnd = slots.some(s => s.endTime !== undefined);
        if (anyEnd) {
            // Normalize: map and sort; then derive missing ends from next start safely
            const sorted = [...slots]
                .map(s => ({...s, start: timeToMinutes(s.time), end: s.endTime ? timeToMinutes(s.endTime) : undefined}))
                .filter(s => !isNaN(s.start))
                .sort((a, b) => a.start - b.start);

            const result: Array<{ time: string; label?: string; endLabel?: string; startMinutes: number; endMinutes: number }> = [];
            for (let i = 0; i < sorted.length; i++) {
                const startVal = sorted[i]?.start;
                if (startVal === undefined) continue;
                let endVal = sorted[i]?.end;
                if (endVal === undefined && i + 1 < sorted.length) {
                    const nextStart = sorted[i + 1]?.start;
                    if (nextStart !== undefined) endVal = nextStart;
                }
                if (endVal === undefined) continue;
                if (endVal <= startVal) continue;
                const clampedStart = Math.max(start, startVal);
                const clampedEnd = Math.min(end, endVal);
                if (clampedEnd <= clampedStart) continue;
                const entry: { time: string; label?: string; endLabel?: string; startMinutes: number; endMinutes: number } = {
                    time: minutesToTime(clampedStart),
                    startMinutes: clampedStart,
                    endMinutes: clampedEnd
                };
                const label = sorted[i]?.label;
                const endLabel = sorted[i]?.endLabel as string | undefined;
                if (label !== undefined) entry.label = label;
                if (endLabel !== undefined) entry.endLabel = endLabel;
                result.push(entry);
            }
            if (result.length > 0) return result;
        } else {
            // Boundary mode
            const boundaries = [...slots]
                .map(s => ({...s, minutes: timeToMinutes(s.time)}))
                .filter(s => !isNaN(s.minutes))
                .sort((a, b) => a.minutes - b.minutes)
                .filter(s => s.minutes >= start && s.minutes <= end);
            const result: Array<{ time: string; label?: string; endLabel?: string; startMinutes: number; endMinutes: number }> = [];
            for (let i = 0; i + 1 < boundaries.length; i++) {
                const cur = boundaries[i]!;
                const next = boundaries[i + 1]!;
                const entry: { time: string; label?: string; endLabel?: string; startMinutes: number; endMinutes: number } = {
                    time: minutesToTime(cur.minutes),
                    startMinutes: cur.minutes,
                    endMinutes: next.minutes
                };
                if (cur.label !== undefined) entry.label = cur.label;
                if ((cur as any).endLabel !== undefined) entry.endLabel = (cur as any).endLabel;
                result.push(entry);
            }
            if (result.length > 0) return result;
        }
    }

    const clampedStart = Math.min(start, end);
    const clampedEnd = Math.max(start, end);
    const out: Array<{ time: string; startMinutes: number; endMinutes: number }> = [];
    for (let m = clampedStart; m < clampedEnd; m += slotMinutes) {
        const next = Math.min(m + slotMinutes, clampedEnd);
        out.push({time: minutesToTime(m), startMinutes: m, endMinutes: next});
    }
    return out as Array<{ time: string; label?: string; endLabel?: string; startMinutes: number; endMinutes: number }>;
};

export const findCommonBreaksInRange = (
    schedule1: ScheduleEvent[],
    schedule2: ScheduleEvent[],
    startTime: string,
    endTime: string,
    stepMinutes: number = 30
): BreakPeriod[] => {
    const breaks: BreakPeriod[] = [];
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    if (end <= start || stepMinutes <= 0) return breaks;

    for (let m = start; m < end; m += stepMinutes) {
        const next = Math.min(m + stepMinutes, end);

        const hasEvent1 = schedule1.some(event =>
            timeToMinutes(event.startTime) < next && timeToMinutes(event.endTime) > m
        );

        const hasEvent2 = schedule2.some(event =>
            timeToMinutes(event.startTime) < next && timeToMinutes(event.endTime) > m
        );

        if (!hasEvent1 && !hasEvent2) {
            const currentTime = minutesToTime(m);
            const nextTime = minutesToTime(next);
            const lastBreak = breaks[breaks.length - 1];
            if (lastBreak && lastBreak.endTime === currentTime) {
                lastBreak.endTime = nextTime;
            } else {
                breaks.push({startTime: currentTime, endTime: nextTime});
            }
        }
    }

    return breaks;
};
