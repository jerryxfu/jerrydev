import React, {useState} from "react";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {type EventSettings, GRANULARITY_OPTIONS, TTL_PRESETS} from "../types.ts";
import {formatDuration, getCalendarMonth} from "../utils.ts";
import Divider from "../../../components/Divider/Divider.tsx";
import "./CreateView.scss";

interface CreateViewProps {
    settings: EventSettings;
    setSettings: React.Dispatch<React.SetStateAction<EventSettings>>;
    error: string | null;
    loading: boolean;
    onCreate: () => void;
    onCancel: () => void;
}

const HOURS = Array.from({length: 24}, (_, i) => `${String(i).padStart(2, "0")}:00`);

export default function CreateView({settings, setSettings, error, loading, onCreate, onCancel}: CreateViewProps) {
    const today = Temporal.Now.plainDateISO();
    const [month, setMonth] = useState(() => today.toPlainYearMonth());

    const weeks = getCalendarMonth(month);
    const monthLabel = month.toPlainDate({day: 1}).toLocaleString([], {month: "long", year: "numeric"});
    const todayISO = today.toString();

    const toggleDate = (dateStr: string) => {
        setSettings(s => {
            const set = new Set(s.dates);
            if (set.has(dateStr)) set.delete(dateStr);
            else set.add(dateStr);
            return {...s, dates: Array.from(set).sort()};
        });
    };

    const prevMonth = () => setMonth(m => m.subtract({months: 1}));
    const nextMonth = () => setMonth(m => m.add({months: 1}));

    return (
        <div className="rv_create">
            {/* Title */}
            <input
                className="rv_title-input"
                type="text"
                placeholder="Event title..."
                value={settings.title}
                onChange={(e) => setSettings(s => ({...s, title: e.target.value}))}
                autoFocus
            />

            {/* Calendar picker */}
            <div className="rv_calendar">
                <div className="rv_calendar-nav">
                    <button className="rv_calendar-nav-btn" onClick={prevMonth}>
                        <ChevronLeft size={16} />
                    </button>
                    <span className="rv_calendar-month text-small">{monthLabel}</span>
                    <button className="rv_calendar-nav-btn" onClick={nextMonth}>
                        <ChevronRight size={16} />
                    </button>
                </div>

                <div className="rv_calendar-grid">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                        <div key={d} className="rv_calendar-weekday text-small">{d}</div>
                    ))}

                    {weeks.flat().map((date, i) => {
                        if (!date) return <div key={`empty-${i}`} className="rv_calendar-cell rv_calendar-cell--empty" />;

                        const iso = date.toString();
                        const isPast = iso < todayISO;
                        const isSelected = settings.dates.includes(iso);

                        return (
                            <button
                                key={iso}
                                className={[
                                    "rv_calendar-cell",
                                    isSelected && "rv_calendar-cell--selected",
                                    isPast && "rv_calendar-cell--past",
                                    iso === todayISO && "rv_calendar-cell--today",
                                ].filter(Boolean).join(" ")}
                                disabled={isPast}
                                onClick={() => toggleDate(iso)}
                            >
                                {date.day}
                            </button>
                        );
                    })}
                </div>

                {settings.dates.length > 0 && (
                    <p className="rv_calendar-selection text-small">
                        {settings.dates.length} date{settings.dates.length !== 1 ? "s" : ""} selected
                    </p>
                )}
            </div>

            {/* Settings */}
            <div className="rv_settings">
                <p className="rv_settings-title caption-text">Settings</p>

                <div className="rv_setting-row">
                    <label className="text-small">Slot size</label>
                    <div className="rv_pill-row">
                        {GRANULARITY_OPTIONS.map(g => (
                            <button
                                key={g.value}
                                className={`rv_setting-pill ${settings.granularity === g.value ? "active" : ""}`}
                                onClick={() => setSettings(s => ({...s, granularity: g.value}))}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>
                </div>

                {settings.granularity !== "day" && settings.granularity !== "half" && (
                    <div className="rv_setting-row">
                        <label className="text-small">Time range</label>
                        <div className="rv_time-range">
                            <select
                                className="rv_time-select"
                                value={settings.timeStart}
                                onChange={(e) => setSettings(s => ({...s, timeStart: e.target.value}))}
                            >
                                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <span className="rv_time-separator">–</span>
                            <select
                                className="rv_time-select"
                                value={settings.timeEnd}
                                onChange={(e) => setSettings(s => ({...s, timeEnd: e.target.value}))}
                            >
                                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                <div className="rv_setting-row">
                    <label className="text-small">Expires after</label>
                    <div className="rv_pill-row">
                        {TTL_PRESETS.map(p => (
                            <button
                                key={p.value}
                                className={`rv_setting-pill ${settings.ttlMs === p.value ? "active" : ""}`}
                                onClick={() => setSettings(s => ({...s, ttlMs: p.value}))}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {error && <p className="rv_error">{error}</p>}

            <Divider />
            <div className="rv_btn-row">
                <button className="rv_btn-secondary" onClick={onCancel}>Cancel</button>
                <button
                    className="rv_btn-primary"
                    onClick={onCreate}
                    disabled={loading || !settings.title.trim() || settings.dates.length === 0}
                >
                    {loading ? "Creating..." : `Create event · ${formatDuration(settings.ttlMs)}`}
                </button>
            </div>
        </div>
    );
}