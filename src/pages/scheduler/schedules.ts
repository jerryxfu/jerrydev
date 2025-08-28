import {Schedule as ScheduleType} from "../../types/schedule";

// Centralized schedule configuration for easier editing and adding
// Times are 24h format: "HH:MM"
const schedules: ScheduleType[] = [
    {
        id: "jerry",
        name: "Jerry",
        timeSlots: [
            {hour: 8, minute: 30, endHour: 9, endMinute: 20, label: "08:30", endLabel: "09:20"},
            {hour: 9, minute: 30, endHour: 10, endMinute: 20, label: "09:30", endLabel: "10:20"},
            {hour: 10, minute: 30, endHour: 11, endMinute: 20, label: "10:30", endLabel: "11:20"},
            {hour: 11, minute: 30, endHour: 12, endMinute: 20, label: "11:30", endLabel: "12:20"},
            {hour: 12, minute: 30, endHour: 13, endMinute: 20, label: "12:30", endLabel: "13:20"},
            {hour: 13, minute: 30, endHour: 14, endMinute: 20, label: "13:30", endLabel: "14:20"},
            {hour: 14, minute: 30, endHour: 15, endMinute: 20, label: "14:30", endLabel: "15:20"},
            {hour: 15, minute: 30, endHour: 16, endMinute: 20, label: "15:30", endLabel: "16:20"},
            {hour: 16, minute: 30, endHour: 17, endMinute: 20, label: "16:30", endLabel: "17:20"},

        ],
        events: [
            {id: "CHI-B01", title: "Chimie générale", startTime: "8:30", endTime: "10:20", color: "", location: "Room 101"},
            {id: "PHY-BP1", title: "Mécanique", startTime: "10:30", endTime: "12:20", color: "", location: "Lab A"},
            {id: "MAT-BP1", title: "Fonctions et calcul", startTime: "13:30", endTime: "15:20", color: "", location: "Room 205"},
            {id: "TIC-PN1", title: "TIC", startTime: "15:30", endTime: "17:20", color: "", location: "Library"},
        ],
    },
    {
        id: "2",
        name: "Friend's Schedule",
        // This schedule uses explicit custom slots (manually set)
        timeSlots: [
            {hour: 8, minute: 0, label: "8:00"},
            {hour: 8, minute: 30, label: "8:30"},
            {hour: 9, minute: 0, label: "9:00"},
            {hour: 9, minute: 30, label: "9:30"},
            {hour: 10, minute: 0, label: "10:00"},
            {hour: 10, minute: 30, label: "10:30"},
            {hour: 11, minute: 0, label: "11:00"},
            {hour: 11, minute: 30, label: "11:30"},
            {hour: 12, minute: 0, label: "12:00"},
            {hour: 12, minute: 30, label: "12:30"},
            {hour: 13, minute: 0, label: "13:00"},
            {hour: 13, minute: 30, label: "13:30"},
            {hour: 14, minute: 0, label: "14:00"},
            {hour: 14, minute: 30, label: "14:30"},
            {hour: 15, minute: 0, label: "15:00"},
            {hour: 15, minute: 30, label: "15:30"},
            {hour: 16, minute: 0, label: "16:00"},
            {hour: 16, minute: 30, label: "16:30"},
            {hour: 17, minute: 0, label: "17:00"},
            {hour: 17, minute: 30, label: "17:30"},
        ],
        events: [
            {id: "SN2-RE", title: "Calcul différentiel", startTime: "08:30", endTime: "10:00", color: "#8b5cf6", location: "Lab B"},
            {id: "MQ", title: "World views", startTime: "10:00", endTime: "11:30", color: "#06b6d4", location: "Room 150"},
            {id: "SN1-RE", title: "Chimie générale", startTime: "11:30", endTime: "13:00", color: "#f97316", location: "Room 301"},
        ],
    },
];

export default schedules;

