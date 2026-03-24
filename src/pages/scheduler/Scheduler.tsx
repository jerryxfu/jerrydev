import React, {useCallback, useEffect, useMemo, useState} from "react";
import Schedule from "./components/Schedule";
import {Schedule as ScheduleType} from "../../types/schedule";
import {findCommonBreaksInRange, minutesToTime, timeToMinutes} from "./timeUtils.ts";
import scheduleConfig from "./scheduleConfig.ts";
import "./Scheduler.scss";

const HIDE_WEEKENDS = true;

const ALL_DAYS = [
    {key: "monday", label: "Monday"},
    {key: "tuesday", label: "Tuesday"},
    {key: "wednesday", label: "Wednesday"},
    {key: "thursday", label: "Thursday"},
    {key: "friday", label: "Friday"},
    {key: "saturday", label: "Saturday"},
    {key: "sunday", label: "Sunday"},
] as const;

const DAYS_OF_WEEK = HIDE_WEEKENDS
    ? ALL_DAYS.filter(d => d.key !== "saturday" && d.key !== "sunday")
    : [...ALL_DAYS];

const STORAGE_KEY = "scheduler-last-selected-person";
const DEFAULT_START = "08:00";
const DEFAULT_END = "18:00";

// Helpers
const findSchedule = (id: string) => scheduleConfig.find(s => s.id === id);

const getTodayKey = (): string => {
    const now = new Date();
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    let idx = now.getDay();
    if (now.getHours() >= 18) idx = (idx + 1) % 7;
    const day = dayNames[idx]!;
    if (HIDE_WEEKENDS && (day === "saturday" || day === "sunday")) return "monday";
    return day;
};

const filterByDay = (schedule: ScheduleType, day: string): ScheduleType => ({
    ...schedule,
    events: schedule.events.filter(e => e.day === day),
});

// URL params hook
function useHomeIslandParams() {
    return useMemo(() => {
        const params = new URLSearchParams(window.location.search);
        const isHomeIsland = params.get("homeisland") === "true";
        const homeIslandId = params.get("id");
        const isValid = !isHomeIsland || (!!homeIslandId && scheduleConfig.some(s => s.id === homeIslandId));
        return {isHomeIsland, homeIslandId, isValid};
    }, []);
}

