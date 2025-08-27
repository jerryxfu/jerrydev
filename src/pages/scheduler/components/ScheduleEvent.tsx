import React from 'react';
import { ScheduleEvent as ScheduleEventType } from '../../../types/schedule';
import { timeToMinutes } from '../../../utils/timeUtils';
import './ScheduleEvent.scss';

interface ScheduleEventProps {
  event: ScheduleEventType;
  isCurrent?: boolean;
  isNext?: boolean;
  startHour?: number;
  hourHeight?: number;
}

const ScheduleEvent: React.FC<ScheduleEventProps> = ({
  event,
  isCurrent = false,
  isNext = false,
  startHour = 8,
  hourHeight = 40
}) => {
  const startMinutes = timeToMinutes(event.startTime);
  const endMinutes = timeToMinutes(event.endTime);
  const duration = endMinutes - startMinutes;

  // Calculate position from start of day (startHour)
  const offsetFromStart = startMinutes - (startHour * 60);
  const top = (offsetFromStart / 60) * hourHeight;
  const height = (duration / 60) * hourHeight;

  const classNames = [
    'schedule-event',
    isCurrent && 'schedule-event--current',
    isNext && 'schedule-event--next'
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classNames}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: event.color || '#3b82f6'
      }}
    >
      <div className="schedule-event__content">
        <div className="schedule-event__title">{event.title}</div>
        <div className="schedule-event__time">
          {event.startTime}-{event.endTime}
        </div>
        {event.location && (
          <div className="schedule-event__location">{event.location}</div>
        )}
      </div>
    </div>
  );
};

export default ScheduleEvent;
