import {type BreakPeriod, type Schedule as ScheduleType, type ScheduleEvent} from "../../types/schedule.ts";

/**
 * Vertical scale of the whole scheduler, in pixels per minute.
 *
 * This is the single source of truth. It used to be duplicated as a magic 0.94
 * in Schedule, ScheduleEvent and TimeColumn, which is how the time column and
 * the event grid were able to disagree with each other.
 */
export const MINUTE_HEIGHT = 1.0;

export const DEFAULT_START_TIME = "08:00";
export const DEFAULT_END_TIME = "18:00";

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

/**
 * `nowMinutes` is passed in rather than read from the clock so the result is a
 * pure function of its inputs. Previously these read the clock during render,
 * so "Ends in 30m" froze at whatever it said when the component mounted.
 */
export const getEventTimeInfo = (event: ScheduleEvent, isNext: boolean, nowMinutes: number): EventTimeInfo => {
    const start = timeToMinutes(event.startTime);
    const end = timeToMinutes(event.endTime);
    const durationLabel = formatDuration(Math.max(0, end - start));

    if (nowMinutes >= start && nowMinutes < end) {
        return {status: "current", statusLabel: `Ends in ${formatDuration(end - nowMinutes)}`, durationLabel};
    }
    if (nowMinutes >= end) {
        return {status: "ended", statusLabel: `Ended ${formatDuration(nowMinutes - end)} ago`, durationLabel};
    }
    return {
        status: isNext ? "next" : "upcoming",
        statusLabel: `Starts in ${formatDuration(start - nowMinutes)}`,
        durationLabel,
    };
};

export const getNextEvent = (events: ScheduleEvent[], nowMinutes: number): ScheduleEvent | null => {
    return events
        .filter(e => timeToMinutes(e.startTime) > nowMinutes)
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

export const buildTimeSlots = ({startTime = DEFAULT_START_TIME, endTime = DEFAULT_END_TIME, slotMinutes = 60, slots}: {
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
        if (current.endLabel !== undefined) slot.endLabel = current.endLabel;
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

// Geometry

/**
 * One band of the vertical axis. Real slots carry labels, gaps are the dead time between them (e.g. the 10 minutes between periods).
 */
export interface TimeTile {
    startMinutes: number;
    endMinutes: number;
    label?: string;
    endLabel?: string;
    isGap: boolean;
}

/**
 * The window to draw, widened so nothing gets clipped.
 *
 * The configured 08:00-18:00 default silently cut off any event running past it.
 * Taking the union with the actual event bounds means adding a late or early class just grows the view instead of losing it.
 */
export const resolveDisplayRange = (schedule: ScheduleType): { startTime: string; endTime: string } => {
    let start = timeToMinutes(schedule.startTime ?? DEFAULT_START_TIME);
    let end = timeToMinutes(schedule.endTime ?? DEFAULT_END_TIME);

    for (const event of schedule.events) {
        start = Math.min(start, timeToMinutes(event.startTime));
        end = Math.max(end, timeToMinutes(event.endTime));
    }

    return {startTime: minutesToTime(start), endTime: minutesToTime(end)};
};

export interface ScheduleGeometry {
    startMinutes: number;
    endMinutes: number;
    /** Pixel height of the grid and of the time column. They must match. */
    height: number;
    tiles: TimeTile[];
    minuteHeight: number;
}

/** Convert a schedule's TimeSlot config into the shape buildTimeSlots expects. */
const mapConfiguredSlots = (schedule: ScheduleType): SlotInput[] | undefined =>
    schedule.timeSlots?.map(s => {
        const startLabel = `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`;
        const hasEnd = s.endHour != null && s.endMinute != null;

        const slot: SlotInput = {
            time: startLabel,
            label: s.label ?? startLabel,
        };

        if (hasEnd) {
            slot.endTime = minutesToTime(s.endHour! * 60 + s.endMinute!);
            slot.endLabel = s.endLabel ?? `${String(s.endHour).padStart(2, "0")}:${String(s.endMinute).padStart(2, "0")}`;
        }

        return slot;
    });

/**
 * Resolve every number the day and week views need to lay themselves out.
 *
 * Both views call this, so a column of time labels and a column of events can
 * no longer end up on different scales.
 */
export const getScheduleGeometry = (
    schedule: ScheduleType,
    overrides: { startTime?: string; endTime?: string; slotMinutes?: number; minuteHeight?: number; height?: number } = {},
): ScheduleGeometry => {
    const bounds = resolveDisplayRange(schedule);
    const startTime = overrides.startTime ?? bounds.startTime;
    const endTime = overrides.endTime ?? bounds.endTime;
    const slotMinutes = overrides.slotMinutes ?? schedule.slotMinutes ?? 60;

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const span = endMinutes - startMinutes;

    // `height` pins the grid to an exact pixel height and works out the scale to match,
    // which is the inverse of the usual direction.
    // Use it when the grid has to fill a container of known size (the Home Island panel)
    // rather than when a particular density is wanted. It beats minuteHeight if both are passed.
    const minuteHeight = overrides.height !== undefined && span > 0
        ? overrides.height / span
        : overrides.minuteHeight ?? MINUTE_HEIGHT;

    const configured = mapConfiguredSlots(schedule);

    const intervals = buildTimeSlots({startTime, endTime, slotMinutes, ...(configured && {slots: configured})})
        .sort((a, b) => a.startMinutes - b.startMinutes);

    // Walk the intervals and fill the holes, so the tiles tile the full range.
    const tiles: TimeTile[] = [];
    let cursor = startMinutes;

    for (const interval of intervals) {
        if (interval.startMinutes > cursor) {
            tiles.push({startMinutes: cursor, endMinutes: interval.startMinutes, isGap: true});
        }
        const tile: TimeTile = {startMinutes: interval.startMinutes, endMinutes: interval.endMinutes, isGap: false};
        if (interval.label !== undefined) tile.label = interval.label;
        if (interval.endLabel !== undefined) tile.endLabel = interval.endLabel;
        tiles.push(tile);
        cursor = interval.endMinutes;
    }
    if (cursor < endMinutes) {
        tiles.push({startMinutes: cursor, endMinutes: endMinutes, isGap: true});
    }

    return {
        startMinutes,
        endMinutes,
        height: Math.max(0, span * minuteHeight),
        tiles,
        minuteHeight,
    };
};

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
