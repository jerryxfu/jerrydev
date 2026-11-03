import React, {useEffect, useState} from "react";
import {type EventMeta, PARTS} from "../types.ts";
import {formatDateShort, generateTimeSlots, getDateRange, getWeekRows} from "../utils.ts";
import {freeAt} from "../best.ts";
import WeekGrid from "../components/WeekGrid.tsx";
import TimeSlotGrid, {SlotTime} from "../components/TimeSlotGrid.tsx";

/** Everyone's answers: who answered, how many are free in each slot, and who, for the slot clicked. */
export default function Everyone({event}: { event: EventMeta }) {
    // Click, not hover. A hovered panel is unreadable on the way to reading it — the pointer has to leave
    // the cell to reach anything, and the panel goes with it — and it never existed at all on touch.
    // A selection persists until it is dismissed.
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedSlot) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setSelectedSlot(null);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selectedSlot]);

    const timeSlots = generateTimeSlots(event.timeStart, event.timeEnd, event.granularity);
    const isDay = event.granularity === "day";
    const isParts = event.granularity === "parts";
    // Slots at a time of day read in the viewer's time; whole days and parts of the day stay as they are.
    const zone = typeof event.granularity === "number" ? event.timeZone : undefined;
    const totalResponses = event.responses.length;

    const slotAvailability = freeAt(event);
    const maxAvail = Math.max(0, ...Array.from(slotAvailability.values()).map(v => v.length));
    const selectedNames = selectedSlot ? slotAvailability.get(selectedSlot) || [] : [];
    // A slot key is "YYYY-MM-DDTHH:MM". Split once here so both halves are typed
    // as strings rather than re-splitting and re-checking at each use.
    const [selectedDate = "", selectedTime = ""] = selectedSlot ? selectedSlot.split("T") : [];
    const selectedInfo = selectedSlot ? formatDateShort(selectedDate) : null;
    const toggle = (key: string) => setSelectedSlot(selectedSlot === key ? null : key);

    if (totalResponses === 0) {
        return <p className="rv_empty">No answers yet. Share the link, then come back here.</p>;
    }

    return (
        <div className="rv_everyone">
            <div className="rv_respondent-list">
                {event.responses.map(r => (
                    <span key={r.name} className="rv_respondent-chip text-small">{r.name}</span>
                ))}
            </div>

            {isDay ? (
                <WeekGrid
                    weekRows={getWeekRows(event.dates)}
                    renderCell={(cell, key) => {
                        const info = formatDateShort(cell.date);
                        if (!cell.isSelected) {
                            return (
                                <div key={cell.date} className="rv_week-cell rv_week-cell--context">
                                    <span className="rv_week-cell-num">{info.date}</span>
                                </div>
                            );
                        }
                        const count = slotAvailability.get(key)?.length ?? 0;
                        const className = [
                            "rv_week-cell rv_week-cell--selectable",
                            count > 0 ? "rv_week-cell--filled" : "rv_week-cell--empty",
                            count === maxAvail && maxAvail > 0 && "rv_week-cell--best",
                            selectedSlot === key && "rv_week-cell--selected",
                        ].filter(Boolean).join(" ");
                        const body = (
                            <>
                                <span className="rv_week-cell-num">{info.date}</span>
                                {count > 0 && <span className="rv_week-cell-count">{count}/{totalResponses}</span>}
                            </>
                        );
                        // A day nobody picked has nothing to open, so it stays a div: no button semantics, no
                        // tab stop, and the cursor and hover rules already keyed off --empty agree with it.
                        if (count === 0) {
                            return <div key={cell.date} className={className}>{body}</div>;
                        }
                        return (
                            <button
                                key={cell.date}
                                type="button"
                                className={className}
                                style={{"--heat": count / totalResponses} as React.CSSProperties}
                                aria-pressed={selectedSlot === key}
                                onClick={() => toggle(key)}
                            >
                                {body}
                            </button>
                        );
                    }}
                />
            ) : (
                <TimeSlotGrid
                    timeSlots={timeSlots}
                    dateRange={getDateRange(event.dates)}
                    timeZone={zone}
                    parts={isParts}
                    renderDateHeader={(_date, info) => (
                        <div className="rv_grid-date-header rv_grid-date-header--result">
                            <span className="rv_grid-date-day">{info.day}</span>
                            <span className="rv_grid-date-num">{info.date}</span>
                        </div>
                    )}
                    renderCell={(_date, _time, key) => {
                        const count = slotAvailability.get(key)?.length ?? 0;
                        const className = [
                            "rv_grid-cell rv_grid-cell--heatmap",
                            count > 0 && "rv_grid-cell--filled",
                            count === maxAvail && maxAvail > 0 && "rv_grid-cell--best",
                            selectedSlot === key && "rv_grid-cell--selected",
                        ].filter(Boolean).join(" ");
                        // Same rule as the week grid: an empty slot is not a control.
                        if (count === 0) {
                            return <div key={key} className={className} />;
                        }
                        return (
                            <button
                                key={key}
                                type="button"
                                className={className}
                                style={{"--heat": count / totalResponses} as React.CSSProperties}
                                aria-pressed={selectedSlot === key}
                                onClick={() => toggle(key)}
                            >
                                <span className="rv_grid-cell-count">{count}</span>
                            </button>
                        );
                    }}
                />
            )}

            {/* Rendered whether or not anything is selected, so selecting a slot doesn't move what's below it. The
                resting state also tells you the grid is clickable. */}
            <div className="rv_slot-detail" aria-live="polite">
                {selectedSlot && selectedInfo ? (
                    <>
                        <span className="rv_slot-detail-time text-small">
                            {isDay
                                ? <>{selectedInfo.day}, {selectedInfo.month} {selectedInfo.date}</>
                                : isParts
                                    ? <>{PARTS.find(p => p.time === selectedTime)?.label} · {selectedInfo.day} {selectedInfo.date}</>
                                    : <><SlotTime date={selectedDate} time={selectedTime} timeZone={zone} /> · {selectedInfo.day} {selectedInfo.date}</>
                            }
                        </span>
                        <div className="rv_slot-detail-names">
                            {selectedNames.map(n => (
                                <span key={n} className="rv_slot-detail-name">{n}</span>
                            ))}
                        </div>
                    </>
                ) : (
                    <span className="rv_slot-detail-hint text-small">
                        Select a {isDay ? "day" : "slot"} to see who is free
                    </span>
                )}
            </div>
        </div>
    );
}
