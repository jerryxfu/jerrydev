export interface ScheduleEvent {
    id: string;
    title: string;
    startTime: string; // Format: "HH:MM"
    endTime: string;   // Format: "HH:MM"
    color?: string;
    location?: string;
    day?: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday" | string;
}

export interface TimeSlot {
    hour: number;
    minute: number;
    label: string;
    endHour?: number;
    endMinute?: number;
    endLabel?: string;
}

export interface Schedule {
    id: string;
    name: string;
    events: ScheduleEvent[];
    // Optional per-schedule display configuration
    // If timeSlots is provided, it will be used to render the time column.
    // Otherwise, startTime/endTime with optional slotMinutes will be used to generate slots.
    startTime?: string; // Format: "HH:MM" (24h)
    endTime?: string;   // Format: "HH:MM" (24h)
    slotMinutes?: number; // Size of auto-generated slots in minutes (default 60)
    timeSlots?: TimeSlot[]; // Explicit time slots for manual control
}

export interface BreakPeriod {
    startTime: string;
    endTime: string;
}
