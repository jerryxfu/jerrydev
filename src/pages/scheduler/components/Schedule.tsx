import React from "react";
import {BreakPeriod, Schedule as ScheduleType} from "../../../types/schedule";
import ScheduleEvent from "./ScheduleEvent";
import {getNextEvent, isCurrentEvent, minutesToTime, timeToMinutes} from "../timeUtils.ts";
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

        const label = `${s.hour.toString().padStart(2, "0")}:${s.minute.toString().padStart(2, "0")}`;

        const endLabel = (s.endHour != null && s.endMinute != null && end !== undefined)
            ? `${String(s.endHour).padStart(2, "0")}:${String(s.endMinute).padStart(2, "0")}`
            : undefined;

        const slot: { time: string; label?: string; endTime?: string; endLabel?: string } = {
            time: minutesToTime(start)
        };

        slot.label = s.label ?? label;
        if (end !== undefined) slot.endTime = minutesToTime(end);
        const finalEndLabel = s.endLabel ?? endLabel;
        if (finalEndLabel !== undefined) slot.endLabel = finalEndLabel;
        return slot;
    });

    const baseStartMinutes = timeToMinutes(displayStart);
    const baseEndMinutes = timeToMinutes(displayEnd);
    const minuteHeight = 0.94;
    const containerHeight = Math.max(0, (baseEndMinutes - baseStartMinutes) * minuteHeight);

    const nextEvent = getNextEvent(schedule.events);

    return (
        <div className="schedule">
            <div className="schedule_header">
                <h3 className="schedule_title">{schedule.name}</h3>
                {/*<Transit userSchedule={schedule} />*/}
            </div>
            <div className="schedule_container">
                {/* Time Column */}
                <div className="schedule_time-column">
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
                    className="schedule_grid"
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
                                <div className="schedule-break_content">
                                    <span className="schedule-break_label">Free</span>
                                    <span className="schedule-break_time">
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