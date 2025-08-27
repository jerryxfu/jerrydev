export interface ScheduleEvent {
  id: string;
  title: string;
  startTime: string; // Format: "HH:MM"
  endTime: string;   // Format: "HH:MM"
  color?: string;
  location?: string;
}

export interface Schedule {
  id: string;
  name: string;
  events: ScheduleEvent[];
}

export interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
}

export interface BreakPeriod {
  startTime: string;
  endTime: string;
}
