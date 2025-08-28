import React from "react";
import {Schedule as ScheduleType, BreakPeriod} from "../../../types/schedule";
import ScheduleEvent from "./ScheduleEvent";
import {isCurrentEvent, getNextEvent, timeToMinutes, minutesToTime} from "../timeUtils.ts";
import TimeColumn from "./TimeColumn";
import "./Schedule.scss";

interface ScheduleProps {
    schedule: ScheduleType;
    // Optional overrides for display range and slot generation
    startTime?: string; // "HH:MM"
    endTime?: string;   // "HH:MM"
    slotMinutes?: number;
    breakPeriods?: BreakPeriod[];
    showBreaks?: boolean;
}

const Schedule: React.FC<ScheduleProps> = (
    {schedule, startTime, endTime, slotMinutes, breakPeriods = [], showBreaks = false}) => {
    const displayStart = startTime ?? schedule.startTime ?? "08:00";
    const displayEnd = endTime ?? schedule.endTime ?? "18:00";
    const displaySlotMinutes = slotMinutes ?? schedule.slotMinutes ?? 60;
    const explicitSlots = schedule.timeSlots?.map(s => {
        const start = s.hour * 60 + s.minute;
        const end = s.endHour !== undefined && s.endMinute !== undefined ? (s.endHour * 60 + s.endMinute) : undefined;
        return {
            time: minutesToTime(start),
            label: s.label,
            ...(end !== undefined ? {endTime: minutesToTime(end)} : {}),
            ...(s.endLabel !== undefined ? {endLabel: s.endLabel} : {}),
        };
    });

    const baseStartMinutes = timeToMinutes(displayStart);
    const baseEndMinutes = timeToMinutes(displayEnd);
    const minuteHeight = 0.8; // Reduced from 1.2 to 0.8px per minute (48px per hour)
    const containerHeight = Math.max(0, (baseEndMinutes - baseStartMinutes) * minuteHeight);

    const nextEvent = getNextEvent(schedule.events);

    return (
        <div className="schedule">
            <div className="schedule__header">
                <h3 className="schedule__title">{schedule.name}</h3>
            </div>
            <div className="schedule__container">
                {/* Time Column */}
                <div className="schedule__time-column">
                    <TimeColumn
                        startTime={displayStart}
                        endTime={displayEnd}
                        slotMinutes={displaySlotMinutes}
                        minuteHeight={minuteHeight}
                        {...(explicitSlots ? {slots: explicitSlots} : {})}
                    />
                </div>

                {/* Events Grid */}
                <div
                    className="schedule__grid"
                    style={{height: `${containerHeight}px`}}
                >

                    {/* Break periods (for comparison mode) */}
                    {showBreaks && breakPeriods.map((breakPeriod, index) => {
                        const startMinutes = timeToMinutes(breakPeriod.startTime);
                        const endMinutes = timeToMinutes(breakPeriod.endTime);
                        const duration = Math.max(0, endMinutes - startMinutes);
                        const offsetFromStart = Math.max(0, startMinutes - baseStartMinutes);
                        const top = offsetFromStart * minuteHeight;
                        const height = Math.max(2, duration * minuteHeight);
                        return (
                            <div
                                key={`break-${index}`}
                                className="schedule-break"
                                style={{top: `${top}px`, height: `${height}px`}}
                            >
                                <div className="schedule-break__content">
                                    <span className="schedule-break__label">Free</span>
                                    <span className="schedule-break__time">
                                        {breakPeriod.startTime}-{breakPeriod.endTime}
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    {/* Events */}
                    {schedule.events.map((event) => (
                        <ScheduleEvent
                            key={event.id}
                            event={event}
                            isCurrent={isCurrentEvent(event)}
                            isNext={nextEvent?.id === event.id}
                            baseStartMinutes={baseStartMinutes}
                            minuteHeight={minuteHeight}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Schedule;