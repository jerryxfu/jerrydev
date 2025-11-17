import {Schedule as ScheduleType} from "../../types/schedule";

const subjectColors = {
    biology: "#c1e1c1",     // green
    medicine: "#d4f4dd",    // light green
    chemistry: "#ffe5b4",   // peach
    english: "#cbaacb",     // lavender
    french: "#a8dadc",      // teal
    math: "#b0e0e6",        // blue
    humanities: "#fff9c4",  // yellow
    social: "#f9c4ff",      // lilac-pink
    physics: "#fad2e1",     // pink
    sport: "#ffc1c1",       // coral
    default: "#e0e0e0"      // gray
};


const scheduleConfig: ScheduleType[] = [
    {
        id: "jerry",
        name: "Jerry",
        timeSlots: [
            {hour: 8, minute: 30, endHour: 9, endMinute: 20},
            {hour: 9, minute: 30, endHour: 10, endMinute: 20},
            {hour: 10, minute: 30, endHour: 11, endMinute: 20},
            {hour: 11, minute: 30, endHour: 12, endMinute: 20},
            {hour: 12, minute: 30, endHour: 13, endMinute: 20},
            {hour: 13, minute: 30, endHour: 14, endMinute: 20},
            {hour: 14, minute: 30, endHour: 15, endMinute: 20},
            {hour: 15, minute: 30, endHour: 16, endMinute: 20},
            {hour: 16, minute: 30, endHour: 17, endMinute: 20},
        ],
        events: [
            //region Monday
            {
                day: "monday",
                id: "CHI-B01",
                title: "Chimie générale",
                startTime: "8:30",
                endTime: "10:20",
                location: "G2-75",
                color: subjectColors.chemistry
            },
            {day: "monday", id: "PHY-BP1", title: "Mécanique", startTime: "10:30", endTime: "12:20", location: "G2-58", color: subjectColors.physics},
            {
                day: "monday",
                id: "MAT-BP1",
                title: "Fonctions et calcul",
                startTime: "13:30",
                endTime: "15:20",
                location: "G1-75",
                color: subjectColors.math
            },
            // {day: "monday", id: "TIC-PN1", title: "TIC", startTime: "15:30", endTime: "17:20", location: "A2-24", color: subjectColors.default}, // light gray for TIC
            //endregion
            //region Tuesday
            {
                day: "tuesday",
                id: "PHI-B01",
                title: "Philosophie",
                startTime: "8:30",
                endTime: "10:20",
                location: "D3-06",
                color: subjectColors.humanities
            },
            {
                day: "tuesday",
                id: "CHI-B01",
                title: "Chimie générale",
                startTime: "11:30",
                endTime: "12:20",
                location: "G1-76",
                color: subjectColors.chemistry
            },
            {
                day: "tuesday",
                id: "LIT-B01",
                title: "Littérature",
                startTime: "13:30",
                endTime: "15:20",
                location: "D3-36",
                color: subjectColors.french
            },
            //endregion
            //region Wednesday
            {
                day: "wednesday",
                id: "ANN-BA1",
                title: "English A",
                startTime: "8:30",
                endTime: "10:20",
                location: "G1-114",
                color: subjectColors.english
            },
            {
                day: "wednesday",
                id: "MAT-BP1",
                title: "Fonctions et calcul",
                startTime: "10:30",
                endTime: "12:20",
                location: "A2-25",
                color: subjectColors.math
            },
            {
                day: "wednesday",
                id: "PHY-BP1",
                title: "Mécanique",
                startTime: "15:30",
                endTime: "17:20",
                location: "G2-59",
                color: subjectColors.physics
            },
            //endregion
            //region Thursday
            {
                day: "thursday",
                id: "LIT-B01",
                title: "Littérature",
                startTime: "8:30",
                endTime: "10:20",
                location: "D3-36",
                color: subjectColors.french
            },
            {
                day: "thursday",
                id: "PHI-B01",
                title: "Philosophie",
                startTime: "13:30",
                endTime: "15:20",
                location: "D3-06",
                color: subjectColors.humanities
            },
            {
                day: "thursday",
                id: "CHI-B01",
                title: "Chimie générale",
                startTime: "15:30",
                endTime: "17:20",
                location: "G1-76",
                color: subjectColors.chemistry
            },
            //endregion
            //region Friday
            {day: "friday", id: "ANN-BA1", title: "English A", startTime: "11:30", endTime: "12:20", location: "G1-65", color: subjectColors.english},
            {
                day: "friday",
                id: "MAT-BP1",
                title: "Fonctions et calcul",
                startTime: "13:30",
                endTime: "14:20",
                location: "G1-62",
                color: subjectColors.math
            },
            {day: "friday", id: "PHY-BP1", title: "Mécanique", startTime: "14:30", endTime: "15:20", location: "G2-58", color: subjectColors.physics},
            //endregion
        ],
    },
    {
        id: "iris",
        name: "Iris",
        timeSlots: [
            {hour: 8, minute: 0, endHour: 8, endMinute: 30},
            {hour: 8, minute: 30, endHour: 9, endMinute: 0},
            {hour: 9, minute: 0, endHour: 9, endMinute: 30},
            {hour: 9, minute: 30, endHour: 10, endMinute: 0},
            {hour: 10, minute: 0, endHour: 10, endMinute: 30},
            {hour: 10, minute: 30, endHour: 11, endMinute: 0},
            {hour: 11, minute: 0, endHour: 11, endMinute: 30},
            {hour: 11, minute: 30, endHour: 12, endMinute: 0},
            {hour: 12, minute: 0, endHour: 12, endMinute: 30},
            {hour: 12, minute: 30, endHour: 13, endMinute: 0},
            {hour: 13, minute: 0, endHour: 13, endMinute: 30},
            {hour: 13, minute: 30, endHour: 14, endMinute: 0},
            {hour: 14, minute: 0, endHour: 14, endMinute: 30},
            {hour: 14, minute: 30, endHour: 15, endMinute: 0},
            {hour: 15, minute: 0, endHour: 15, endMinute: 30},
            {hour: 15, minute: 30, endHour: 16, endMinute: 0},
            {hour: 16, minute: 0, endHour: 16, endMinute: 30},
            {hour: 16, minute: 30, endHour: 17, endMinute: 0},
            {hour: 17, minute: 0, endHour: 17, endMinute: 30},
            {hour: 17, minute: 30, endHour: 18, endMinute: 0},
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
                color: subjectColors.humanities
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
                color: subjectColors.humanities
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
        id: "sarah",
        name: "Sarah",
        timeSlots: [
            {hour: 8, minute: 0, endHour: 8, endMinute: 30},
            {hour: 8, minute: 30, endHour: 9, endMinute: 0},
            {hour: 9, minute: 0, endHour: 9, endMinute: 30},
            {hour: 9, minute: 30, endHour: 10, endMinute: 0},
            {hour: 10, minute: 0, endHour: 10, endMinute: 30},
            {hour: 10, minute: 30, endHour: 11, endMinute: 0},
            {hour: 11, minute: 0, endHour: 11, endMinute: 30},
            {hour: 11, minute: 30, endHour: 12, endMinute: 0},
            {hour: 12, minute: 0, endHour: 12, endMinute: 30},
            {hour: 12, minute: 30, endHour: 13, endMinute: 0},
            {hour: 13, minute: 0, endHour: 13, endMinute: 30},
            {hour: 13, minute: 30, endHour: 14, endMinute: 0},
            {hour: 14, minute: 0, endHour: 14, endMinute: 30},
            {hour: 14, minute: 30, endHour: 15, endMinute: 0},
            {hour: 15, minute: 0, endHour: 15, endMinute: 30},
            {hour: 15, minute: 30, endHour: 16, endMinute: 0},
            {hour: 16, minute: 0, endHour: 16, endMinute: 30},
            {hour: 16, minute: 30, endHour: 17, endMinute: 0},
            {hour: 17, minute: 0, endHour: 17, endMinute: 30},
            {hour: 17, minute: 30, endHour: 18, endMinute: 0},
        ],
        events: [
            // region Monday
            {
                day: "monday",
                id: "330-1N1-DW",
                title: "Intro to Global History",
                startTime: "14:00",
                endTime: "16:00",
                location: "3H.23",
                color: subjectColors.humanities
            },
            {
                day: "monday",
                id: "602-UF0-MQ",
                title: "French",
                startTime: "16:00",
                endTime: "17:30",
                location: "4D.3",
                color: subjectColors.french
            },
            // endregion
            // region Tuesday
            {
                day: "tuesday",
                id: "385-1N1-DW",
                title: "Intro to Political Science",
                startTime: "13:00",
                endTime: "14:30",
                location: "4P.22",
                color: subjectColors.social
            },
            {
                day: "tuesday",
                id: "383-1N1-DW",
                title: "Intro to Economics",
                startTime: "14:30",
                endTime: "16:00",
                location: "3E.9",
                color: subjectColors.social
            },
            {
                day: "tuesday",
                id: "300-1R1-DW",
                title: "Intro to Social Science Research",
                startTime: "16:00",
                endTime: "17:30",
                location: "4H.17",
                color: subjectColors.social
            },
            // endregion
            // region Wednesday
            {
                day: "wednesday",
                id: "345-101-MQ",
                title: "Knowledge: The Story of I",
                startTime: "11:30",
                endTime: "14:30",
                location: "4E.13",
                color: subjectColors.humanities
            },
            {
                day: "wednesday",
                id: "602-UFO-MQ",
                title: "French",
                startTime: "16:00",
                endTime: "17:30",
                location: "4D.3",
                color: subjectColors.french
            },
            // endregion
            // region Thursday
            {
                day: "thursday",
                id: "330-1N1-DW",
                title: "Intro to Global History",
                startTime: "10:00",
                endTime: "12:00",
                location: "3H.23",
                color: subjectColors.humanities
            },
            {
                day: "thursday",
                id: "385-1N1-DW",
                title: "Intro to Political Science",
                startTime: "13:00",
                endTime: "14:30",
                location: "4P.22",
                color: subjectColors.social
            },
            {
                day: "thursday",
                id: "383-1N1-DW",
                title: "Intro to Economics",
                startTime: "14:30",
                endTime: "16:00",
                location: "3E.9",
                color: subjectColors.social
            },
            {
                day: "thursday",
                id: "300-1R1-DW",
                title: "Intro to Social Science Research",
                startTime: "16:00",
                endTime: "17:30",
                location: "4H.17",
                color: subjectColors.social
            },
            // endregion
            // region Friday
            {
                day: "friday",
                id: "603-101-MQ",
                title: "English: The Story of I",
                startTime: "10:30",
                endTime: "14:30",
                location: "4E.13",
                color: subjectColors.english
            },
            // endregion
        ]
    },
    {
        id: "mehdi",
        name: "Mehdi",
        timeSlots: [
            {hour: 8, minute: 30, endHour: 9, endMinute: 20},
            {hour: 9, minute: 30, endHour: 10, endMinute: 20},
            {hour: 10, minute: 30, endHour: 11, endMinute: 20},
            {hour: 11, minute: 30, endHour: 12, endMinute: 20},
            {hour: 12, minute: 30, endHour: 13, endMinute: 20},
            {hour: 13, minute: 30, endHour: 14, endMinute: 20},
            {hour: 14, minute: 30, endHour: 15, endMinute: 20},
            {hour: 15, minute: 30, endHour: 16, endMinute: 20},
            {hour: 16, minute: 30, endHour: 17, endMinute: 20},
        ],
        events: [
            // region monday
            {day: "monday", id: "MAT-NP1", title: "Calcul différentiel", startTime: "8:30", endTime: "10:20", color: subjectColors.math},
            {day: "monday", id: "CHI-NP1", title: "Chimie générale", startTime: "10:30", endTime: "11:20", color: subjectColors.chemistry},
            // endregion
            // region tuesday
            {day: "tuesday", id: "ANG-G41", title: "English", startTime: "8:30", endTime: "10:20", color: subjectColors.english},
            {day: "tuesday", id: "LIT-G01", title: "Écriture et littérature", startTime: "10:30", endTime: "12:20", color: subjectColors.french},
            {day: "tuesday", id: "PHY-NP1", title: "Mécanique", startTime: "13:30", endTime: "15:20", color: subjectColors.physics},
            {day: "tuesday", id: "TIC-N00", title: "TIC", startTime: "15:30", endTime: "17:20", color: subjectColors.default},
            // endregion
            // region wednesday
            {day: "wednesday", id: "EDP-G2J", title: "Sport", startTime: "8:30", endTime: "10:20", color: subjectColors.sport},
            {day: "wednesday", id: "PHY-NP1", title: "Mécanique", startTime: "10:30", endTime: "12:20", color: subjectColors.physics},
            {day: "wednesday", id: "MAT-NP1", title: "Calcul différentiel", startTime: "14:30", endTime: "15:20", color: subjectColors.math},
            {day: "wednesday", id: "CHI-NP1", title: "Chimie générale", startTime: "15:30", endTime: "17:20", color: subjectColors.chemistry},
            // endregion
            // region thursday
            {day: "thursday", id: "DES-K0A", title: "Dessin technique", startTime: "8:30", endTime: "11:30", color: subjectColors.default},
            {day: "thursday", id: "ANG-G41", title: "English", startTime: "14:30", endTime: "15:20", color: subjectColors.english},
            {day: "thursday", id: "LIT-G01", title: "Écriture et littérature", startTime: "15:30", endTime: "17:20", color: subjectColors.french},
            // endregion
            // region friday
            {day: "friday", id: "PHY-NP1", title: "Mécanique", startTime: "8:30", endTime: "10:20", color: subjectColors.physics},
            {day: "friday", id: "CHI-NP1", title: "Chimie générale", startTime: "10:30", endTime: "12:20", color: subjectColors.chemistry},
            {day: "friday", id: "MAT-NP1", title: "Calcul différentiel", startTime: "13:30", endTime: "15:20", color: subjectColors.math},
            // endregion
        ]
    },
    {
        id: "anisia",
        name: "Anisia",
        startTime: "08:00",
        endTime: "17:00",
        timeSlots: [
            {hour: 8, minute: 0, endHour: 8, endMinute: 30},
            {hour: 8, minute: 30, endHour: 9, endMinute: 0},
            {hour: 9, minute: 0, endHour: 9, endMinute: 30},
            {hour: 9, minute: 30, endHour: 10, endMinute: 0},
            {hour: 10, minute: 0, endHour: 10, endMinute: 30},
            {hour: 10, minute: 30, endHour: 11, endMinute: 0},
            {hour: 11, minute: 0, endHour: 11, endMinute: 30},
            {hour: 11, minute: 30, endHour: 12, endMinute: 0},
            {hour: 12, minute: 0, endHour: 12, endMinute: 30},
            {hour: 12, minute: 30, endHour: 13, endMinute: 0},
            {hour: 13, minute: 0, endHour: 13, endMinute: 30},
            {hour: 13, minute: 30, endHour: 14, endMinute: 0},
            {hour: 14, minute: 0, endHour: 14, endMinute: 30},
            {hour: 14, minute: 30, endHour: 15, endMinute: 0},
            {hour: 15, minute: 0, endHour: 15, endMinute: 30},
            {hour: 15, minute: 30, endHour: 16, endMinute: 0},
            {hour: 16, minute: 0, endHour: 16, endMinute: 30},
            {hour: 16, minute: 30, endHour: 17, endMinute: 0},
            {hour: 17, minute: 0, endHour: 17, endMinute: 30},
            {hour: 17, minute: 30, endHour: 18, endMinute: 0},
        ],
        events: [
            // region Monday
            {
                day: "monday",
                id: "MMD",
                title: "MMD2111/2112/2113/2141/22261",
                startTime: "9:30",
                endTime: "11:30",
                color: subjectColors.default
            },
            {
                day: "monday",
                id: "MMD",
                title: "MMD2111/2112/2113/2141/22261",
                startTime: "16:00",
                endTime: "16:45",
                color: subjectColors.default
            },
            // endregion
            // region Tuesday
            {
                day: "tuesday",
                id: "MMD",
                title: "MMD2111/2112/2113/2141/22261",
                startTime: "08:30",
                endTime: "11:30",
                color: subjectColors.medicine
            },
            {
                day: "tuesday",
                id: "MMD",
                title: "MMD2111/2112/2113/2141/22261",
                startTime: "12:30",
                endTime: "13:30",
                color: subjectColors.medicine
            },
            {
                day: "tuesday",
                id: "MMD",
                title: "MMD2111/2112/2113/2141/22261",
                startTime: "13:45",
                endTime: "14:45",
                color: subjectColors.medicine
            },
            {
                day: "tuesday",
                id: "MMD",
                title: "MMD2111/2112/2113/2141/22261",
                startTime: "15:00",
                endTime: "16:00",
                color: subjectColors.medicine
            },
            // endregion
            // region Wednesday
            {
                day: "wednesday",
                id: "CAAHC",
                title: "MMD2111/2112/2113/2141/22261",
                startTime: "08:30",
                endTime: "11:30",
                color: subjectColors.default
            },
            {
                day: "wednesday",
                id: "MMD",
                title: "MMD2111/2112/2113/2141/22261",
                startTime: "13:00",
                endTime: "16:00",
                color: subjectColors.default
            },
            // endregion
            // region Thursday
            {
                day: "thursday",
                id: "MMD",
                title: "MMD2111/2112/2113/2141/22261",
                startTime: "08:30",
                endTime: "11:30",
                color: subjectColors.medicine
            },
            // endregion
            // region Friday
            {
                day: "friday",
                id: "MMD",
                title: "MMD2111/2112/2113/2141/22261",
                startTime: "08:30",
                endTime: "11:30",
                color: subjectColors.medicine
            },
            {
                day: "friday",
                id: "MMD",
                title: "MMD2111/2112/2113/2141/22261",
                startTime: "12:30",
                endTime: "13:30",
                color: subjectColors.medicine
            },
            {
                day: "friday",
                id: "MMD",
                title: "MMD2111/2112/2113/2141/22261",
                startTime: "13:30",
                endTime: "15:30",
                color: subjectColors.medicine
            }
        ]
    },
    {
        id: "malik", name: "Malik", startTime: "08:00", endTime: "18:00", slotMinutes: 30, events: [
            {id: "sleep01", title: "Sleep", startTime: "08:00", endTime: "12:00", color: subjectColors.default},
            {id: "sleep02", title: "Sleep", startTime: "13:00", endTime: "17:00", color: subjectColors.default},
        ]
    },
    {
        id: "test",
        name: "Test Schedule",
        slotMinutes: 30,
        events: [
            {id: "event1", title: "Event 1", startTime: "08:00", endTime: "09:30", color: subjectColors.sport},
            {id: "event2", title: "Event 2", startTime: "11:00", endTime: "12:00", color: subjectColors.humanities},
            {id: "event3", title: "Event 3", startTime: "13:30", endTime: "15:00", color: subjectColors.biology},
            {id: "event4", title: "Event 4", startTime: "16:00", endTime: "17:30", color: subjectColors.math},
        ]
    }
];

export default scheduleConfig;