const Scheduler: React.FC = () => {
    const {isHomeIsland, homeIslandId, isValid: isHomeIslandValid} = useHomeIslandParams();

    // Initial schedule selection
    const getInitialSchedules = useCallback((): ScheduleType[] => {
        if (isHomeIsland && homeIslandId) {
            const s = findSchedule(homeIslandId);
            if (s) return [s];
        }
        const savedId = localStorage.getItem(STORAGE_KEY);
        if (savedId) {
            const s = findSchedule(savedId);
            if (s) return [s];
        }
        return scheduleConfig.slice(0, 1);
    }, [isHomeIsland, homeIslandId]);

    const [selectedSchedules, setSelectedSchedules] = useState<ScheduleType[]>(getInitialSchedules);
    const [comparisonMode, setComparisonMode] = useState(false);
    const [selectedDay, setSelectedDay] = useState(getTodayKey);

    // Persist selection
    useEffect(() => {
        if (!comparisonMode && selectedSchedules[0]) {
            localStorage.setItem(STORAGE_KEY, selectedSchedules[0].id);
        }
    }, [selectedSchedules, comparisonMode]);

    // Home Island body styling
    useEffect(() => {
        if (!isHomeIsland) return;
        document.body.classList.add("homeisland-body");
        document.documentElement.classList.add("homeisland-html");
        const timer = setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 100);
        return () => {
            clearTimeout(timer);
            document.body.classList.remove("homeisland-body");
            document.documentElement.classList.remove("homeisland-html");
        };
    }, [isHomeIsland]);

    // Filter events for selected day
    const filteredSchedules = useMemo(
        () => selectedSchedules.map(s => filterByDay(s, selectedDay)),
        [selectedSchedules, selectedDay],
    );

    // Common breaks (comparison mode only)
    const commonBreaks = useMemo(() => {
        if (!comparisonMode || filteredSchedules.length !== 2) return [];
        const [a, b] = filteredSchedules;
        if (!a || !b) return [];

        const aStart = timeToMinutes(a.startTime ?? DEFAULT_START);
        const bStart = timeToMinutes(b.startTime ?? DEFAULT_START);
        const aEnd = timeToMinutes(a.endTime ?? DEFAULT_END);
        const bEnd = timeToMinutes(b.endTime ?? DEFAULT_END);

        const start = Math.max(aStart, bStart);
        const end = Math.min(aEnd, bEnd);
        if (end <= start) return [];

        return findCommonBreaksInRange(a.events, b.events, minutesToTime(start), minutesToTime(end), 15);
    }, [comparisonMode, filteredSchedules]);

    // Whether the selected day is actually today (for time-aware event status)
    const isToday = useMemo(() => selectedDay === getTodayKey(), [selectedDay]);

    // Handlers
    const toggleComparison = useCallback(() => {
        if (comparisonMode) {
            setSelectedSchedules(scheduleConfig.slice(0, 1));
            setComparisonMode(false);
        } else {
            const defaultSchedule = findSchedule("jerry") ?? scheduleConfig[0];
            if (!defaultSchedule) return;
            setSelectedSchedules([defaultSchedule, defaultSchedule]);
            setComparisonMode(true);
        }
    }, [comparisonMode]);

    const handleSelect = useCallback((index: number, id: string) => {
        const s = findSchedule(id);
        if (!s) return;
        setSelectedSchedules(prev => {
            const next = [...prev];
            next[index] = s;
            return next;
        });
    }, []);

    const handleSingleSelect = useCallback((id: string) => {
        const s = findSchedule(id);
        if (s) setSelectedSchedules([s]);
    }, []);


    if (isHomeIsland && !isHomeIslandValid) return null;

    return (
        <div className={`scheduler ${isHomeIsland ? "homeisland-mode" : ""}`}>
            <div className="scheduler-header">
                {!isHomeIsland && <h1 className="scheduler-title">Schedule viewer</h1>}

                <div className="scheduler-controls">
                    <div className="scheduler-controls-left">
                        {!isHomeIsland && (
                            <button
                                className={`scheduler-toggle ${comparisonMode ? "scheduler-toggle-active" : ""}`}
                                onClick={toggleComparison}
                                aria-pressed={comparisonMode}
                            >
                                {comparisonMode ? "Single View" : "Compare"}
                            </button>
                        )}

                        {comparisonMode ? (
                            <div className="scheduler-selectors-inline">
                                {selectedSchedules.map((selected, i) => (
                                    <div key={i} className="scheduler-select-group">
                                        <label className="scheduler-select-label">Schedule {i + 1}:</label>
                                        <select
                                            value={selected.id}
                                            onChange={e => handleSelect(i, e.target.value)}
                                            className="scheduler-select"
                                        >
                                            {scheduleConfig.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="scheduler-select-group">
                                {!isHomeIsland && <label className="scheduler-select-label">Schedule:</label>}
                                <select
                                    value={selectedSchedules[0]?.id ?? "jerry"}
                                    onChange={e => handleSingleSelect(e.target.value)}
                                    className="scheduler-select"
                                >
                                    {scheduleConfig.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {!isHomeIsland && (
                            <div className="scheduler-day-buttons">
                                {DAYS_OF_WEEK.map(day => (
                                    <button
                                        key={day.key}
                                        className={`scheduler-day-btn ${selectedDay === day.key ? "scheduler-day-btn-active" : ""}`}
                                        onClick={() => setSelectedDay(day.key)}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="scheduler-controls-right">
                        {!isHomeIsland && comparisonMode && commonBreaks.length > 0 && (
                            <div className="scheduler-break-info">
                                <span className="scheduler-break-count">
                                    {commonBreaks.length} common free time{commonBreaks.length !== 1 ? "s" : ""}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="scheduler-content">
                <div className="scheduler-schedules">
                    {filteredSchedules.map((schedule, i) => (
                        <Schedule
                            key={`${schedule.id}-${selectedDay}-${i}`}
                            schedule={schedule}
                            breakPeriods={commonBreaks}
                            showBreaks={comparisonMode}
                            isToday={isToday}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Scheduler;
