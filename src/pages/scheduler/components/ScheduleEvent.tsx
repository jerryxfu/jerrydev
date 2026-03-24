import React from "react";
import {ScheduleEvent as ScheduleEventType} from "../../../types/schedule";
import {getEventTimeInfo, timeToMinutes} from "../timeUtils.ts";
import "./ScheduleEvent.scss";

interface ScheduleEventProps {
    event: ScheduleEventType;
    isNext?: boolean;
    isToday?: boolean;
    baseStartMinutes?: number;
    minuteHeight?: number;
}

const ScheduleEvent: React.FC<ScheduleEventProps> = ({event, isNext = false, isToday = false, baseStartMinutes = 480, minuteHeight = 0.94}) => {
    const startMinutes = timeToMinutes(event.startTime);
    const endMinutes = timeToMinutes(event.endTime);
    const duration = Math.max(0, endMinutes - startMinutes);

    const {status, statusLabel, durationLabel} = getEventTimeInfo(event, isNext);

    // Only show time-aware statuses (current/next/ended) when viewing today
    const effectiveStatus = isToday ? status : "upcoming";
    const effectiveLabel = isToday ? statusLabel : "";

    const top = Math.max(0, startMinutes - baseStartMinutes) * minuteHeight;
    const height = Math.max(2, duration * minuteHeight);

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
                <div className="schedule-event__left">
                    <div className="schedule-event__title" title={event.title}>
                        {event.title}
                    </div>
                    {event.location && (
                        <div className="schedule-event__location">{event.location}</div>
                    )}
                </div>
                <div className="schedule-event__time">
                    <p>{event.startTime}-{event.endTime} ({durationLabel})</p>
                    {effectiveLabel && <p>{effectiveLabel}</p>}
                </div>
            </div>
        </div>
    );
};

export default ScheduleEvent;
