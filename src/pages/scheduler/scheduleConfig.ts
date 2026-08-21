import {type Schedule as ScheduleType} from "../../types/schedule";

const subjectColors = {
    biology: "#c1e1c1",     // green
    medicine: "#d4f4dd",    // light green
    chemistry: "#ffe5b4",   // peach
    english: "#cbaacb",     // lavender
    french: "#a8dadc",      // teal
    math: "#b0e0e6",        // blue
    humanities: "#fff9c4",  // yellow
    social: "#f9c4ff",      // lilac-pink
    economy: "#ffddb4",    // light orange
    politics: "#d1c4e9",   // purple
    physics: "#fad2e1",     // pink
    sport: "#ffc1c1",       // coral
    default: "#e0e0e0"      // gray
};

const BREBEUF_TIME_SLOTS = [
    {hour: 8, minute: 30, endHour: 9, endMinute: 20},
    {hour: 9, minute: 30, endHour: 10, endMinute: 20},
    {hour: 10, minute: 30, endHour: 11, endMinute: 20},
    {hour: 11, minute: 30, endHour: 12, endMinute: 20},
    {hour: 12, minute: 30, endHour: 13, endMinute: 20},
    {hour: 13, minute: 30, endHour: 14, endMinute: 20},
    {hour: 14, minute: 30, endHour: 15, endMinute: 20},
    {hour: 15, minute: 30, endHour: 16, endMinute: 20},
    {hour: 16, minute: 30, endHour: 17, endMinute: 20},
];

const scheduleConfig: ScheduleType[] = [
    {
        id: "jerry",
        name: "Jerry",
        timeSlots: BREBEUF_TIME_SLOTS,
        events: [
            //region Monday
            {
                day: "monday",
                id: "ANN-BA3",
                title: "Topics in Literature",
                startTime: "8:30",
                endTime: "10:20",
                location: "G1-118",
                color: subjectColors.english
            },
            {
                day: "monday",
                id: "MAT-BP3",
                title: "Nombres complexes, algèbre vectorielle et trigonométrie",
                startTime: "10:30",
                endTime: "11:20",
                location: "G1-75",
                color: subjectColors.math
            },
            {
                day: "monday",
                id: "CHI-BP2",
                title: "Introduction à la chimie organique et chimie des solutions",
                startTime: "13:30",
                endTime: "15:20",
                location: "G1-75",
                color: subjectColors.chemistry
            },
            {
                day: "monday",
                id: "PHY-BP3",
                title: "Ondes, optique et physique moderne",
                startTime: "15:30",
                endTime: "17:20",
                location: "G2-58",
                color: subjectColors.physics
            },
            //endregion

            //region Tuesday
            {
                day: "tuesday",
                id: "PHI-B03",
                title: "Théorie de la connaissance",
                startTime: "8:30",
                endTime: "10:20",
                location: "D3-15",
                color: subjectColors.humanities
            },
            {
                day: "tuesday",
                id: "LIT-B03",
                title: "Littérature québécoise",
                startTime: "13:30",
                endTime: "15:20",
                location: "D3-06",
                color: subjectColors.french
            },
            //endregion

            //region Wednesday
            {
                day: "wednesday",
                id: "MAT-BP3",
                title: "Nombres complexes, algèbre vectorielle et trigonométrie",
                startTime: "8:30",
                endTime: "10:20",
                location: "G1-62",
                color: subjectColors.math
            },
            {
                day: "wednesday",
                id: "PHY-BP3",
                title: "Ondes, optique et physique moderne",
                startTime: "14:30",
                endTime: "16:20",
                location: "G2-59",
                color: subjectColors.physics
            },
            //endregion

            //region Thursday
            {
                day: "thursday",
                id: "MAT-BP3",
                title: "Nombres complexes, algèbre vectorielle et trigonométrie",
                startTime: "8:30",
                endTime: "10:20",
                location: "G1-75",
                color: subjectColors.math
            },
            {
                day: "thursday",
                id: "LIT-B03",
                title: "Littérature québécoise",
                startTime: "10:30",
                endTime: "12:20",
                location: "D3-36",
                color: subjectColors.french
            },
            {
                day: "thursday",
                id: "ANN-BA3",
                title: "Topics in Literature",
                startTime: "14:30",
                endTime: "15:20",
                location: "G1-133",
                color: subjectColors.english
            },
            {
                day: "thursday",
                id: "CHI-BP2",
                title: "Introduction à la chimie organique et chimie des solutions",
                startTime: "15:30",
                endTime: "17:20",
                location: "G1-76; G2-81",
                color: subjectColors.chemistry
            },
            //endregion

            //region Friday
            {
                day: "friday",
                id: "PHY-BP3",
                title: "Ondes, optique et physique moderne",
                startTime: "9:30",
                endTime: "10:20",
                location: "G2-58",
                color: subjectColors.physics
            },
            {
                day: "friday",
                id: "PHI-B03",
                title: "Théorie de la connaissance",
                startTime: "13:30",
                endTime: "14:20",
                location: "D3-25",
                color: subjectColors.humanities
            },
            //endregion
        ],
    }
];

export default scheduleConfig;
