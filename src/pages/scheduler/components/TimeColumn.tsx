import React from "react";
import {type TimeTile} from "../timeUtils.ts";
import "./TimeColumn.scss";

interface TimeColumnProps {
    tiles: TimeTile[];
    /** Minute value at the top of the column. */
    startMinutes: number;
    minuteHeight: number;
    /** Must equal the grid height, both come from getScheduleGeometry. */
    height: number;
}

/**
 * The time labels down the left edge.
 *
 * Tiles are absolutely positioned off the same (minutes -> pixels) mapping the
 * events use. They used to be stacked flex children, which meant that whenever
 * the column was shorter than its content the browser shrank the tiles (flex
 * items shrink by default) while the absolutely positioned events kept their
 * size, and the labels silently drifted out of line with the events. In a short
 * viewport, or the 568px Home Island iframe, that was every single render.
 */
const TimeColumn: React.FC<TimeColumnProps> = ({tiles, startMinutes, minuteHeight, height}) => (
    <div className="time_column" style={{height: `${height}px`}}>
        {tiles.map((tile, i) => {
            if (tile.isGap) return null;

            const top = (tile.startMinutes - startMinutes) * minuteHeight;
            const tileHeight = (tile.endMinutes - tile.startMinutes) * minuteHeight;
            if (tileHeight <= 0) return null;

            return (
                <div
                    key={`${tile.startMinutes}-${i}`}
                    className="time_slot"
                    style={{top: `${top}px`, height: `${tileHeight}px`}}
                >
                    {tile.label && <span className="time_label time_label-start">{tile.label}</span>}
                    {tile.endLabel && <span className="time_label time_label-end">{tile.endLabel}</span>}
                </div>
            );
        })}
    </div>
);

export default TimeColumn;
