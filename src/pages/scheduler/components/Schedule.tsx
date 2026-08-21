import React from "react";
import {type BreakPeriod, type Schedule as ScheduleType} from "../../../types/schedule";
import {getScheduleGeometry} from "../timeUtils.ts";
import TimeColumn from "./TimeColumn";
import DayColumn from "./DayColumn";
import "./Schedule.scss";

interface ScheduleProps {
    schedule: ScheduleType;
    startTime?: string;
    endTime?: string;
    slotMinutes?: number;
    breakPeriods?: BreakPeriod[];
    showBreaks?: boolean;
    isToday?: boolean;
    nowMinutes: number;
    /** Selected day key, used to keep React keys unique across days. */
    dayKey?: string;
}

/** Single-day view: one time column, one day of events. */
const Schedule: React.FC<ScheduleProps> = (
    {
        schedule,
        startTime,
        endTime,
        slotMinutes,
        breakPeriods = [],
        showBreaks = false,
        isToday = false,
        nowMinutes,
        dayKey = "",
    }) => {
    const geometry = getScheduleGeometry(schedule, {
        ...(startTime && {startTime}),
        ...(endTime && {endTime}),
        ...(slotMinutes && {slotMinutes}),
    });

    return (
        <div className="schedule">
            <div className="schedule_header">
                <h3 className="schedule_title">{schedule.name}</h3>
            </div>

            <div className="schedule_container">
                <div className="schedule_time-column">
                    <TimeColumn
                        tiles={geometry.tiles}
                        startMinutes={geometry.startMinutes}
                        minuteHeight={geometry.minuteHeight}
                        height={geometry.height}
                    />
                </div>

                <DayColumn
                    events={schedule.events}
                    tiles={geometry.tiles}
                    startMinutes={geometry.startMinutes}
                    endMinutes={geometry.endMinutes}
                    minuteHeight={geometry.minuteHeight}
                    height={geometry.height}
                    nowMinutes={nowMinutes}
                    isToday={isToday}
                    breakPeriods={breakPeriods}
                    showBreaks={showBreaks}
                    dayKey={dayKey}
                />
            </div>
        </div>
    );
};

export default Schedule;
