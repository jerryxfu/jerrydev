import React from "react";
import {ScheduleEvent as ScheduleEventType} from "../../../types/schedule";
import {timeToMinutes} from "../timeUtils.ts";
import "./ScheduleEvent.scss";

interface ScheduleEventProps {
    event: ScheduleEventType;
    isCurrent?: boolean;
    isNext?: boolean;
    baseStartMinutes?: number; // minutes from 00:00 for the top of the grid
    minuteHeight?: number; // px per minute
}

const ScheduleEvent: React.FC<ScheduleEventProps> = (
    {event, isCurrent = false, isNext = false, baseStartMinutes = 8 * 60, minuteHeight = 40 / 60}) => {
    const formatTimeLabel = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        const mm = String(m).padStart(2, "0");
        if (h && m) return `${h}h${mm}m`;
        if (h) return `${h}h`;
        return `${m}m`;
    };

    const timeUntil = (() => {
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const targetMinutes = isCurrent ? timeToMinutes(event.endTime) : timeToMinutes(event.startTime);
        const diff = targetMinutes - nowMinutes;

        return formatTimeLabel(Math.max(0, diff));
    })();

    const timeRemaining = (() => {
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const endMinutes = timeToMinutes(event.endTime);
        const diff = endMinutes - nowMinutes;
        return formatTimeLabel(Math.max(0, diff));
    })();

    const startMinutes = timeToMinutes(event.startTime);
    const endMinutes = timeToMinutes(event.endTime);

    const duration = Math.max(0, endMinutes - startMinutes);

    const durationLabel = formatTimeLabel(duration);

    const offsetFromStart = Math.max(0, startMinutes - baseStartMinutes);
    const top = offsetFromStart * minuteHeight;
    const height = Math.max(2, duration * minuteHeight); // enforce minimum height for visibility

    const classNames = [
        "schedule-event",
        isCurrent && "schedule-event--current",
        isNext && "schedule-event--next"
    ].filter(Boolean).join(" ");

    return (
        <div
            className={classNames}
            style={{
                top: `${top}px`,
                height: `${height}px`,
                backgroundColor: event.color || "#e0e0e0", // default color, refer to the list in schedules.ts
            }}
        >
            <div className="schedule-event__content">
                <div className="schedule-event__title">{event.title}</div>
                <div className="schedule-event__time">
                    <p>{event.startTime}-{event.endTime} ({durationLabel})</p>
                    <p>{isCurrent ? `Ends in ${timeRemaining}` : `Starts in ${timeUntil}`}</p>
                </div>
                <div className="schedule-event__time">
                </div>
                {event.location && (
                    <div className="schedule-event__location">{event.location}</div>
                )}
            </div>
        </div>
    );
};

export default ScheduleEvent;
