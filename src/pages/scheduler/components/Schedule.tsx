import React from 'react';
import { Schedule as ScheduleType, BreakPeriod } from '../../../types/schedule';
import ScheduleEvent from './ScheduleEvent';
import { isCurrentEvent, getNextEvent, timeToMinutes } from '../../../utils/timeUtils';
import './Schedule.scss';

interface ScheduleProps {
  schedule: ScheduleType;
  startHour?: number;
  endHour?: number;
  breakPeriods?: BreakPeriod[];
  showBreaks?: boolean;
}

const Schedule: React.FC<ScheduleProps> = ({
  schedule,
  startHour = 8,
  endHour = 18,
  breakPeriods = [],
  showBreaks = false
}) => {
  const nextEvent = getNextEvent(schedule.events);
  const totalHours = endHour - startHour + 1;
  const hourHeight = 40; // Reduced from 60px to 40px
  const containerHeight = totalHours * hourHeight;

  // Generate time slots
  const timeSlots = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    timeSlots.push(hour);
  }

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12AM';
    if (hour < 12) return `${hour}AM`;
    if (hour === 12) return '12PM';
    return `${hour - 12}PM`;
  };

  const renderBreakPeriod = (breakPeriod: BreakPeriod, index: number) => {
    const startMinutes = timeToMinutes(breakPeriod.startTime);
    const endMinutes = timeToMinutes(breakPeriod.endTime);
    const duration = endMinutes - startMinutes;

    const offsetFromStart = startMinutes - (startHour * 60);
    const top = (offsetFromStart / 60) * hourHeight;
    const height = (duration / 60) * hourHeight;

    return (
      <div
        key={`break-${index}`}
        className="schedule-break"
        style={{
          top: `${top}px`,
          height: `${height}px`
        }}
      >
        <div className="schedule-break__content">
          <span className="schedule-break__label">Free</span>
          <span className="schedule-break__time">
            {breakPeriod.startTime}-{breakPeriod.endTime}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="schedule">
      <div className="schedule__header">
        <h3 className="schedule__title">{schedule.name}</h3>
      </div>
      <div className="schedule__container">
        {/* Integrated Time Column */}
        <div className="schedule__time-column">
          {timeSlots.map((hour) => (
            <div
              key={hour}
              className="schedule__time-slot"
              style={{ height: `${hourHeight}px` }}
            >
              <span className="schedule__time-label">{formatHour(hour)}</span>
            </div>
          ))}
        </div>

        {/* Events Grid */}
        <div
          className="schedule__grid"
          style={{ height: `${containerHeight}px` }}
        >
          {/* Hour grid lines */}
          {Array.from({ length: totalHours }, (_, i) => (
            <div
              key={i}
              className="schedule__hour-line"
              style={{ top: `${i * hourHeight}px` }}
            />
          ))}

          {/* Break periods (for comparison mode) */}
          {showBreaks && breakPeriods.map(renderBreakPeriod)}

          {/* Events */}
          {schedule.events.map((event) => (
            <ScheduleEvent
              key={event.id}
              event={event}
              isCurrent={isCurrentEvent(event)}
              isNext={nextEvent?.id === event.id}
              startHour={startHour}
              hourHeight={hourHeight}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Schedule;