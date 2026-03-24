import React from "react";
import {BreakPeriod, Schedule as ScheduleType} from "../../../types/schedule";
import ScheduleEvent from "./ScheduleEvent";
import {getNextEvent, minutesToTime, timeToMinutes} from "../timeUtils.ts";
import TimeColumn from "./TimeColumn";
import "./Schedule.scss";

interface ScheduleProps {
    schedule: ScheduleType;
    startTime?: string;
    endTime?: string;
    slotMinutes?: number;
    breakPeriods?: BreakPeriod[];
    showBreaks?: boolean;
}

const MINUTE_HEIGHT = 0.94;

/** Convert schedule.timeSlots config into the format TimeColumn expects */
const mapTimeSlots = (schedule: ScheduleType) =>
    schedule.timeSlots?.map(s => {
        const startLabel = `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`;
        const hasEnd = s.endHour != null && s.endMinute != null;

        const slot: { time: string; label?: string; endTime?: string; endLabel?: string } = {
            time: startLabel,
            label: s.label ?? startLabel,
        };

        if (hasEnd) {
            slot.endTime = minutesToTime(s.endHour! * 60 + s.endMinute!);
            const computedEndLabel = `${String(s.endHour).padStart(2, "0")}:${String(s.endMinute).padStart(2, "0")}`;
            slot.endLabel = s.endLabel ?? computedEndLabel;
        }

        return slot;
    });

const Schedule: React.FC<ScheduleProps> = ({schedule, startTime, endTime, slotMinutes, breakPeriods = [], showBreaks = false}) => {
    const displayStart = startTime ?? schedule.startTime ?? "08:00";
    const displayEnd = endTime ?? schedule.endTime ?? "18:00";
    const displaySlotMinutes = slotMinutes ?? schedule.slotMinutes ?? 60;
    const explicitSlots = mapTimeSlots(schedule);

    const baseStartMinutes = timeToMinutes(displayStart);
    const baseEndMinutes = timeToMinutes(displayEnd);
    const containerHeight = Math.max(0, (baseEndMinutes - baseStartMinutes) * MINUTE_HEIGHT);

    const nextEvent = getNextEvent(schedule.events);

    return (
        <div className="schedule">
            <div className="schedule_header">
                <h3 className="schedule_title">{schedule.name}</h3>
            </div>

            <div className="schedule_container">
                <div className="schedule_time-column">
                    <TimeColumn
                        startTime={displayStart}
                        endTime={displayEnd}
                        slotMinutes={displaySlotMinutes}
                        minuteHeight={MINUTE_HEIGHT}
                        {...(explicitSlots && {slots: explicitSlots})}
                    />
                </div>

                <div className="schedule_grid" style={{height: `${containerHeight}px`}}>
                    {/* Break periods (comparison mode) */}
                    {showBreaks && breakPeriods.map((bp, i) => {
                        const startMin = timeToMinutes(bp.startTime);
                        const endMin = timeToMinutes(bp.endTime);
                        const duration = Math.max(0, endMin - startMin);
                        const top = Math.max(0, startMin - baseStartMinutes) * MINUTE_HEIGHT;
                        const height = Math.max(2, duration * MINUTE_HEIGHT);

                        return (
                            <div
                                key={`break-${i}`}
                                className="schedule-break"
                                style={{top: `${top}px`, height: `${height}px`}}
                            >
                                <div className="schedule-break_content">
                                    <span className="schedule-break_label">Free</span>
                                    <span className="schedule-break_time">
                                        {bp.startTime}-{bp.endTime}
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    {/* Events */}
                    {schedule.events.map(event => (
                        <ScheduleEvent
                            key={event.id}
                            event={event}
                            isNext={nextEvent?.id === event.id}
                            baseStartMinutes={baseStartMinutes}
                            minuteHeight={MINUTE_HEIGHT}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Schedule;
