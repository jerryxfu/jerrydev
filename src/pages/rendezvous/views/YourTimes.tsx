import {useRef} from "react";
import {Check} from "lucide-react";
import Button from "@/components/Button/Button.tsx";
import useAutoFocus from "@/hooks/useAutoFocus.ts";
import {type EventMeta, PARTS} from "../types.ts";
import {formatDateShort, formatTime12h, generateTimeSlots, getDateRange, getWeekRows, slotKey} from "../utils.ts";
import usePaint from "../usePaint.ts";
import WeekGrid from "../components/WeekGrid.tsx";
import TimeSlotGrid from "../components/TimeSlotGrid.tsx";

interface YourTimesProps {
    event: EventMeta;
    name: string;
    setName: (name: string) => void;
    slots: Set<string>;
    setSlot: (key: string, on: boolean) => void;
    answered: boolean;
    saving: boolean;
    error: string | null;
    onSave: () => void;
}

/** Your name and when you're free: tap or drag over the grid, then save. */
export default function YourTimes(
    {event, name, setName, slots, setSlot, answered, saving, error, onSave}: YourTimesProps
) {
    const paint = usePaint(key => slots.has(key), setSlot);
    // Your name to type first, when this device doesn't know it yet.
    const nameField = useRef<HTMLInputElement>(null);
    useAutoFocus(nameField, name === "");
    const timeSlots = generateTimeSlots(event.timeStart, event.timeEnd, event.granularity);
    const isDay = event.granularity === "day";

    // A day's header picks the whole day, or clears it when it's all picked.
    const toggleDay = (date: string) => {
        const keys = timeSlots.map(t => slotKey(date, t));
        const on = !keys.every(k => slots.has(k));
        keys.forEach(k => setSlot(k, on));
    };

    return (
        <div className="rv_you">
            <input
                ref={nameField}
                className="rv_name-input"
                type="text"
                placeholder="Your name"
                aria-label="Your name"
                maxLength={50}
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <p className="rv_note">Tap or drag over the {isDay ? "days" : "times"} you're free.</p>

            {isDay ? (
                <WeekGrid
                    weekRows={getWeekRows(event.dates)}
                    gridProps={{...paint, className: "rv_week-grid--paint"}}
                    renderCell={(cell, key) => cell.isSelected ? (
                        <button
                            key={cell.date}
                            className={`rv_week-cell rv_week-cell--selectable ${slots.has(key) ? "rv_week-cell--active" : ""}`}
                            aria-pressed={slots.has(key)}
                            data-paint={key}
                        >
                            <span className="rv_week-cell-num">{formatDateShort(cell.date).date}</span>
                        </button>
                    ) : (
                        <div key={cell.date} className="rv_week-cell rv_week-cell--context">
                            <span className="rv_week-cell-num">{formatDateShort(cell.date).date}</span>
                        </div>
                    )}
                />
            ) : (
                <TimeSlotGrid
                    timeSlots={timeSlots}
                    dateRange={getDateRange(event.dates)}
                    timeZone={typeof event.granularity === "number" ? event.timeZone : undefined}
                    parts={event.granularity === "parts"}
                    gridProps={{...paint, className: "rv_grid--paint"}}
                    renderDateHeader={(date, info) => (
                        <button className="rv_grid-date-header" onClick={() => toggleDay(date)} title="Pick or clear the whole day">
                            <span className="rv_grid-date-day">{info.day}</span>
                            <span className="rv_grid-date-num">{info.date}</span>
                        </button>
                    )}
                    renderCell={(date, time, key) => (
                        <button
                            key={key}
                            className={`rv_grid-cell ${slots.has(key) ? "rv_grid-cell--active" : ""}`}
                            aria-label={`${formatDateShort(date).day} ${formatDateShort(date).date}, ${
                                PARTS.find(p => p.time === time)?.label ?? formatTime12h(time)}`}
                            aria-pressed={slots.has(key)}
                            data-paint={key}
                        />
                    )}
                />
            )}

            {error && <p className="rv_error">{error}</p>}
            <Button variant="main" size="big" start={Check} busy={saving} disabled={!name.trim()} onClick={onSave}>
                {answered ? "Save changes" : "Save my times"}
            </Button>
        </div>
    );
}
