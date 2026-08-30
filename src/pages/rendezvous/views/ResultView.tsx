import React, {useEffect, useState} from "react";
import {Check, Clipboard, Link, UserPlus, Users} from "lucide-react";
import {type EventMeta} from "../types.ts";
import {formatDateShort, formatTime12h, generateTimeSlots, getDateRange, getEventUrl, getWeekRows, timeUntil} from "../utils.ts";
import WeekGrid from "../components/WeekGrid.tsx";
import TimeSlotGrid from "../components/TimeSlotGrid.tsx";
import Divider from "../../../components/Divider/Divider.tsx";
import "./ResultView.scss";

interface ResultViewProps {
    event: EventMeta;
    copiedField: string | null;
    onCopy: (text: string, field: string, e?: React.MouseEvent) => void;
    onAddAvailability: () => void;
}

export default function ResultView({event, copiedField, onCopy, onAddAvailability}: ResultViewProps) {
    // Click, not hover. A hovered panel is unreadable on the way to reading it — the pointer has to leave
    // the cell to reach anything, and the panel goes with it — and it never existed at all on touch, which
    // is what the isTouch branch here used to be working around. A selection persists until it is dismissed.
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
    const dateRange = getDateRange(event.dates);
    const isDay = event.granularity === "day";
    const weekRows = isDay ? getWeekRows(event.dates) : [];
    const totalResponses = event.responses.length;

    // Build a lookup: slotKey -> list of names who are free
    const slotAvailability = new Map<string, string[]>();
    for (const resp of event.responses) {
        for (const s of resp.slots) {
            if (!slotAvailability.has(s)) slotAvailability.set(s, []);
            slotAvailability.get(s)!.push(resp.name);
        }
    }

    const maxAvail = Math.max(0, ...Array.from(slotAvailability.values()).map(v => v.length));
    const selectedNames = selectedSlot ? slotAvailability.get(selectedSlot) || [] : [];
    // A slot key is "YYYY-MM-DDTHH:MM". Split once here so both halves are typed
    // as strings rather than re-splitting and re-checking at each use.
    const [selectedDate = "", selectedTime = ""] = selectedSlot ? selectedSlot.split("T") : [];
    const selectedInfo = selectedSlot ? formatDateShort(selectedDate) : null;
    const toggle = (key: string) => setSelectedSlot(selectedSlot === key ? null : key);

    return (
        <div className="rv_result">
            {/* Event info */}
            <div className="rv_result-header">
                <div>
                    <h2 className="rv_event-title">{event.title}</h2>
                    <p className="rv_result-meta text-small">
                        {event.code} · expires {timeUntil(event.expiresAt)}
                    </p>
                </div>
            </div>

            {/* Respondents */}
            <div className="rv_respondents">
                <div className="rv_respondents-header">
                    <Users size={14} />
                    <span className="text-small">{totalResponses} respondent{totalResponses !== 1 ? "s" : ""}</span>
                </div>
                {totalResponses > 0 && (
                    <div className="rv_respondent-list">
                        {event.responses.map(r => (
                            <span key={r.name} className="rv_respondent-chip text-small">{r.name}</span>
                        ))}
                    </div>
                )}
            </div>

            {/* Heatmap */}
            {isDay ? (
                <WeekGrid
                    weekRows={weekRows}
                    renderCell={(cell, key) => {
                        const info = formatDateShort(cell.date);
                        if (!cell.isSelected) {
                            return (
                                <div key={cell.date} className="rv_week-cell rv_week-cell--context">
                                    <span className="rv_week-cell-num">{info.date}</span>
                                </div>
                            );
                        }
                        const names = slotAvailability.get(key) || [];
                        const count = names.length;
                        const ratio = totalResponses > 0 ? count / totalResponses : 0;
                        const isBest = count === maxAvail && maxAvail > 0;
                        const className = [
                            "rv_week-cell rv_week-cell--selectable",
                            count > 0 ? "rv_week-cell--filled" : "rv_week-cell--empty",
                            isBest && "rv_week-cell--best",
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
                                style={{"--heat": ratio} as React.CSSProperties}
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
                    dateRange={dateRange}
                    renderDateHeader={(_date, info) => (
                        <div className="rv_grid-date-header rv_grid-date-header--result">
                            <span className="rv_grid-date-day">{info.day}</span>
                            <span className="rv_grid-date-num">{info.date}</span>
                        </div>
                    )}
                    renderCell={(_date, _time, key) => {
                        const names = slotAvailability.get(key) || [];
                        const count = names.length;
                        const ratio = totalResponses > 0 ? count / totalResponses : 0;
                        const isBest = count === maxAvail && maxAvail > 0;
                        const className = [
                            "rv_grid-cell rv_grid-cell--heatmap",
                            count > 0 && "rv_grid-cell--filled",
                            isBest && "rv_grid-cell--best",
                            selectedSlot === key && "rv_grid-cell--selected",
                        ].filter(Boolean).join(" ");
                        // Same rule as the week grid: an empty slot is not a control. The native title
                        // tooltip that used to live here is gone with it — the panel below says the same
                        // thing, on click, without the browser's half-second delay.
                        if (count === 0) {
                            return <div key={key} className={className} />;
                        }
                        return (
                            <button
                                key={key}
                                type="button"
                                className={className}
                                style={{"--heat": ratio} as React.CSSProperties}
                                aria-pressed={selectedSlot === key}
                                onClick={() => toggle(key)}
                            >
                                <span className="rv_grid-cell-count">{count}</span>
                            </button>
                        );
                    }}
                />
            )}

            {/* Selected slot. Rendered whether or not anything is selected: it used to appear and disappear
                with the pointer, which shoved the buttons below it up and down the page on every cell the
                cursor crossed. The resting state also tells you the grid is clickable, which nothing did. */}
            {totalResponses > 0 && (
                <div className="rv_slot-detail" aria-live="polite">
                    {selectedSlot && selectedInfo ? (
                        <>
                            <span className="rv_slot-detail-time text-small">
                                {isDay
                                    ? <>{selectedInfo.day}, {selectedInfo.month} {selectedInfo.date}</>
                                    : <>{formatTime12h(selectedTime)} · {selectedInfo.day} {selectedInfo.date}</>
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
                            Select a slot to see who is free
                        </span>
                    )}
                </div>
            )}

            {/* Actions */}
            <Divider />
            <div className="rv_btn-row">
                <button
                    className="rv_btn-secondary"
                    onClick={(e) => onCopy(event.code, "code", e)}
                >
                    {copiedField === "code" ? <Check size={14} /> : <Clipboard size={14} />}
                    {copiedField === "code" ? "Copied" : "Code"}
                </button>
                <button
                    className="rv_btn-secondary"
                    onClick={(e) => onCopy(getEventUrl(event.code), "link", e)}
                >
                    {copiedField === "link" ? <Check size={14} /> : <Link size={14} />}
                    {copiedField === "link" ? "Copied" : "Link"}
                </button>
                <button className="rv_btn-primary" onClick={onAddAvailability}>
                    <UserPlus size={14} />
                    Add availability
                </button>
            </div>
        </div>
    );
}