import React from "react";
import {formatDateShort, formatTime12h, viewerTime, zoneName} from "../utils.ts";
import "./TimeSlotGrid.scss";

interface DateEntry {
    date: string;
    isSelected: boolean;
}

interface TimeSlotGridProps {
    timeSlots: string[];
    dateRange: DateEntry[];
    // The event's time zone, for slots at a time of day: the labels then read in the viewer's time.
    timeZone?: string;
    renderDateHeader: (date: string, info: ReturnType<typeof formatDateShort>) => React.ReactNode;
    renderCell: (date: string, time: string, slotKey: string) => React.ReactNode;
}

// A slot's time as the viewer reads it: their own, then the event's in parentheses when the clocks differ.
// "3 AM +1 (9 PM)": +1, the next day for the viewer.
export function SlotTime({date, time, timeZone}: { date: string; time: string; timeZone?: string }) {
    const mine = viewerTime(date, time, timeZone);
    if (!mine) return <>{formatTime12h(time)}</>;
    return (
        <>
            {mine.time}
            {mine.day !== 0 && <sup className="rv_slot-day">{mine.day > 0 ? "+" : "−"}{Math.abs(mine.day)}</sup>}
            {" "}({formatTime12h(time)})
        </>
    );
}

export default function TimeSlotGrid({timeSlots, dateRange, timeZone, renderDateHeader, renderCell}: TimeSlotGridProps) {
    // The rows read for the event's first day. An event across a daylight-saving change in one zone and not the other
    // is an hour off after it: rare enough to leave.
    const firstDate = dateRange.find(d => d.isSelected)?.date ?? "";
    const zone = firstDate ? timeZone : undefined;
    const shifts = timeSlots.map(t => viewerTime(firstDate, t, zone)?.day ?? null);

    return (
        <>
            {zone && shifts.some(day => day !== null) && (
                <p className="rv_zone-note text-small">
                    Times are yours ({zoneName(Temporal.Now.timeZoneId())}), with the event's in parentheses
                    ({zoneName(zone)}).
                    {shifts.some(day => day !== null && day > 0) && " +1: the next day for you."}
                    {shifts.some(day => day !== null && day < 0) && " −1: the day before for you."}
                </p>
            )}
            <div className="rv_grid-wrapper">
                <div className="rv_grid">
                    {/* Time label column */}
                    <div className="rv_grid-time-col">
                        <div className="rv_grid-corner" />
                        {timeSlots.map(t => (
                            <div key={t} className="rv_grid-time-label text-small">
                                <SlotTime date={firstDate} time={t} timeZone={zone} />
                            </div>
                        ))}
                    </div>

                    {/* Date columns */}
                    {dateRange.map(({date, isSelected}) => {
                        const info = formatDateShort(date);

                        if (!isSelected) {
                            return (
                                <div key={date} className="rv_grid-col rv_grid-col--gap">
                                    <div className="rv_grid-date-header rv_grid-date-header--gap text-small">
                                        <span>{info.day}</span>
                                        <span>{info.date}</span>
                                    </div>
                                    {timeSlots.map((_, i) => (
                                        <div key={i} className="rv_grid-cell rv_grid-cell--gap" />
                                    ))}
                                </div>
                            );
                        }

                        return (
                            <div key={date} className="rv_grid-col">
                                {renderDateHeader(date, info)}
                                {timeSlots.map(t => renderCell(date, t, `${date}T${t}`))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}