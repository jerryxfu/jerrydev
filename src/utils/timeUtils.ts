import { ScheduleEvent, BreakPeriod } from '../types/schedule';

export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const getCurrentTime = (): string => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

export const isCurrentEvent = (event: ScheduleEvent): boolean => {
  const now = getCurrentTime();
  const nowMinutes = timeToMinutes(now);
  const startMinutes = timeToMinutes(event.startTime);
  const endMinutes = timeToMinutes(event.endTime);

  return nowMinutes >= startMinutes && nowMinutes < endMinutes;
};

export const getNextEvent = (events: ScheduleEvent[]): ScheduleEvent | null => {
  const now = getCurrentTime();
  const nowMinutes = timeToMinutes(now);

  const upcomingEvents = events
    .filter(event => timeToMinutes(event.startTime) > nowMinutes)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  return upcomingEvents[0] || null;
};

export const findCommonBreaks = (schedule1: ScheduleEvent[], schedule2: ScheduleEvent[]): BreakPeriod[] => {
  const breaks: BreakPeriod[] = [];
  const startHour = 8; // 8 AM
  const endHour = 18;  // 6 PM

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) { // Check every 30 minutes
      const currentTime = minutesToTime(hour * 60 + minute);
      const nextTime = minutesToTime(hour * 60 + minute + 30);

      const hasEvent1 = schedule1.some(event =>
        timeToMinutes(event.startTime) <= hour * 60 + minute &&
        timeToMinutes(event.endTime) > hour * 60 + minute
      );

      const hasEvent2 = schedule2.some(event =>
        timeToMinutes(event.startTime) <= hour * 60 + minute &&
        timeToMinutes(event.endTime) > hour * 60 + minute
      );

      if (!hasEvent1 && !hasEvent2) {
        // Check if this break can be merged with the previous one
        const lastBreak = breaks[breaks.length - 1];
        if (lastBreak && lastBreak.endTime === currentTime) {
          lastBreak.endTime = nextTime;
        } else {
          breaks.push({ startTime: currentTime, endTime: nextTime });
        }
      }
    }
  }

  return breaks;
};
