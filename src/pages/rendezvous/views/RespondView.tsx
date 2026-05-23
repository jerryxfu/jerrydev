import React from "react";
import {BarChart3, Send} from "lucide-react";
import {type EventMeta} from "../types.ts";
import {formatDateShort, formatTime12h, generateTimeSlots, getDateRange, slotKey} from "../utils.ts";
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

    const toggleColumn = (dateStr: string) => {
        const columnSlots = timeSlots.map(t => slotKey(dateStr, t));
        const allSelected = columnSlots.every(k => selectedSlots.has(k));

        // If all are selected, deselect all; otherwise select all
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
                                <button
                                    className="rv_grid-date-header"
                                    onClick={() => toggleColumn(date)}
                                    title="Select/deselect entire day"
                                >
                                    <span className="rv_grid-date-day">{info.day}</span>
                                    <span className="rv_grid-date-num">{info.date}</span>
                                </button>
                                {timeSlots.map(t => {
                                    const key = slotKey(date, t);
                                    const isActive = selectedSlots.has(key);
                                    return (
                                        <button
                                            key={key}
                                            className={`rv_grid-cell ${isActive ? "rv_grid-cell--active" : ""}`}
                                            onClick={() => onToggleSlot(key)}
                                        />
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            <p className="rv_slot-count smaller-caption-text">
                {selectedSlots.size} slot{selectedSlots.size !== 1 ? "s" : ""} selected
            </p>

            {error && <p className="rv_error">{error}</p>}

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