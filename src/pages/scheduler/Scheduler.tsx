import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Helmet} from "react-helmet-async";
import Schedule from "./components/Schedule";
import WeekSchedule from "./components/WeekSchedule";
import {type Schedule as ScheduleType} from "../../types/schedule";
import {
    DEFAULT_END_TIME,
    DEFAULT_START_TIME,
    findCommonBreaksInRange,
    getNowMinutes,
    minutesToTime,
    resolveDisplayRange,
    timeToMinutes,
} from "./timeUtils.ts";
import scheduleConfig from "./scheduleConfig.ts";
import "./Scheduler.scss";

interface DayOption {
    key: string;
    label: string;
}

const ALL_DAYS: DayOption[] = [
    {key: "monday", label: "Monday"},
    {key: "tuesday", label: "Tuesday"},
    {key: "wednesday", label: "Wednesday"},
    {key: "thursday", label: "Thursday"},
    {key: "friday", label: "Friday"},
    {key: "saturday", label: "Saturday"},
    {key: "sunday", label: "Sunday"},
];

const WEEKEND_KEYS = ["saturday", "sunday"];
const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const STORAGE_KEY = "scheduler-last-selected-person";

// Helpers
const findSchedule = (id: string) => scheduleConfig.find(s => s.id === id);

/**
 * Weekends are shown only when the selected schedule actually uses them, and
 * both days appear together so the week never ends on a lone Saturday. This
 * replaces the old HIDE_WEEKENDS constant, which hid them unconditionally.
 */
const getVisibleDays = (schedules: ScheduleType[]): DayOption[] => {
    const usesWeekend = schedules.some(s =>
        s.events.some(e => e.day !== undefined && WEEKEND_KEYS.includes(e.day)),
    );
    return usesWeekend ? ALL_DAYS : ALL_DAYS.filter(d => !WEEKEND_KEYS.includes(d.key));
};

/** The real weekday, used to decide what counts as "today". */
const getActualTodayKey = (): string => DAY_NAMES[new Date().getDay()]!;

/** Which day to open on: today, or tomorrow once the evening is over. */
const getPreferredDayKey = (visibleKeys: string[]): string => {
    const now = new Date();
    let index = now.getDay();
    if (now.getHours() >= 18) index = (index + 1) % 7;
    const day = DAY_NAMES[index]!;
    return visibleKeys.includes(day) ? day : (visibleKeys[0] ?? "monday");
};

/**
 * Narrow a schedule to one day, keeping the *whole* schedule's time range so
 * the grid does not rescale as you click between days.
 */
const filterByDay = (schedule: ScheduleType, day: string): ScheduleType => ({
    ...schedule,
    ...resolveDisplayRange(schedule),
    events: schedule.events.filter(e => e.day === day),
});

