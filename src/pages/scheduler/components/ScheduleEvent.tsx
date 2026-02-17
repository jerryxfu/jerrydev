import React, {useEffect, useState} from "react";
import {ScheduleEvent as ScheduleEventType} from "../../../types/schedule";
import {timeToMinutes} from "../timeUtils.ts";
import "./ScheduleEvent.scss";

interface ScheduleEventProps {
    event: ScheduleEventType;
    isCurrent?: boolean;
    isNext?: boolean;
    baseStartMinutes?: number; // minutes from 00:00 for the top of the grid
    minuteHeight?: number; // px per minute
    isHomeIsland?: boolean; // explicit prop so truncation works on first render
}

const ScheduleEvent: React.FC<ScheduleEventProps> = (
    {event, isCurrent = false, isNext = false, baseStartMinutes = 8 * 60, minuteHeight = 40 / 60, isHomeIsland}) => {
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

    // Responsive title truncation
    const [isNarrow, setIsNarrow] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        return window.innerWidth <= 768;
    });

    useEffect(() => {
        const onResize = () => setIsNarrow(window.innerWidth <= 768);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const MAX_HOME_TITLE = 26;
    const MAX_MOBILE_TITLE = 30;

    // Truncate long titles in home island mode or on a narrow viewport
    let displayTitle = event.title;
    if (event.title) {
        if (isHomeIsland && event.title.length > MAX_HOME_TITLE) {
            displayTitle = `${event.title.slice(0, MAX_HOME_TITLE)}...`;
        } else if (!isHomeIsland && isNarrow && event.title.length > MAX_MOBILE_TITLE) {
            displayTitle = `${event.title.slice(0, MAX_MOBILE_TITLE)}...`;
        } else {
            displayTitle = event.title;
        }
    }

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
                <div className="schedule-event__left">
                    <div className="schedule-event__title" title={event.title} aria-label={event.title}>{displayTitle}</div>
                    {event.location && (
                        <div className="schedule-event__location">{event.location}</div>
                    )}
                </div>
                <div className="schedule-event__time">
                    <p>{event.startTime}-{event.endTime} ({durationLabel})</p>
                    <p>{isCurrent ? `Ends in ${timeRemaining}` : `Starts in ${timeUntil}`}</p>
                </div>
            </div>
        </div>
    );
};

export default ScheduleEvent;
