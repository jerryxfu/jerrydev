import React, {useState} from "react";
import {Check, Clipboard, Link, UserPlus, Users} from "lucide-react";
import {type EventMeta} from "../types.ts";
import {formatDateShort, formatTime12h, generateTimeSlots, getDateRange, getEventUrl, slotKey, timeUntil} from "../utils.ts";
import "./ResultView.scss";

interface ResultViewProps {
    event: EventMeta;
    copiedField: string | null;
    onCopy: (text: string, field: string, e?: React.MouseEvent) => void;
    onAddAvailability: () => void;
}

export default function ResultView({event, copiedField, onCopy, onAddAvailability}: ResultViewProps) {
    const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

    const timeSlots = generateTimeSlots(event.timeStart, event.timeEnd, event.granularity);
    const dateRange = getDateRange(event.dates);
    const totalResponses = event.responses.length;

    // Build a lookup: slotKey -> list of names who are free
    const slotAvailability = new Map<string, string[]>();
    for (const resp of event.responses) {
        for (const s of resp.slots) {
            if (!slotAvailability.has(s)) slotAvailability.set(s, []);
            slotAvailability.get(s)!.push(resp.name);
        }
    }

    // Find the best slot(s) — most people available
    const maxAvail = Math.max(0, ...Array.from(slotAvailability.values()).map(v => v.length));

    // Get names for hovered slot
    const hoveredNames = hoveredSlot ? slotAvailability.get(hoveredSlot) || [] : [];

    return (
        <div className="rv_result">
            {/* Event info */}
            <div className="rv_result-header">
                <div>
                    <h2 className="rv_event-title">Event: {event.title}</h2>
                    <p className="rv_result-meta smaller-caption-text">
                        {event.code} · expires {timeUntil(event.expiresAt)}
                    </p>
                </div>
            </div>

            {/* Respondents */}
            <div className="rv_respondents">
                <div className="rv_respondents-header">
                    <Users size={14} />
                    <span className="small-text">{totalResponses} respondent{totalResponses !== 1 ? "s" : ""}</span>
                </div>
                <div className="rv_respondent-list">
                    {event.responses.map(r => (
                        <span key={r.name} className="rv_respondent-chip smaller-caption-text">{r.name}</span>
                    ))}
                </div>
            </div>

            {/* Heatmap legend */}
            {totalResponses > 0 && (
                <div className="rv_legend">
                    <span className="rv_legend-label smaller-caption-text">Fewer</span>
                    <div className="rv_legend-gradient" />
                    <span className="rv_legend-label smaller-caption-text">All ({totalResponses})</span>
                </div>
            )}

            {/* Heatmap grid */}
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
                                <div className="rv_grid-date-header rv_grid-date-header--result">
                                    <span className="rv_grid-date-day">{info.day}</span>
                                    <span className="rv_grid-date-num">{info.date}</span>
                                </div>
                                {timeSlots.map(t => {
                                    const key = slotKey(date, t);
                                    const names = slotAvailability.get(key) || [];
                                    const count = names.length;
                                    const ratio = totalResponses > 0 ? count / totalResponses : 0;
                                    const isBest = count === maxAvail && maxAvail > 0;

                                    return (
                                        <div
                                            key={key}
                                            className={[
                                                "rv_heatmap-cell",
                                                count > 0 && "rv_heatmap-cell--filled",
                                                isBest && "rv_heatmap-cell--best",
                                                hoveredSlot === key && "rv_heatmap-cell--hovered",
                                            ].filter(Boolean).join(" ")}
                                            style={count > 0 ? {
                                                "--heat": ratio,
                                            } as React.CSSProperties : undefined}
                                            onMouseEnter={() => setHoveredSlot(key)}
                                            onMouseLeave={() => setHoveredSlot(null)}
                                            onClick={() => setHoveredSlot(hoveredSlot === key ? null : key)}
                                            title={count > 0 ? `${count}/${totalResponses}: ${names.join(", ")}` : "No one available"}
                                        >
                                            {count > 0 && (
                                                <span className="rv_heatmap-count">{count}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Hover tooltip */}
            {hoveredSlot && hoveredNames.length > 0 && (
                <div className="rv_tooltip">
                    <span className="rv_tooltip-time smaller-caption-text">
                        {formatTime12h(hoveredSlot.split("T")[1])} · {formatDateShort(hoveredSlot.split("T")[0]).day} {formatDateShort(hoveredSlot.split("T")[0]).date}
                    </span>
                    <div className="rv_tooltip-names">
                        {hoveredNames.map(n => (
                            <span key={n} className="rv_tooltip-name">{n}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
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