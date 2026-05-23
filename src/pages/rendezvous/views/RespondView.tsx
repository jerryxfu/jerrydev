import React from "react";
import {BarChart3, Send} from "lucide-react";
import {type EventMeta} from "../types.ts";
import {formatDateShort, generateTimeSlots, getDateRange, getWeekRows, slotKey} from "../utils.ts";
import WeekGrid from "../components/WeekGrid.tsx";
import TimeSlotGrid from "../components/TimeSlotGrid.tsx";
import Divider from "../../../components/Divider/Divider.tsx";
import "./RespondView.scss";

interface RespondViewProps {
    event: EventMeta;
    name: string;
    setName: (name: string) => void;
    selectedSlots: Set<string>;
    onToggleSlot: (slotKey: string) => void;
    error: string | null;
    loading: boolean;
    onSubmit: () => void;
    onViewResults: () => void;
}

export default function RespondView(
    {event, name, setName, selectedSlots, onToggleSlot, error, loading, onSubmit, onViewResults}: RespondViewProps
) {
    const timeSlots = generateTimeSlots(event.timeStart, event.timeEnd, event.granularity);
    const dateRange = getDateRange(event.dates);
    const isDay = event.granularity === "day";
    const weekRows = isDay ? getWeekRows(event.dates) : [];

    const toggleColumn = (dateStr: string) => {
        const columnSlots = timeSlots.map(t => slotKey(dateStr, t));
        const allSelected = columnSlots.every(k => selectedSlots.has(k));
        columnSlots.forEach(k => {
            if (allSelected) {
                if (selectedSlots.has(k)) onToggleSlot(k);
            } else {
                if (!selectedSlots.has(k)) onToggleSlot(k);
            }
        });
    };

    return (
        <div className="rv_respond">
            {/* Event header */}
            <div className="rv_event-header">
                <h2 className="rv_event-title">{event.title}</h2>
                <span className="rv_event-code smaller-caption-text">{event.code}</span>
            </div>

            {/* Name input */}
            <input
                className="rv_name-input"
                type="text"
                placeholder="Your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
            />

            {/* Participant count */}
            {event.responses.length > 0 && (
                <p className="rv_respondent-count smaller-caption-text">
                    {event.responses.length} response{event.responses.length !== 1 ? "s" : ""} so far
                    {" · "}
                    <button className="rv_inline-link" onClick={onViewResults}>
                        <BarChart3 size={11} />
                        View results
                    </button>
                </p>
            )}

            {/* Availability grid */}
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
                        const isActive = selectedSlots.has(key);
                        return (
                            <button
                                key={cell.date}
                                className={[
                                    "rv_week-cell rv_week-cell--selectable",
                                    isActive && "rv_week-cell--active",
                                ].filter(Boolean).join(" ")}
                                onClick={() => onToggleSlot(key)}
                            >
                                <span className="rv_week-cell-num">{info.date}</span>
                            </button>
                        );
                    }}
                />
            ) : (
                <TimeSlotGrid
                    timeSlots={timeSlots}
                    dateRange={dateRange}
                    renderDateHeader={(date, info) => (
                        <button
                            className="rv_grid-date-header"
                            onClick={() => toggleColumn(date)}
                            title="Select/deselect entire day"
                        >
                            <span className="rv_grid-date-day">{info.day}</span>
                            <span className="rv_grid-date-num">{info.date}</span>
                        </button>
                    )}
                    renderCell={(_date, _time, key) => {
                        const isActive = selectedSlots.has(key);
                        return (
                            <button
                                key={key}
                                className={`rv_grid-cell ${isActive ? "rv_grid-cell--active" : ""}`}
                                onClick={() => onToggleSlot(key)}
                            />
                        );
                    }}
                />
            )}

            <p className="rv_slot-count smaller-caption-text">
                {selectedSlots.size} {isDay ? "day" : "slot"}{selectedSlots.size !== 1 ? "s" : ""} selected
            </p>

            {error && <p className="rv_error">{error}</p>}

            <Divider />
            <div className="rv_btn-row">
                <button className="rv_btn-secondary" onClick={onViewResults}>
                    <BarChart3 size={14} />
                    Results
                </button>
                <button
                    className="rv_btn-primary"
                    onClick={onSubmit}
                    disabled={loading || !name.trim() || selectedSlots.size === 0}
                >
                    <Send size={14} />
                    {loading ? "Submitting..." : "Submit availability"}
                </button>
            </div>
        </div>
    );
}