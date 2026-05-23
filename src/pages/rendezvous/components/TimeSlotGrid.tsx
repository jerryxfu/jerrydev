import React from "react";
import {formatDateShort, formatTime12h} from "../utils.ts";
import "./TimeSlotGrid.scss";

interface DateEntry {
    date: string;
    isSelected: boolean;
}

interface TimeSlotGridProps {
    timeSlots: string[];
    dateRange: DateEntry[];
    renderDateHeader: (date: string, info: ReturnType<typeof formatDateShort>) => React.ReactNode;
    renderCell: (date: string, time: string, slotKey: string) => React.ReactNode;
}

export default function TimeSlotGrid({timeSlots, dateRange, renderDateHeader, renderCell}: TimeSlotGridProps) {
    return (
        <div className="rv_grid-wrapper">
            <div className="rv_grid">
                {/* Time label column */}
                <div className="rv_grid-time-col">
                    <div className="rv_grid-corner" />
                    {timeSlots.map(t => (
                        <div key={t} className="rv_grid-time-label smaller-caption-text">
                            {formatTime12h(t)}
                        </div>
                    ))}
                </div>

                {/* Date columns */}
                {dateRange.map(({date, isSelected}) => {
                    const info = formatDateShort(date);

                    if (!isSelected) {
                        return (
                            <div key={date} className="rv_grid-col rv_grid-col--gap">
                                <div className="rv_grid-date-header rv_grid-date-header--gap smaller-caption-text">
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
    );
}