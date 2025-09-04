import {Schedule as ScheduleType} from "../../types/schedule";

const subjectColors = {
    biology: "#c1e1c1",    // pastel green
    chemistry: "#ffe5b4",  // pastel peach
    english: "#cbaacb",    // lavender
    french: "#a8dadc",     // soft teal
    math: "#b0e0e6",       // powder blue
    philosophy: "#fff9c4", // soft yellow
    physics: "#fad2e1",    // light pink
    sport: "#ffc1c1",      // soft coral
    default: "#e0e0e0"     // light gray
};


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
            {day: "monday", id: "CHI-B01", title: "Chimie générale", startTime: "8:30", endTime: "10:20", color: subjectColors.chemistry},
            {day: "monday", id: "PHY-BP1", title: "Mécanique", startTime: "10:30", endTime: "12:20", color: subjectColors.physics},
            {day: "monday", id: "MAT-BP1", title: "Fonctions et calcul", startTime: "13:30", endTime: "15:20", color: subjectColors.math},
            {day: "monday", id: "TIC-PN1", title: "TIC", startTime: "15:30", endTime: "17:20", color: subjectColors.default}, // light gray for TIC
            //endregion
            //region Tuesday
            {day: "tuesday", id: "PHI-B01", title: "Philosophie", startTime: "8:30", endTime: "10:20", color: subjectColors.philosophy},
            {day: "tuesday", id: "CHI-B01", title: "Chimie générale", startTime: "11:30", endTime: "12:20", color: subjectColors.chemistry},
            {day: "tuesday", id: "LIT-B01", title: "Littérature", startTime: "13:30", endTime: "15:20", color: subjectColors.english},
            //endregion
            //region Wednesday
            {day: "wednesday", id: "ANN-BA1", title: "English A", startTime: "8:30", endTime: "10:20", color: subjectColors.english},
            {day: "wednesday", id: "MAT-BP1", title: "Fonctions et calcul", startTime: "10:30", endTime: "12:20", color: subjectColors.math},
            {day: "wednesday", id: "PHY-BP1", title: "Mécanique", startTime: "15:30", endTime: "17:20", color: subjectColors.physics},
            //endregion
            //region Thursday
            {day: "thursday", id: "LIT-B01", title: "Littérature", startTime: "8:30", endTime: "10:20", color: subjectColors.french},
            {day: "thursday", id: "PHI-B01", title: "Philosophie", startTime: "13:30", endTime: "15:20", color: subjectColors.philosophy},
            {day: "thursday", id: "CHI-B01", title: "Chimie générale", startTime: "15:30", endTime: "17:20", color: subjectColors.chemistry},
            //endregion
            //region Friday
            {day: "friday", id: "ANN-BA1", title: "English A", startTime: "11:30", endTime: "12:20", color: subjectColors.english},
            {day: "friday", id: "MAT-BP1", title: "Fonctions et calcul", startTime: "13:30", endTime: "14:20", color: subjectColors.math},
            {day: "friday", id: "PHY-BP1", title: "Mécanique", startTime: "14:30", endTime: "15:20", color: subjectColors.physics},
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
            {
                day: "monday",
                id: "201-SN2-RE",
                title: "Calcul différentiel",
                startTime: "08:30",
                endTime: "10:00",
                location: "N-429",
                color: subjectColors.math
            },
            {
                day: "monday",
                id: "345-102-MQ",
                title: "World views",
                startTime: "10:00",
                endTime: "11:30",
                location: "N-429",
                color: subjectColors.philosophy
            },
            {
                day: "monday",
                id: "202-SN1-RE",
                title: "Chimie générale",
                startTime: "11:30",
                endTime: "13:00",
                location: "D-244",
                color: subjectColors.chemistry
            },
            //endregion
            //region Tuesday
            {
                day: "tuesday",
                id: "603-101-MA",
                title: "English",
                startTime: "08:00",
                endTime: "10:00",
                location: "A-311",
                color: subjectColors.english
            },
            {
                day: "tuesday",
                id: "201-SN2-RE",
                title: "Calcul différentiel",
                startTime: "14:00",
                endTime: "16:00",
                location: "A-320",
                color: subjectColors.math
            },
            //endregion
            //region Wednesday
            {
                day: "wednesday",
                id: "345-102-MQ",
                title: "World views",
                startTime: "11:00",
                endTime: "12:30",
                location: "N-429",
                color: subjectColors.philosophy
            },
            {
                day: "wednesday",
                id: "202-SN1-RE",
                title: "Chimie générale",
                startTime: "14:00",
                endTime: "15:30",
                location: "A-502",
                color: subjectColors.chemistry
            },
            {
                day: "wednesday",
                id: "203-SN1-RE",
                title: "Mécanique",
                startTime: "16:00",
                endTime: "18:00",
                location: "A-476",
                color: subjectColors.physics
            },
            //endregion
            //region Thursday
            {
                day: "thursday",
                id: "201-SN2-RE",
                title: "Calcul différentiel",
                startTime: "08:30",
                endTime: "10:00",
                location: "N-429",
                color: subjectColors.math
            },
            {
                day: "thursday",
                id: "602-UF0-MQ",
                title: "French",
                startTime: "11:30",
                endTime: "14:00",
                location: "N-429",
                color: subjectColors.french
            },
            {
                day: "thursday",
                id: "202-SN1-RE",
                title: "Chimie générale",
                startTime: "16:00",
                endTime: "18:00",
                location: "A-516",
                color: subjectColors.chemistry
            },
            //endregion
            //region Friday
            {
                day: "friday",
                id: "603-101-MA",
                title: "English",
                startTime: "08:00",
                endTime: "10:00",
                location: "A-401",
                color: subjectColors.english
            },
            {
                day: "friday",
                id: "203-SN1-RE",
                title: "Mécanique",
                startTime: "10:00",
                endTime: "13:00",
                location: "B-429",
                color: subjectColors.physics
            },
            //endregion
        ],
    },
    {
        id: "test",
        name: "Test Schedule",
        slotMinutes: 30,
        events: [
            {id: "event1", title: "Event 1", startTime: "08:00", endTime: "09:30", color: subjectColors.sport},
            {id: "event2", title: "Event 2", startTime: "11:00", endTime: "12:00", color: subjectColors.philosophy},
            {id: "event3", title: "Event 3", startTime: "13:30", endTime: "15:00", color: subjectColors.biology},
            {id: "event4", title: "Event 4", startTime: "16:00", endTime: "17:30", color: subjectColors.math},
        ]
    }
];

export default schedules;
