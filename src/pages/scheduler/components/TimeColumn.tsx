import React from "react";
import {buildTimeSlots, timeToMinutes} from "../timeUtils.ts";
import "./TimeColumn.scss";

interface ExplicitSlot {
    time: string; // "HH:MM" start
    label?: string;
    endTime?: string; // optional "HH:MM" end
    endLabel?: string; // optional custom end label
}

interface TimeColumnProps {
    startTime?: string; // "HH:MM"
    endTime?: string;   // "HH:MM"
    slotMinutes?: number; // default 60
    slots?: ExplicitSlot[]; // explicit custom intervals or boundaries
    minuteHeight?: number; // px per minute (default 40/60)
}

const TimeColumn: React.FC<TimeColumnProps> = (
    {startTime = "08:00", endTime = "18:00", slotMinutes = 60, slots, minuteHeight = 40 / 60}) => {
    const params: any = {startTime, endTime, slotMinutes};
    if (slots) params.slots = slots;
    const intervals = buildTimeSlots(params).sort((a, b) => a.startMinutes - b.startMinutes);

    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);

    // Build a tiled list that covers the entire range, inserting gaps when needed
    const tiles: Array<{ startMinutes: number; endMinutes: number; label?: string; endLabel?: string; isGap?: boolean }> = [];
    let cursor = startMin;
    for (const s of intervals) {
        if (s.startMinutes > cursor) {
            tiles.push({startMinutes: cursor, endMinutes: s.startMinutes, isGap: true});
        }
        const tileEntry: { startMinutes: number; endMinutes: number; label?: string; endLabel?: string; isGap?: boolean } = {
            startMinutes: s.startMinutes,
            endMinutes: s.endMinutes
        };
        if (s.label !== undefined) tileEntry.label = s.label;
        if (s.endLabel !== undefined) tileEntry.endLabel = s.endLabel;
        tiles.push(tileEntry);
        cursor = s.endMinutes;
    }
    if (cursor < endMin) {
        tiles.push({startMinutes: cursor, endMinutes: endMin, isGap: true});
    }

    return (
        <div className="time_column">
            {tiles.map((tile, idx) => {
                const height = (tile.endMinutes - tile.startMinutes) * minuteHeight;
                if (height <= 0) return null;
                return (
                    <div key={`${tile.startMinutes}-${idx}`} className={`time_slot${tile.isGap ? " time_slot-gap" : ""}`}
                         style={{height: `${height}px`}}>
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
