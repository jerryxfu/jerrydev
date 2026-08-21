import React from "react";
import {type ScheduleEvent as ScheduleEventType} from "../../../types/schedule";
import {getEventTimeInfo, MINUTE_HEIGHT, minutesToTime, timeToMinutes} from "../timeUtils.ts";
import "./ScheduleEvent.scss";

interface ScheduleEventProps {
    event: ScheduleEventType;
    isNext?: boolean;
    isToday?: boolean;
    nowMinutes: number;
    baseStartMinutes?: number;
    minuteHeight?: number;
}

const ScheduleEvent: React.FC<ScheduleEventProps> = (
    {
        event,
        isNext = false,
        isToday = false,
        nowMinutes,
        baseStartMinutes = 480,
        minuteHeight = MINUTE_HEIGHT,
    }) => {
    const startMinutes = timeToMinutes(event.startTime);
    const endMinutes = timeToMinutes(event.endTime);
    const duration = Math.max(0, endMinutes - startMinutes);

    const {status, statusLabel, durationLabel} = getEventTimeInfo(event, isNext, nowMinutes);

    // Only show time-aware statuses (current/next/ended) when viewing today
    const effectiveStatus = isToday ? status : "upcoming";
    const effectiveLabel = isToday ? statusLabel : "";

    const top = Math.max(0, startMinutes - baseStartMinutes) * minuteHeight;
    const height = Math.max(2, duration * minuteHeight);

    // Config writes both "8:30" and "13:30"; round-trip so labels line up.
    const startLabel = minutesToTime(startMinutes);
    const endLabel = minutesToTime(endMinutes);

    const className = [
        "schedule-event",
        effectiveStatus === "current" && "schedule-event--current",
        effectiveStatus === "next" && "schedule-event--next",
        effectiveStatus === "ended" && "schedule-event--ended",
    ].filter(Boolean).join(" ");

    return (
        <div
            className={className}
            style={{
                top: `${top}px`,
                height: `${height}px`,
                backgroundColor: event.color || "#e0e0e0",
            }}
        >
            <div className="schedule-event__content">
                <div className="schedule-event__title" title={event.title}>
                    {event.title}
                </div>

                <div className="schedule-event__meta">
                    <span className="schedule-event__time">{startLabel}-{endLabel} ({durationLabel})</span>
                    {event.location && (
                        <span className="schedule-event__location" title={event.location}>{event.location}</span>
                    )}
                </div>

                {effectiveLabel && <div className="schedule-event__status">{effectiveLabel}</div>}
            </div>
        </div>
    );
};

export default ScheduleEvent;
