import {Schedule as ScheduleType} from "../../types/schedule";

const schedules: ScheduleType[] = [
    {
        id: "jerry",
        name: "Jerry",
        // startTime:"8:30",
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
            //region Monday
            {day: "monday", id: "CHI-B01", title: "Chimie générale", startTime: "8:30", endTime: "10:20"},
            {day: "monday", id: "PHY-BP1", title: "Mécanique", startTime: "10:30", endTime: "12:20"},
            {day: "monday", id: "MAT-BP1", title: "Fonctions et calcul", startTime: "13:30", endTime: "15:20"},
            {day: "monday", id: "TIC-PN1", title: "TIC", startTime: "15:30", endTime: "17:20"},
            //endregion
            //region Tuesday
            {day: "tuesday", id: "PHI-B01", title: "Philosophie", startTime: "8:30", endTime: "10:20"},
            {day: "tuesday", id: "CHI-B01", title: "Chimie générale", startTime: "11:30", endTime: "12:20"},
            {day: "tuesday", id: "LIT-B01", title: "Littérature", startTime: "13:30", endTime: "15:20"},
            //endregion
            //region Wednesday
            {day: "wednesday", id: "ANN-BA1", title: "English A", startTime: "8:30", endTime: "10:20"},
            {day: "wednesday", id: "MAT-BP1", title: "Fonctions et calcul", startTime: "10:30", endTime: "12:20"},
            {day: "wednesday", id: "PHY-BP1", title: "Mécanique", startTime: "15:30", endTime: "17:20"},
            //endregion
            //region Thursday
            {day: "thursday", id: "LIT-B01", title: "Littérature", startTime: "8:30", endTime: "10:20"},
            {day: "thursday", id: "PHI-B01", title: "Philosophie", startTime: "13:30", endTime: "15:20"},
            {day: "thursday", id: "CHI-B01", title: "Chimie générale", startTime: "15:30", endTime: "17:20"},
            //endregion
            //region Friday
            {day: "friday", id: "ANN-BA1", title: "English A", startTime: "11:30", endTime: "12:20"},
            {day: "friday", id: "MAT-BP1", title: "Fonctions et calcul", startTime: "13:30", endTime: "14:20"},
            {day: "friday", id: "PHY-BP1", title: "Mécanique", startTime: "14:30", endTime: "15:20"},
            //endregion
        ],
    },
    {
        id: "iris",
        name: "Iris",
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
            //region Monday
            {day: "monday", id: "201-SN2-RE", title: "Calcul différentiel", startTime: "08:30", endTime: "10:00", location: "N-429"},
            {day: "monday", id: "345-102-MQ", title: "World views", startTime: "10:00", endTime: "11:30", location: "N-429"},
            {day: "monday", id: "202-SN1-RE", title: "Chimie générale", startTime: "11:30", endTime: "13:00", location: "D-244"},
            //endregion
            //region Tuesday
            {day: "tuesday", id: "603-101-MA", title: "English", startTime: "08:00", endTime: "10:00", location: "A-311"},
            {day: "tuesday", id: "201-SN2-RE", title: "Calcul différentiel", startTime: "14:00", endTime: "16:00", location: "A-320"},
            //endregion
            //region Wednesday
            {day: "wednesday", id: "345-102-MQ", title: "World views", startTime: "11:00", endTime: "12:30", location: "N-429"},
            {day: "wednesday", id: "202-SN1-RE", title: "Chimie générale", startTime: "14:00", endTime: "15:30", location: "A-502"},
            {day: "wednesday", id: "203-SN1-RE", title: "Mécanique", startTime: "16:00", endTime: "18:00", location: "A-476"},
            //endregion
            //region Thursday
            {day: "thursday", id: "201-SN2-RE", title: "Calcul différentiel", startTime: "08:30", endTime: "10:00", location: "N-429"},
            {day: "thursday", id: "602-UF0-MQ", title: "French", startTime: "11:30", endTime: "14:00", location: "N-429"},
            {day: "thursday", id: "202-SN1-RE", title: "Chimie générale", startTime: "16:00", endTime: "18:00", location: "A-516"},
            //endregion
            //region Friday
            {day: "friday", id: "603-101-MA", title: "English", startTime: "08:00", endTime: "10:00", location: "A-401"},
            {day: "friday", id: "203-SN1-RE", title: "Mécanique", startTime: "10:00", endTime: "13:00", location: "B-429"},
            //endregion
        ],
    },
];

export default schedules;
