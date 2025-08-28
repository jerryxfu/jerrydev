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
    const startMinutes = timeToMinutes(event.startTime);
    const endMinutes = timeToMinutes(event.endTime);
    const duration = Math.max(0, endMinutes - startMinutes);

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
                backgroundColor: event.color || "#e6e6e6",
            }}
        >
            <div className="schedule-event__content">
                <div className="schedule-event__title">{event.title}</div>
                <div className="schedule-event__time">
                    {event.startTime}-{event.endTime}
                </div>
                {event.location && (
                    <div className="schedule-event__location">{event.location}</div>
                )}
            </div>
        </div>
    );
};

export default ScheduleEvent;
