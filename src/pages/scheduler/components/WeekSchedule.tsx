import React from "react";
import {type Schedule as ScheduleType} from "../../../types/schedule";
import {getScheduleGeometry} from "../timeUtils.ts";
import TimeColumn from "./TimeColumn";
import DayColumn from "./DayColumn";
import "./WeekSchedule.scss";

interface WeekScheduleProps {
    schedule: ScheduleType;
    days: Array<{ key: string; label: string }>;
    /** Real weekday key right now, or null if it is not in `days`. */
    todayKey: string | null;
    nowMinutes: number;
}

/**
 * Whole-week view: one shared time column on the left, one DayColumn per day.
 *
 * Every column is laid out from the same geometry object, so the day headers,
 * the time labels and the events all sit on one scale.
 */
const WeekSchedule: React.FC<WeekScheduleProps> = ({schedule, days, todayKey, nowMinutes}) => {
    const geometry = getScheduleGeometry(schedule);

    return (
        <div className="week-schedule">
            <div className="week-schedule_header">
                <div className="week-schedule_time-spacer" />
                {days.map(day => (
                    <div
                        key={day.key}
                        className={`week-schedule_day-header${day.key === todayKey ? " week-schedule_day-header-today" : ""}`}
                    >
                        <span className="week-schedule_day-name">{day.label}</span>
                        <span className="week-schedule_day-name-short">{day.label.slice(0, 3)}</span>
                    </div>
                ))}
            </div>

            <div className="week-schedule_body">
                <div className="week-schedule_time-column">
                    <TimeColumn
                        tiles={geometry.tiles}
                        startMinutes={geometry.startMinutes}
                        minuteHeight={geometry.minuteHeight}
                        height={geometry.height}
                    />
                </div>

                {days.map(day => (
                    <div
                        key={day.key}
                        className={`week-schedule_day${day.key === todayKey ? " week-schedule_day-today" : ""}`}
                    >
                        <DayColumn
                            events={schedule.events.filter(e => e.day === day.key)}
                            tiles={geometry.tiles}
                            startMinutes={geometry.startMinutes}
                            endMinutes={geometry.endMinutes}
                            minuteHeight={geometry.minuteHeight}
                            height={geometry.height}
                            nowMinutes={nowMinutes}
                            isToday={day.key === todayKey}
                            dayKey={day.key}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WeekSchedule;
