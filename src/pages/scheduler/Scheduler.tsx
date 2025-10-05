import React, {useState, useEffect} from "react";
import Schedule from "./components/Schedule";
import {Schedule as ScheduleType} from "../../types/schedule";
import {findCommonBreaksInRange, timeToMinutes, minutesToTime} from "./timeUtils.ts";
import schedules from "./schedules";
import "./Scheduler.scss";

const DAYS_OF_WEEK = [
    {key: "monday", label: "Monday"},
    {key: "tuesday", label: "Tuesday"},
    {key: "wednesday", label: "Wednesday"},
    {key: "thursday", label: "Thursday"},
    {key: "friday", label: "Friday"},
    {key: "saturday", label: "Saturday"},
    {key: "sunday", label: "Sunday"},
];

const Scheduler: React.FC = () => {
    // Initialize with saved schedule or default to jerry
    const getInitialSchedule = () => {
        const savedScheduleId = localStorage.getItem('scheduler-last-selected-person');
        if (savedScheduleId) {
            const savedSchedule = schedules.find((s) => s.id === savedScheduleId);
            if (savedSchedule) {
                return [savedSchedule];
            }
        }
        return schedules.slice(0, 1);
    };

    const [selectedSchedules, setSelectedSchedules] = useState<ScheduleType[]>(getInitialSchedule);
    const [comparisonMode, setComparisonMode] = useState(false);
    const getInitialDay = () => {
        const now = new Date();
        const hour = now.getHours();
        const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        let dayIndex = now.getDay();
        if (hour >= 18) {
            dayIndex = (dayIndex + 1) % 7;
        }
        return days[dayIndex];
    };
    const [selectedDay, setSelectedDay] = useState(getInitialDay());

    // Save selected person to localStorage whenever it changes
    useEffect(() => {
        if (!comparisonMode && selectedSchedules.length > 0 && selectedSchedules[0]) {
            localStorage.setItem('scheduler-last-selected-person', selectedSchedules[0].id);
        }
    }, [selectedSchedules, comparisonMode]);

    // Filter events by selected day - FIXED: only include events that explicitly match the selected day
    const getScheduleForDay = (schedule: ScheduleType): ScheduleType => ({
        ...schedule,
        events: schedule.events.filter(event => event.day === selectedDay)
    });

    const filteredSchedules = selectedSchedules.map(getScheduleForDay);

    // Defaults
    const defaultStartTime = "08:00";
    const defaultEndTime = "18:00";

    const getDisplayWindow = (s: ScheduleType) => ({
        start: s.startTime ?? defaultStartTime,
        end: s.endTime ?? defaultEndTime,
    });

    // Common breaks for selected day
    const commonBreaks = (() => {
        if (!comparisonMode || filteredSchedules.length !== 2) return [] as { startTime: string; endTime: string }[];
        const [a, b] = filteredSchedules;
        if (!a || !b) return [];
        const aWin = getDisplayWindow(a);
        const bWin = getDisplayWindow(b);
        const start = Math.max(timeToMinutes(aWin.start), timeToMinutes(bWin.start));
        const end = Math.min(timeToMinutes(aWin.end), timeToMinutes(bWin.end));
        if (end <= start) return [];
        return findCommonBreaksInRange(a.events, b.events, minutesToTime(start), minutesToTime(end), 15);
    })();

    const toggleComparisonMode = () => {
        if (comparisonMode) {
            setSelectedSchedules(schedules.slice(0, 1));
            setComparisonMode(false);
        } else {
            const jerry = schedules.find((s) => s.id === "jerry") ?? schedules[0];
            if (!jerry) {
                setComparisonMode(false);
                return;
            }
            setSelectedSchedules([jerry, jerry]);
            setComparisonMode(true);
        }
    };

    const handleScheduleSelect = (scheduleIndex: number, newScheduleId: string) => {
        const newSchedule = schedules.find((s) => s.id === newScheduleId);
        if (newSchedule) {
            const updated = [...selectedSchedules];
            updated[scheduleIndex] = newSchedule;
            setSelectedSchedules(updated);
        }
    };

    const handleSingleScheduleSelect = (newScheduleId: string) => {
        const newSchedule = schedules.find((s) => s.id === newScheduleId);
        if (newSchedule) setSelectedSchedules([newSchedule]);
    };

    return (
        <div className="scheduler">
            <div className="scheduler-header">
                <h1 className="scheduler-title">Schedule viewer</h1>

                {/* Controls row */}
                <div className="scheduler-controls">
                    <div className="scheduler-controls-left">
                        <button
                            className={`scheduler-toggle ${comparisonMode ? "scheduler-toggle-active" : ""}`}
                            onClick={toggleComparisonMode}
                            aria-pressed={comparisonMode}
                            title={comparisonMode ? "Single View" : "Compare"}
                        >
                            {comparisonMode ? "Single View" : "Compare"}
                        </button>

                        {/* Schedule selectors */}
                        {comparisonMode ? (
                            <div className="scheduler-selectors-inline">
                                {selectedSchedules.map((selected, index) => (
                                    <div key={index} className="scheduler-select-group">
                                        <label className="scheduler-select-label">Schedule {index + 1}:</label>
                                        <select
                                            value={selected.id}
                                            onChange={(e) => handleScheduleSelect(index, e.target.value)}
                                            className="scheduler-select"
                                        >
                                            {schedules.map((schedule) => (
                                                <option key={schedule.id} value={schedule.id}>{schedule.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="scheduler-select-group">
                                <label className="scheduler-select-label">Schedule:</label>
                                <select
                                    value={selectedSchedules[0]?.id ?? "jerry"}
                                    onChange={(e) => handleSingleScheduleSelect(e.target.value)}
                                    className="scheduler-select"
                                >
                                    {schedules.map((schedule) => (
                                        <option key={schedule.id} value={schedule.id}>{schedule.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Day selector */}
                        <div className="scheduler-day-buttons">
                            {DAYS_OF_WEEK.map((day) => (
                                <button
                                    key={day.key}
                                    className={`scheduler-day-btn ${selectedDay === day.key ? "scheduler-day-btn-active" : ""}`}
                                    onClick={() => setSelectedDay(day.key)}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="scheduler-controls-right">
                        {comparisonMode && commonBreaks.length > 0 && (
                            <div className="scheduler-break-info">
                                <span className="scheduler-break-count">
                                    {commonBreaks.length} common free time{commonBreaks.length !== 1 ? "s" : ""}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Schedules */}
            <div className="scheduler-content">
                <div className="scheduler-schedules">
                    {filteredSchedules.map((schedule, index) => (
                        <Schedule
                            key={`${schedule.id}-${selectedDay}-${index}`}
                            schedule={schedule}
                            breakPeriods={commonBreaks}
                            showBreaks={comparisonMode}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Scheduler;
