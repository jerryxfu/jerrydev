import React, {useState} from "react";
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
    const [selectedSchedules, setSelectedSchedules] = useState<ScheduleType[]>(() => schedules.slice(0, 1));
    const [comparisonMode, setComparisonMode] = useState(false);
    const [selectedDay, setSelectedDay] = useState("monday");

    // Filter events by selected day
    const getScheduleForDay = (schedule: ScheduleType): ScheduleType => ({
        ...schedule,
        events: schedule.events.filter(event => !event.day || event.day === selectedDay)
    });

    const filteredSchedules = selectedSchedules.map(getScheduleForDay);

    // Optionally, a global default display window when no per-schedule override
    const defaultStartTime = "08:00";
    const defaultEndTime = "18:00";

    // Helper to get display window for a schedule (uses per-schedule config if present)
    const getDisplayWindow = (s: ScheduleType) => ({
        start: s.startTime ?? defaultStartTime,
        end: s.endTime ?? defaultEndTime,
    });

    // Calculate common breaks when in comparison mode, respecting overlapping display ranges
    const commonBreaks = (() => {
        if (!comparisonMode || filteredSchedules.length !== 2) return [] as { startTime: string; endTime: string }[];
        const [a, b] = filteredSchedules;
        if (!a || !b) return [];
        const aWin = getDisplayWindow(a);
        const bWin = getDisplayWindow(b);
        const start = Math.max(timeToMinutes(aWin.start), timeToMinutes(bWin.start));
        const end = Math.min(timeToMinutes(aWin.end), timeToMinutes(bWin.end));
        if (end <= start) return [];
        // Use 15-minute steps for more precise break detection
        return findCommonBreaksInRange(a.events, b.events, minutesToTime(start), minutesToTime(end), 15);
    })();

    const toggleComparisonMode = () => {
        if (comparisonMode) {
            setSelectedSchedules(schedules.slice(0, 1));
            setComparisonMode(false);
        } else {
            setSelectedSchedules(schedules.slice(0, 2));
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

    return (
        <div className="scheduler">
            {/* Mode toggle */}
            <div className="scheduler__header">
                <h1 className="scheduler__title">Schedule viewer</h1>
            </div>
            <div>
                <button
                    className={`scheduler__toggle ${
                        comparisonMode ? "scheduler__toggle--active" : ""
                    }`}
                    onClick={toggleComparisonMode}
                >
                    {comparisonMode ? "Single View" : "Compare"}
                </button>
            </div>
            {comparisonMode && (
                <div className="scheduler__selector">
                    {selectedSchedules.map((selected, index) => (
                        <div key={index} className="scheduler__select-group">
                            <label className="scheduler__select-label">
                                Schedule {index + 1}:
                            </label>
                            <select
                                value={selected.id}
                                onChange={(e) =>
                                    handleScheduleSelect(index, e.target.value)
                                }
                                className="scheduler__select"
                            >
                                {schedules.map((schedule) => (
                                    <option key={schedule.id} value={schedule.id}>
                                        {schedule.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}

                    {/* Day Navigation */}
                    <div className="scheduler__day-nav">
                        <div className="scheduler__day-buttons">
                            {DAYS_OF_WEEK.map((day) => (
                                <button
                                    key={day.key}
                                    className={`scheduler__day-btn ${
                                        selectedDay === day.key ? "scheduler__day-btn--active" : ""
                                    }`}
                                    onClick={() => setSelectedDay(day.key)}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Break counter */}
                    {commonBreaks.length > 0 && (
                        <div className="scheduler__break-info">
							<span className="scheduler__break-count">
								{commonBreaks.length} common free time
                                {commonBreaks.length !== 1 ? "s" : ""} found
							</span>
                        </div>
                    )}
                </div>
            )}

            <div className="scheduler__content">
                <div className="scheduler__schedules">
                    {filteredSchedules.map((schedule, index) => (
                        <Schedule
                            key={`${schedule.id}-${index}`}
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
