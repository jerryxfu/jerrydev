import React from 'react';
import './TimeColumn.scss';

interface TimeColumnProps {
  startHour?: number;
  endHour?: number;
}

const TimeColumn: React.FC<TimeColumnProps> = ({
  startHour = 8,
  endHour = 18
}) => {
  const hours = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    hours.push(hour);
  }

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  return (
    <div className="time-column">
      {hours.map((hour) => (
        <div key={hour} className="time-slot">
          <span className="time-label">{formatHour(hour)}</span>
        </div>
      ))}
    </div>
  );
};

export default TimeColumn;
