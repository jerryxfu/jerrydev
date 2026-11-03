import React, {type HTMLAttributes} from "react";
import {formatDateShort, type WeekCell} from "../utils.ts";
import "./WeekGrid.scss";

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface WeekGridProps {
    weekRows: WeekCell[][];
    renderCell: (cell: WeekCell, slotKey: string) => React.ReactNode;
    // The grid's own: a class, the handlers that paint cells.
    gridProps?: HTMLAttributes<HTMLDivElement>;
}

export default function WeekGrid({weekRows, renderCell, gridProps}: WeekGridProps) {
    if (weekRows.length === 0) return null;

    // Month label spanning the range. Rows are expected to be full weeks, but
    // indexing is unchecked, so a short first/last row falls through the same
    // "nothing to show" exit as an empty grid rather than throwing.
    const firstDate = weekRows[0]?.[0]?.date;
    const lastDate = weekRows[weekRows.length - 1]?.[6]?.date;
    if (firstDate === undefined || lastDate === undefined) return null;
    const firstInfo = formatDateShort(firstDate);
    const lastInfo = formatDateShort(lastDate);
    const firstYear = Temporal.PlainDate.from(firstDate).year;
    const lastYear = Temporal.PlainDate.from(lastDate).year;
    const spansMultipleMonths = firstDate.slice(0, 7) !== lastDate.slice(0, 7);

    return (
        <div {...gridProps} className={["rv_week-grid", gridProps?.className].filter(Boolean).join(" ")}>
            <div className="rv_week-header">
                {WEEKDAY_HEADERS.map(d => (
                    <div key={d} className="rv_week-header-cell text-small">{d}</div>
                ))}
            </div>

            {weekRows.map((week, wi) => (
                <div key={wi} className="rv_week-row">
                    {week.map(cell => renderCell(cell, `${cell.date}T00:00`))}
                </div>
            ))}

            <p className="rv_week-month-label text-small">
                {firstInfo.month} {firstYear}
                {spansMultipleMonths && <> – {lastInfo.month} {lastYear}</>}
            </p>
        </div>
    );
}