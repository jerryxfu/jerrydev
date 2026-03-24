import React from "react";
import {buildTimeSlots, timeToMinutes} from "../timeUtils.ts";
import "./TimeColumn.scss";

interface TimeColumnProps {
    startTime?: string;
    endTime?: string;
    slotMinutes?: number;
    slots?: Array<{ time: string; label?: string; endTime?: string; endLabel?: string }>;
    minuteHeight?: number;
}

interface Tile {
    startMinutes: number;
    endMinutes: number;
    label?: string;
    endLabel?: string;
    isGap?: boolean;
}

const TimeColumn: React.FC<TimeColumnProps> = ({startTime = "08:00", endTime = "18:00", slotMinutes = 60, slots, minuteHeight = 0.94}) => {
    const intervals = buildTimeSlots({startTime, endTime, slotMinutes, ...(slots && {slots})})
        .sort((a, b) => a.startMinutes - b.startMinutes);

    const rangeStart = timeToMinutes(startTime);
    const rangeEnd = timeToMinutes(endTime);

    // Build tiles that cover the full range, insert gaps between intervals
    const tiles: Tile[] = [];
    let cursor = rangeStart;

    for (const s of intervals) {
        if (s.startMinutes > cursor) {
            tiles.push({startMinutes: cursor, endMinutes: s.startMinutes, isGap: true});
        }
        const tile: Tile = {startMinutes: s.startMinutes, endMinutes: s.endMinutes};
        if (s.label !== undefined) tile.label = s.label;
        if (s.endLabel !== undefined) tile.endLabel = s.endLabel;
        tiles.push(tile);
        cursor = s.endMinutes;
    }
    if (cursor < rangeEnd) {
        tiles.push({startMinutes: cursor, endMinutes: rangeEnd, isGap: true});
    }

    return (
        <div className="time_column">
            {tiles.map((tile, i) => {
                const height = (tile.endMinutes - tile.startMinutes) * minuteHeight;
                if (height <= 0) return null;

                return (
                    <div
                        key={`${tile.startMinutes}-${i}`}
                        className={`time_slot${tile.isGap ? " time_slot-gap" : ""}`}
                        style={{height: `${height}px`}}
                    >
                        {!tile.isGap && tile.label && (
                            <span className="time_label time_label-start">{tile.label}</span>
                        )}
                        {!tile.isGap && tile.endLabel && (
                            <span className="time_label time_label-end">{tile.endLabel}</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default TimeColumn;
