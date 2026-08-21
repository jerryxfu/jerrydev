import React from "react";
import {type BreakPeriod, type ScheduleEvent as ScheduleEventType} from "../../../types/schedule";
import ScheduleEvent from "./ScheduleEvent";
import {getNextEvent, type TimeTile, timeToMinutes} from "../timeUtils.ts";
import "./DayColumn.scss";

interface DayColumnProps {
    events: ScheduleEventType[];
    tiles: TimeTile[];
    startMinutes: number;
    endMinutes: number;
    minuteHeight: number;
    height: number;
    nowMinutes: number;
    /** Draw the now line and let events show live status. */
    isToday?: boolean;
    breakPeriods?: BreakPeriod[];
    showBreaks?: boolean;
    /** Disambiguates React keys: event ids repeat across days. */
    dayKey?: string;
}

/**
 * One day's worth of grid: hour lines, optional common-break bands, the events,
 * and the current-time line. Shared by the single-day and week views so both
 * render a day identically.
 */
const DayColumn: React.FC<DayColumnProps> = ({
                                                 events,
                                                 tiles,
                                                 startMinutes,
                                                 endMinutes,
                                                 minuteHeight,
                                                 height,
                                                 nowMinutes,
                                                 isToday = false,
                                                 breakPeriods = [],
                                                 showBreaks = false,
                                                 dayKey = "",
                                             }) => {
    const nextEvent = getNextEvent(events, nowMinutes);
    const showNowLine = isToday && nowMinutes >= startMinutes && nowMinutes <= endMinutes;

    return (
        <div className="schedule_grid" style={{height: `${height}px`}}>
            {/* Hour lines, from the same tiles the time column labels */}
            {tiles.map((tile, i) => {
                const top = (tile.startMinutes - startMinutes) * minuteHeight;
                if (top <= 0) return null;
                return (
                    <div
                        key={`line-${tile.startMinutes}-${i}`}
                        className={`schedule_hour-line${tile.isGap ? " schedule_hour-line-gap" : ""}`}
                        style={{top: `${top}px`}}
                    />
                );
            })}

            {/* Break periods (comparison mode) */}
            {showBreaks && breakPeriods.map((bp, i) => {
                const breakStart = timeToMinutes(bp.startTime);
                const breakEnd = timeToMinutes(bp.endTime);
                const top = Math.max(0, breakStart - startMinutes) * minuteHeight;
                const breakHeight = Math.max(2, Math.max(0, breakEnd - breakStart) * minuteHeight);

                return (
                    <div
                        key={`break-${i}`}
                        className="schedule-break"
                        style={{top: `${top}px`, height: `${breakHeight}px`}}
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
            {events.map(event => (
                <ScheduleEvent
                    key={`${dayKey}-${event.id}`}
                    event={event}
                    isNext={nextEvent?.id === event.id}
                    isToday={isToday}
                    nowMinutes={nowMinutes}
                    baseStartMinutes={startMinutes}
                    minuteHeight={minuteHeight}
                />
            ))}

            {/* Now */}
            {showNowLine && (
                <div
                    className="schedule_now-line"
                    style={{top: `${(nowMinutes - startMinutes) * minuteHeight}px`}}
                    aria-hidden="true"
                />
            )}
        </div>
    );
};

export default DayColumn;
