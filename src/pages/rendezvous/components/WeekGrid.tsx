import React from "react";
import {formatDateShort, type WeekCell} from "../utils.ts";
import "./WeekGrid.scss";

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface WeekGridProps {
    weekRows: WeekCell[][];
    renderCell: (cell: WeekCell, slotKey: string) => React.ReactNode;
}

export default function WeekGrid({weekRows, renderCell}: WeekGridProps) {
    if (weekRows.length === 0) return null;

    // Month label spanning the range
    const firstDate = weekRows[0][0].date;
    const lastDate = weekRows[weekRows.length - 1][6].date;
    const firstInfo = formatDateShort(firstDate);
    const lastInfo = formatDateShort(lastDate);
    const firstYear = new Date(firstDate + "T00:00:00").getFullYear();
    const lastYear = new Date(lastDate + "T00:00:00").getFullYear();
    const spansMultipleMonths = firstDate.slice(0, 7) !== lastDate.slice(0, 7);

    return (
        <div className="rv_week-grid">
            <div className="rv_week-header">
                {WEEKDAY_HEADERS.map(d => (
                    <div key={d} className="rv_week-header-cell smaller-caption-text">{d}</div>
                ))}
            </div>

            {weekRows.map((week, wi) => (
                <div key={wi} className="rv_week-row">
                    {week.map(cell => renderCell(cell, `${cell.date}T00:00`))}
                </div>
            ))}

            <p className="rv_week-month-label smaller-caption-text">
                {firstInfo.month} {firstYear}
                {spansMultipleMonths && <> – {lastInfo.month} {lastYear}</>}
            </p>
        </div>
    );
}