const msUntilNextMinute = () => 60_000 - (Date.now() % 60_000);

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

    const initialSchedules = useMemo(() => getInitialSchedules(), [getInitialSchedules]);

    const [selectedSchedules, setSelectedSchedules] = useState<ScheduleType[]>(initialSchedules);
    const [comparisonMode, setComparisonMode] = useState(false);
    // Home Island embeds the day view only, so week mode is never reachable there.
    const [isWeekView, setIsWeekView] = useState(false);
    const [selectedDay, setSelectedDay] = useState(
        () => getPreferredDayKey(getVisibleDays(initialSchedules).map(d => d.key)),
    );

    // One clock for the whole page, aligned to the wall-clock minute so the now
    // line moves when the minute actually changes rather than 60s after mount.
    const [nowMinutes, setNowMinutes] = useState(getNowMinutes);
    useEffect(() => {
        let timeoutId = 0;
        const tick = () => {
            setNowMinutes(getNowMinutes());
            timeoutId = window.setTimeout(tick, msUntilNextMinute());
        };
        timeoutId = window.setTimeout(tick, msUntilNextMinute());
        return () => window.clearTimeout(timeoutId);
    }, []);

    const visibleDays = useMemo(() => getVisibleDays(selectedSchedules), [selectedSchedules]);
    const visibleDayKeys = useMemo(() => visibleDays.map(d => d.key), [visibleDays]);

    // Switching to a schedule without weekend events can strip the selected day.
    // Resolved during render rather than corrected in an effect, so there is no
    // pass where the UI shows a day the current schedule does not have.
    const activeDay = visibleDayKeys.includes(selectedDay)
        ? selectedDay
        : getPreferredDayKey(visibleDayKeys);

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
        () => selectedSchedules.map(s => filterByDay(s, activeDay)),
        [selectedSchedules, activeDay],
    );

    // Common breaks (comparison mode only)
    const commonBreaks = useMemo(() => {
        if (!comparisonMode || filteredSchedules.length !== 2) return [];
        const [a, b] = filteredSchedules;
        if (!a || !b) return [];

        const aStart = timeToMinutes(a.startTime ?? DEFAULT_START_TIME);
        const bStart = timeToMinutes(b.startTime ?? DEFAULT_START_TIME);
        const aEnd = timeToMinutes(a.endTime ?? DEFAULT_END_TIME);
        const bEnd = timeToMinutes(b.endTime ?? DEFAULT_END_TIME);

        const start = Math.max(aStart, bStart);
        const end = Math.min(aEnd, bEnd);
        if (end <= start) return [];

        return findCommonBreaksInRange(a.events, b.events, minutesToTime(start), minutesToTime(end), 15);
    }, [comparisonMode, filteredSchedules]);

    // Read on every render rather than memoised: the minute tick above already
    // re-renders, which is what carries this across midnight.
    const todayKey = getActualTodayKey();
    const isToday = activeDay === todayKey;
    const weekTodayKey = visibleDayKeys.includes(todayKey) ? todayKey : null;

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

    /** Week view drops comparison and keeps the first schedule. */
    const showWeekView = useCallback(() => {
        setComparisonMode(prev => {
            if (prev) setSelectedSchedules(current => current.slice(0, 1));
            return false;
        });
        setIsWeekView(true);
    }, []);

    const showDayView = useCallback((day: string) => {
        setSelectedDay(day);
        setIsWeekView(false);
    }, []);

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

    const weekSchedule = selectedSchedules[0];

    return (
        <div className={`scheduler ${isHomeIsland ? "homeisland-mode" : ""}`}>
            <Helmet>
                <title>Scheduler | jerryxf</title>
                <meta name="description"
                      content="View and compare schedules" />
                <link rel="canonical" href="https://jerryxf.net/scheduler" />
            </Helmet>

            <div className="scheduler-header">
                {!isHomeIsland && <h1 className="scheduler-title">Schedule viewer</h1>}

                <div className="scheduler-controls">
                    <div className="scheduler-controls-left">
                        {!isHomeIsland && !isWeekView && (
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
                            <>
                                <span className="scheduler-divider" aria-hidden="true" />

                                <button
                                    className={`scheduler-day-btn ${isWeekView ? "scheduler-day-btn-active" : ""}`}
                                    onClick={showWeekView}
                                    aria-pressed={isWeekView}
                                >
                                    Week
                                </button>

                                <div className="scheduler-day-buttons">
                                    {visibleDays.map(day => (
                                        <button
                                            key={day.key}
                                            className={`scheduler-day-btn ${!isWeekView && activeDay === day.key ? "scheduler-day-btn-active" : ""}`}
                                            onClick={() => showDayView(day.key)}
                                        >
                                            {day.label.slice(0, 3)}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="scheduler-controls-right">
                        {!isHomeIsland && !isWeekView && comparisonMode && commonBreaks.length > 0 && (
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
                {isWeekView && weekSchedule ? (
                    <WeekSchedule
                        schedule={weekSchedule}
                        days={visibleDays}
                        todayKey={weekTodayKey}
                        nowMinutes={nowMinutes}
                    />
                ) : (
                    <div className="scheduler-schedules">
                        {filteredSchedules.map((schedule, i) => (
                            <Schedule
                                key={`${schedule.id}-${activeDay}-${i}`}
                                schedule={schedule}
                                breakPeriods={commonBreaks}
                                showBreaks={comparisonMode}
                                isToday={isToday}
                                nowMinutes={nowMinutes}
                                dayKey={activeDay}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Scheduler;
