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
                id: "PHI-B02",
                title: "Theory of Knowledge",
                startTime: "8:30",
                endTime: "10:20",
                location: "D3-15",
                color: subjectColors.humanities
            },
            {
                day: "monday",
                id: "BIO-BP1",
                title: "Évolution et diversité",
                startTime: "10:30",
                endTime: "12:20",
                location: "G1-75",
                color: subjectColors.biology
            },
            {
                day: "monday",
                id: "MAT-BP2",
                title: "Algèbre matricielle, intro probabilités et intégral (AA HL)",
                startTime: "13:30",
                endTime: "15:20",
                location: "G1-75",
                color: subjectColors.math
            },
            //endregion
            //region Tuesday
            {
                day: "tuesday",
                id: "LIT-B02",
                title: "Littérature du XIXe siècle: temps et espace",
                startTime: "8:30",
                endTime: "10:20",
                location: "D3-15",
                color: subjectColors.french
            },
            {
                day: "tuesday",
                id: "ANN-BA2",
                title: "Culture Topics (Lang & Lit A SL)",
                startTime: "11:30",
                endTime: "12:20",
                location: "G1-114",
                color: subjectColors.english
            },
            {
                day: "tuesday",
                id: "PHY-BP2",
                title: "Électricité et magnétisme HL",
                startTime: "13:30",
                endTime: "14:20",
                location: "G2-35",
                color: subjectColors.physics
            },
            {
                day: "tuesday",
                id: "MAT-BP2",
                title: "Algèbre matricielle, intro probabilités et intégrales (AA HL)",
                startTime: "14:30",
                endTime: "15:20",
                location: "G1-72",
                color: subjectColors.math
            },
            //endregion
            //region Wednesday
            {
                day: "wednesday",
                id: "PHY-BP2",
                title: "Électricité et magnétisme (HL)",
                startTime: "8:30",
                endTime: "10:20",
                location: "G2-39 (LAB)",
                color: subjectColors.physics
            },
            {
                day: "wednesday",
                id: "ACT-B02",
                title: "Défis scientifiques du XXIe siècle",
                startTime: "10:30",
                endTime: "11:20",
                location: "G1-134",
                color: subjectColors.social
            },
            {
                day: "wednesday",
                id: "BIO-BP1",
                title: "Évolution et diversité",
                startTime: "11:30",
                endTime: "12:20",
                location: "G1-62",
                color: subjectColors.biology
            },
            {
                day: "wednesday",
                id: "PHI-B02",
                title: "Theory of Knowledge",
                startTime: "15:30",
                endTime: "17:20",
                location: "D3-15",
                color: subjectColors.humanities
            },
            //endregion
            //region Thursday
            {
                day: "thursday",
                id: "MAT-BP2",
                title: "Algèbre matricielle, intro probabilités et intégral (AA HL)",
                startTime: "8:30",
                endTime: "10:20",
                location: "G1-72",
                color: subjectColors.math
            },
            {
                day: "thursday",
                id: "TIC-BN2",
                title: "Technologie de l'information et de la communication",
                startTime: "10:30",
                endTime: "12:20",
                location: "G1-110",
                color: subjectColors.default,
            },
            {
                day: "thursday",
                id: "ANN-BA2",
                title: "Culture Topics (Lang & Lit A SL)",
                startTime: "13:30",
                endTime: "15:20",
                location: "G1-122",
                color: subjectColors.english
            },
            {
                day: "thursday",
                id: "LIT-B02",
                title: "Littérature du XIXe siècle: temps et espace",
                startTime: "15:30",
                endTime: "17:20",
                location: "D3-06",
                color: subjectColors.french
            },
            //endregion
            //region Friday
            {
                day: "friday",
                id: "ACT-B02",
                title: "Défis scientifiques du XXIe siècle",
                startTime: "8:30",
                endTime: "10:20",
                location: "G1-134",
                color: subjectColors.social
            },
            {
                day: "friday",
                id: "BIO-BP1",
                title: "Évolution et diversité",
                startTime: "10:30",
                endTime: "12:20",
                location: "G2-74 (LAB)",
                color: subjectColors.biology
            },
            {
                day: "friday",
                id: "PHY-BP2",
                title: "Électricité et magnétisme HL",
                startTime: "15:30",
                endTime: "17:20",
                location: "G2-35",
                color: subjectColors.physics
            },
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
                id: "201-SN3-RE",
                title: "Integral calculus",
                startTime: "10:00",
                endTime: "12:00",
                location: "N-362",
                color: subjectColors.math
            },
            {
                day: "monday",
                id: "109-102-MQ",
                title: "Volleyball",
                startTime: "12:00",
                endTime: "14:00",
                location: "GYM A",
                color: subjectColors.sport
            },
            {
                day: "monday",
                id: "101-SN1-RE",
                title: "Cellular biology",
                startTime: "14:00",
                endTime: "16:00",
                location: "B-502",
                color: subjectColors.biology
            },
            {
                day: "monday",
                id: "201-SN1-RA",
                title: "Probability and statistics",
                startTime: "16:00",
                endTime: "18:00",
                location: "B-429",
                color: subjectColors.math
            },
            //endregion
            //region Tuesday
            {
                day: "tuesday",
                id: "345-101-MQ",
                title: "How do we learn?",
                startTime: "08:00",
                endTime: "10:00",
                location: "N-231",
                color: subjectColors.humanities
            },
            {
                day: "tuesday",
                id: "101-SN1-RE",
                title: "Cellular biology",
                startTime: "10:00",
                endTime: "12:00",
                location: "A-443 (LAB)",
                color: subjectColors.biology
            },
            {
                day: "tuesday",
                id: "603-102-MQ",
                title: "English : The Hero's Fall",
                startTime: "12:00",
                endTime: "14:00",
                location: "N-526",
                color: subjectColors.english
            },
            {
                day: "tuesday",
                id: "202-SN2-RF",
                title: "Chimie des solutions",
                startTime: "14:00",
                endTime: "16:00",
                location: "A-544 (LAB)",
                color: subjectColors.chemistry
            },
            //endregion
            //region Wednesday
            {
                day: "wednesday",
                id: "201-SN3-RE",
                title: "Integral calculus",
                startTime: "8:00",
                endTime: "10:00",
                location: "K-322",
                color: subjectColors.math
            },
            {
                day: "wednesday",
                id: "602-UF1-MQ",
                title: "French",
                startTime: "13:30",
                endTime: "16:30",
                location: "D-542",
                color: subjectColors.french
            },
            //endregion
            //region Thursday
            {
                day: "thursday",
                id: "201-SN1-RA",
                title: "Probability and statistics",
                startTime: "10:00",
                endTime: "11:30",
                location: "A-306",
                color: subjectColors.math
            },
            {
                day: "thursday",
                id: "603-102-MQ",
                title: "English : The Hero's Fall",
                startTime: "12:00",
                endTime: "14:00",
                location: "N-526",
                color: subjectColors.english
            },
            //endregion
            //region Friday
            {
                day: "friday",
                id: "345-101-MQ",
                title: "How do we learn?",
                startTime: "08:00",
                endTime: "10:00",
                location: "N-231",
                color: subjectColors.humanities
            },
            {
                day: "friday",
                id: "202-SN2-RF",
                title: "Chimie des solutions",
                startTime: "13:00",
                endTime: "15:00",
                location: "E-513",
                color: subjectColors.chemistry
            },
            //endregion
        ],
    },
    {
        id: "noah-lucas",
        name: "Noah & Lucas",
        timeSlots: BREBEUF_TIME_SLOTS,
        events: [
            //region Monday
            {
                day: "monday",
                id: "LIT-B02",
                title: "Littérature du XIXe siècle: temps et espace",
                startTime: "8:30",
                endTime: "10:20",
                location: "D3-06",
                color: subjectColors.french
            },
            {
                day: "monday",
                id: "BIO-BP1",
                title: "Évolution et diversité",
                startTime: "10:30",
                endTime: "12:20",
                location: "G1-75",
                color: subjectColors.biology
            },
            {
                day: "monday",
                id: "MAT-BP2",
                title: "Algèbre matricielle, intro probabilités et intégral (AA HL)",
                startTime: "13:30",
                endTime: "15:20",
                location: "G1-75",
                color: subjectColors.math
            },
            //endregion
            //region Tuesday
            {
                day: "tuesday",
                id: "PHI-B02",
                title: "Theory of Knowledge",
                startTime: "15:30",
                endTime: "17:20",
                location: "D3-06",
                color: subjectColors.humanities
            },
            {
                day: "tuesday",
                id: "ANN-BA2",
                title: "Culture Topics (Lang & Lit A SL)",
                startTime: "11:30",
                endTime: "12:20",
                location: "G1-114",
                color: subjectColors.english
            },
            {
                day: "tuesday",
                id: "PHY-BP2",
                title: "Électricité et magnétisme HL",
                startTime: "13:30",
                endTime: "14:20",
                location: "G2-35",
                color: subjectColors.physics
            },
            {
                day: "tuesday",
                id: "MAT-BP2",
                title: "Algèbre matricielle, intro probabilités et intégrales (AA HL)",
                startTime: "14:30",
                endTime: "15:20",
                location: "G1-72",
                color: subjectColors.math
            },
            //endregion
            //region Wednesday
            {
                day: "wednesday",
                id: "PHY-BP2",
                title: "Électricité et magnétisme (HL)",
                startTime: "8:30",
                endTime: "10:20",
                location: "G2-39 (LAB)",
                color: subjectColors.physics
            },
            {
                day: "wednesday",
                id: "ACT-B02",
                title: "Défis scientifiques du XXIe siècle",
                startTime: "10:30",
                endTime: "11:20",
                location: "G1-134",
                color: subjectColors.social
            },
            {
                day: "wednesday",
                id: "BIO-BP1",
                title: "Évolution et diversité",
                startTime: "11:30",
                endTime: "12:20",
                location: "G1-62",
                color: subjectColors.biology
            },
            {
                day: "wednesday",
                id: "LIT-B02",
                title: "Littérature du XIXe siècle: temps et espace",
                startTime: "15:30",
                endTime: "17:20",
                location: "D3-06",
                color: subjectColors.french
            },
            //endregion
            //region Thursday
            {
                day: "thursday",
                id: "MAT-BP2",
                title: "Algèbre matricielle, intro probabilités et intégral (AA HL)",
                startTime: "8:30",
                endTime: "10:20",
                location: "G1-72",
                color: subjectColors.math
            },
            {
                day: "thursday",
                id: "TIC-BN2",
                title: "Technologie de l'information et de la communication",
                startTime: "10:30",
                endTime: "12:20",
                location: "G1-110",
                color: subjectColors.default,
            },
            {
                day: "thursday",
                id: "ANN-BA2",
                title: "Culture Topics (Lang & Lit A SL)",
                startTime: "13:30",
                endTime: "15:20",
                location: "G1-122",
                color: subjectColors.english
            },
            {
                day: "thursday",
                id: "PHI-B02",
                title: "Theory of Knowledge",
                startTime: "15:30",
                endTime: "17:20",
                location: "D3-15",
                color: subjectColors.humanities
            },
            //endregion
            //region Friday
            {
                day: "friday",
                id: "ACT-B02",
                title: "Défis scientifiques du XXIe siècle",
                startTime: "8:30",
                endTime: "10:20",
                location: "G1-134",
                color: subjectColors.social
            },
            {
                day: "friday",
                id: "BIO-BP1",
                title: "Évolution et diversité",
                startTime: "10:30",
                endTime: "12:20",
                location: "G2-74 (LAB)",
                color: subjectColors.biology
            },
            {
                day: "friday",
                id: "PHY-BP2",
                title: "Électricité et magnétisme HL",
                startTime: "15:30",
                endTime: "17:20",
                location: "G2-35",
                color: subjectColors.physics
            },
            //endregion
        ],
    },
    {
        id: "giancarlo",
        name: "Giancarlo",
        timeSlots: BREBEUF_TIME_SLOTS,
        events: [
            //region Monday
            {
                day: "monday",
                id: "PHI-B02",
                title: "Theory of Knowledge",
                startTime: "8:30",
                endTime: "10:20",
                location: "D3-25",
                color: subjectColors.humanities
            },
            {
                day: "monday",
                id: "MAT-BS2",
                title: "Probabilités et statistiques (AA SL)",
                startTime: "10:30",
                endTime: "12:20",
                location: "G1-72",
                color: subjectColors.math
            },
            {
                day: "monday",
                id: "PHY-N01",
                title: "Physique Mécanique (SL)",
                startTime: "13:30",
                endTime: "15:20",
                location: "G2-59 (LAB)",
                color: subjectColors.biology
            },
            {
                day: "monday",
                id: "CHI-BS2",
                title: "Chimie des solutions",
                startTime: "15:30",
                endTime: "17:20",
                location: "G2-75 (LAB)",
                color: subjectColors.math
            },
            //endregion
            //region Tuesday
            {
                day: "tuesday",
                id: "TIC-BN2",
                title: "Technologie de l'information et de la communication",
                startTime: "8:30",
                endTime: "10:20",
                location: "G2-65",
                color: subjectColors.default,
            },
            {
                day: "tuesday",
                id: "ANN-BA2",
                title: "Culture Topics (Lang & Lit A SL)",
                startTime: "10:30",
                endTime: "11:20",
                location: "G1-114",
                color: subjectColors.english
            },
            {
                day: "tuesday",
                id: "LIT-B02",
                title: "Littérature du XIXe siècle: temps et espace",
                startTime: "13:30",
                endTime: "15:20",
                location: "G1-75",
                color: subjectColors.french
            },
            //endregion
            //region Wednesday
            {
                day: "wednesday",
                id: "MAT-BS2",
                title: "Probabilités et statistiques (AA SL)",
                startTime: "8:30",
                endTime: "10:20",
                location: "G1-75",
                color: subjectColors.math
            },
            {
                day: "wednesday",
                id: "ACT-B02",
                title: "Défis scientifiques du XXIe siècle",
                startTime: "10:30",
                endTime: "11:20",
                location: "G1-134",
                color: subjectColors.social
            },
            {
                day: "wednesday",
                id: "PHY-N01",
                title: "Physique Mécanique (SL)",
                startTime: "11:30",
                endTime: "12:20",
                location: "G2-35",
                color: subjectColors.biology
            },
            {
                day: "wednesday",
                id: "CHI-BS2",
                title: "Chimie des solutions",
                startTime: "14:30",
                endTime: "15:20",
                location: "G1-118",
                color: subjectColors.math
            },
            {
                day: "wednesday",
                id: "PHI-B02",
                title: "Theory of Knowledge",
                startTime: "15:30",
                endTime: "17:20",
                location: "D3-25",
                color: subjectColors.humanities
            },
            //endregion
            //region Thursday
            {
                day: "thursday",
                id: "LIT-B02",
                title: "Littérature du XIXe siècle: temps et espace",
                startTime: "10:30",
                endTime: "12:20",
                location: "D3-15",
                color: subjectColors.french
            },
            {
                day: "thursday",
                id: "PHY-N01",
                title: "Physique Mécanique (SL)",
                startTime: "13:30",
                endTime: "15:20",
                location: "G2-35",
                color: subjectColors.biology
            },

            {
                day: "thursday",
                id: "MAT-BS2",
                title: "Probabilités et statistiques (AA SL)",
                startTime: "15:30",
                endTime: "17:20",
                location: "G1-72",
                color: subjectColors.math
            },
            //endregion
            //region Friday
            {
                day: "friday",
                id: "ACT-B02",
                title: "Défis scientifiques du XXIe siècle",
                startTime: "8:30",
                endTime: "10:20",
                location: "G1-134",
                color: subjectColors.social
            },
            {
                day: "friday",
                id: "ANN-BA2",
                title: "Culture Topics (Lang & Lit A SL)",
                startTime: "13:30",
                endTime: "15:20",
                location: "G1-122",
                color: subjectColors.english
            },
            {
                day: "friday",
                id: "CHI-BS2",
                title: "Chimie des solutions",
                startTime: "15:30",
                endTime: "17:20",
                location: "G1-62",
                color: subjectColors.math
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
                id: "387-1N1-DW",
                title: "Introduction to Sociology",
                startTime: "8:30",
                endTime: "10:00",
                location: "3E.7",
                color: subjectColors.social
            },
            {
                day: "monday",
                id: "385-A02-DW",
                title: "Canadian Democracy",
                startTime: "10:00",
                endTime: "11:30",
                location: "4H.23",
                color: subjectColors.politics
            },
            {
                day: "monday",
                id: "300-QL1-DW",
                title: "Qualitative Methods",
                startTime: "12:00",
                endTime: "14:00",
                location: "3H.15",
                color: subjectColors.social
            },
            {
                day: "monday",
                id: "350-1N1-DW",
                title: "Intro to Psychology",
                startTime: "14:30",
                endTime: "16:00",
                location: "3F.3",
                color: subjectColors.humanities
            },
            // endregion
            // region Tuesday
            {
                day: "tuesday",
                id: "109-102-MQ",
                title: "Dance Styles",
                startTime: "08:00",
                endTime: "10:00",
                location: "4F.1",
                color: subjectColors.sport
            },
            {
                day: "tuesday",
                id: "345-102-MQ",
                title: "Gender Justice Now!",
                startTime: "11:30",
                endTime: "14:30",
                location: "4E.13",
                color: subjectColors.humanities
            },
            {
                day: "tuesday",
                id: "602-UF1-MQ",
                title: "En quête de liberté",
                startTime: "14:30",
                endTime: "16:00",
                location: "4H.23",
                color: subjectColors.french
            },
            // endregion
            // region Wednesday
            {
                day: "wednesday",
                id: "387-1N1-DW",
                title: "Introduction to Sociology",
                startTime: "8:30",
                endTime: "10:00",
                location: "3E.7",
                color: subjectColors.social
            },
            {
                day: "wednesday",
                id: "385-A02-DW",
                title: "Canadian Democracy",
                startTime: "10:00",
                endTime: "11:30",
                location: "4H.23",
                color: subjectColors.politics
            },
            {
                day: "wednesday",
                id: "350-1N1-DW",
                title: "Intro to Psychology",
                startTime: "14:30",
                endTime: "16:00",
                location: "3F.3",
                color: subjectColors.social
            },
            // endregion
            // region Thursday
            {
                day: "thursday",
                id: "300-QL1-DW",
                title: "Qualitative Methods",
                startTime: "8:00",
                endTime: "10:00",
                location: "3H.15",
                color: subjectColors.social
            },
            {
                day: "thursday",
                id: "603-102-MQ",
                title: "Gender and Justice",
                startTime: "11:30",
                endTime: "14:30",
                location: "4E.13",
                color: subjectColors.english
            },
            {
                day: "thursday",
                id: "602-UF1-MQ",
                title: "En quête de liberté",
                startTime: "14:30",
                endTime: "16:00",
                location: "4H.23",
                color: subjectColors.french
            },
            // endregion
            // region Friday
            // endregion
        ]
    },
    {
        id: "zoe",
        name: "Zoe",
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
                id: "602-LPY-MS",
                title: "Langue française et culture",
                startTime: "8:15",
                endTime: "9:35",
                location: "D-107",
                color: subjectColors.french
            },
            {
                day: "monday",
                id: "385-N01-MS",
                title: "Introduction to Political Science",
                startTime: "12:45",
                endTime: "14:05",
                location: "D-416",
                color: subjectColors.politics
            },
            {
                day: "monday",
                id: "381-N01-MS",
                title: "Human Culture and Diversity",
                startTime: "16:15",
                endTime: "17:35",
                location: "D-416",
                color: subjectColors.social
            },
            // endregion
            // region Tuesday
            {
                day: "tuesday",
                id: "300-M02-MS",
                title: "Introduction to Qualitative Research Methods",
                startTime: "08:15",
                endTime: "10:05",
                location: "F-306",
                color: subjectColors.social
            },
            {
                day: "tuesday",
                id: "345-102-MQ",
                title: "L'esprit métis en Amérique latine",
                startTime: "11:15",
                endTime: "12:35",
                location: "D-318",
                color: subjectColors.humanities
            },
            {
                day: "tuesday",
                id: "603-102-MQ",
                title: "Shakespeare on Screen",
                startTime: "14:15",
                endTime: "16:05",
                location: "D-218",
                color: subjectColors.english
            },
            // endregion
            // region Wednesday
            {
                day: "wednesday",
                id: "602-LPY-MS",
                title: "Langue française et culture",
                startTime: "8:15",
                endTime: "9:35",
                location: "D-107",
                color: subjectColors.french
            },
            {
                day: "wednesday",
                id: "383-N01-MS",
                title: "Macroeconomics",
                startTime: "11:15",
                endTime: "12:35",
                location: "D-409",
                color: subjectColors.economy
            },
            {
                day: "wednesday",
                id: "381-N01-MS",
                title: "Human Culture and Diversity",
                startTime: "16:15",
                endTime: "17:35",
                location: "D-416",
                color: subjectColors.social
            },
            // endregion
            // region Thursday
            {
                day: "thursday",
                id: "385-N01-MS",
                title: "Introduction to Political Science",
                startTime: "9:45",
                endTime: "11:05",
                location: "D-416",
                color: subjectColors.politics
            },
            {
                day: "thursday",
                id: "603-102-MQ",
                title: "Shakespeare on Screen",
                startTime: "14:15",
                endTime: "16:05",
                location: "D-218",
                color: subjectColors.english
            },
            {
                day: "thursday",
                id: "109-102-MQ",
                title: "Soccer",
                startTime: "16:15",
                endTime: "18:05",
                location: "GYM",
                color: subjectColors.sport
            },
            // endregion
            // region Friday
            {
                day: "friday",
                id: "345-102-MQ",
                title: "L'esprit métis en Amérique latine",
                startTime: "11:15",
                endTime: "12:35",
                location: "D-318",
                color: subjectColors.humanities
            },
            {
                day: "friday",
                id: "383-N01-MS",
                title: "Macroeconomics",
                startTime: "14:15",
                endTime: "15:35",
                location: "D-409",
                color: subjectColors.economy
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
            // endregion
            // region tuesday
            // endregion
            // region wednesday
            // endregion
            // region thursday
            // endregion
            // region friday
            // endregion
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
