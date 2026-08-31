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
    computer: "#aec6cf",    // slate blue
    arts: "#e6ccb2",        // tan
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

// Cégep Lionel-Groulx runs fixed 50-minute periods.
const LIONEL_GROULX_TIME_SLOTS = [
    {hour: 8, minute: 0, endHour: 8, endMinute: 50},
    {hour: 8, minute: 55, endHour: 9, endMinute: 45},
    {hour: 9, minute: 50, endHour: 10, endMinute: 40},
    {hour: 10, minute: 45, endHour: 11, endMinute: 35},
    {hour: 11, minute: 40, endHour: 12, endMinute: 30},
    {hour: 12, minute: 35, endHour: 13, endMinute: 25},
    {hour: 13, minute: 30, endHour: 14, endMinute: 20},
    {hour: 14, minute: 25, endHour: 15, endMinute: 15},
    {hour: 15, minute: 20, endHour: 16, endMinute: 10},
    {hour: 16, minute: 15, endHour: 17, endMinute: 5},
    {hour: 17, minute: 10, endHour: 18, endMinute: 0},
];

// Dawson, Bois-de-Boulogne and Vanier all print their Omnivox grid as plain
// 30-minute rows from 08:00 to 18:00.
const HALF_HOUR_TIME_SLOTS = [
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
];

const scheduleConfig: ScheduleType[] = [
    //region Jerry, breb
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
            {
                day: "tuesday",
                id: "EDP-G1A",
                title: "Mise en forme",
                startTime: "15:30",
                endTime: "17:20",
                location: "Local J1-20;J1-24",
                color: subjectColors.sport
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
    },
    //endregion

    //region Iris, vanier
    {
        id: "iris",
        name: "Iris",
        timeSlots: HALF_HOUR_TIME_SLOTS,
        events: [
            //region Monday
            {
                day: "monday",
                id: "603-103-MQ",
                title: "Snobbery in Literature",
                startTime: "10:00",
                endTime: "12:00",
                location: "N-436",
                color: subjectColors.english
            },
            {
                day: "monday",
                id: "101-SN2-RE",
                title: "Ecology and Evolution",
                startTime: "12:00",
                endTime: "14:00",
                location: "A-320",
                color: subjectColors.biology
            },
            {
                day: "monday",
                id: "203-SN3-RE",
                title: "Waves and Modern Physics",
                startTime: "16:00",
                endTime: "18:00",
                location: "B-403",
                color: subjectColors.physics
            },
            //endregion

            //region Tuesday
            {
                day: "tuesday",
                id: "101-SNU-RE",
                title: "Human Anatomy and Physiology",
                startTime: "8:30",
                endTime: "11:30",
                location: "A-466",
                color: subjectColors.medicine
            },
            {
                day: "tuesday",
                id: "602-UF2-MQ",
                title: "Comparaison d'oeuvres littéraires",
                startTime: "13:00",
                endTime: "16:00",
                location: "A-223",
                color: subjectColors.french
            },
            //endregion

            //region Wednesday
            {
                day: "wednesday",
                id: "603-103-MQ",
                title: "Snobbery in Literature",
                startTime: "10:30",
                endTime: "12:30",
                location: "K-436",
                color: subjectColors.english
            },
            //endregion

            //region Thursday
            {
                day: "thursday",
                id: "109-101-MQ",
                title: "Fitness",
                startTime: "8:00",
                endTime: "10:00",
                location: "G-157",
                color: subjectColors.sport
            },
            {
                day: "thursday",
                id: "203-SN3-RE",
                title: "Waves and Modern Physics",
                startTime: "10:00",
                endTime: "11:30",
                location: "A-569",
                color: subjectColors.physics
            },
            {
                day: "thursday",
                id: "420-SN1-RE",
                title: "Programming in Science",
                startTime: "13:00",
                endTime: "16:00",
                location: "D-242",
                color: subjectColors.computer
            },
            {
                day: "thursday",
                id: "101-SNU-RE",
                title: "Human Anatomy and Physiology",
                startTime: "16:00",
                endTime: "18:00",
                location: "D-507",
                color: subjectColors.medicine
            },
            //endregion

            //region Friday
            {
                day: "friday",
                id: "101-SN2-RE",
                title: "Ecology and Evolution",
                startTime: "11:30",
                endTime: "14:30",
                location: "A-407",
                color: subjectColors.biology
            },
            {
                day: "friday",
                id: "203-SN3-RE",
                title: "Waves and Modern Physics",
                startTime: "14:30",
                endTime: "16:00",
                location: "A-502",
                color: subjectColors.physics
            },
            //endregion
        ],
    },
    //endregion

    //region Sarah, dawsom
    {
        id: "sarah",
        name: "Sarah",
        timeSlots: HALF_HOUR_TIME_SLOTS,
        events: [
            //region Monday
            {
                day: "monday",
                id: "602-UF2-MQ",
                title: "Écrire la contestation",
                startTime: "8:30",
                endTime: "10:00",
                location: "2P.10",
                color: subjectColors.french
            },
            {
                day: "monday",
                id: "300-THF-DW",
                title: "L'État de droit",
                startTime: "10:00",
                endTime: "11:30",
                location: "2P.57",
                color: subjectColors.politics
            },
            {
                day: "monday",
                id: "603-103-MQ",
                title: "Encounters with Death",
                startTime: "12:00",
                endTime: "14:00",
                location: "4P.10",
                color: subjectColors.english
            },
            //endregion

            //region Tuesday
            {
                day: "tuesday",
                id: "300-QA1-DW",
                title: "Counting the Cost",
                startTime: "12:00",
                endTime: "14:00",
                location: "3A.9",
                color: subjectColors.math
            },
            {
                day: "tuesday",
                id: "330-A05-DW",
                title: "Counting the Cost",
                startTime: "14:30",
                endTime: "16:00",
                location: "3F.37",
                color: subjectColors.social
            },
            //endregion

            //region Wednesday
            {
                day: "wednesday",
                id: "602-UF2-MQ",
                title: "Écrire la contestation",
                startTime: "8:30",
                endTime: "10:00",
                location: "2P.10",
                color: subjectColors.french
            },
            {
                day: "wednesday",
                id: "300-THF-DW",
                title: "L'État de droit",
                startTime: "10:00",
                endTime: "11:30",
                location: "2P.57",
                color: subjectColors.politics
            },
            {
                day: "wednesday",
                id: "332-1N1-DW",
                title: "Egypt, Greece, and Rome",
                startTime: "11:30",
                endTime: "13:00",
                location: "4E.20",
                color: subjectColors.social
            },
            //endregion

            //region Thursday
            {
                day: "thursday",
                id: "603-103-MQ",
                title: "Encounters with Death",
                startTime: "8:00",
                endTime: "10:00",
                location: "4P.10",
                color: subjectColors.english
            },
            {
                day: "thursday",
                id: "109-101-MQ",
                title: "Games Fitness",
                startTime: "10:00",
                endTime: "12:00",
                location: "-1H.6",
                color: subjectColors.sport
            },
            {
                day: "thursday",
                id: "300-QA1-DW",
                title: "Counting the Cost",
                startTime: "12:00",
                endTime: "14:00",
                location: "3A.9",
                color: subjectColors.math
            },
            {
                day: "thursday",
                id: "330-A05-DW",
                title: "Counting the Cost",
                startTime: "14:30",
                endTime: "16:00",
                location: "3F.37",
                color: subjectColors.social
            },
            //endregion

            //region Friday
            {
                day: "friday",
                id: "332-1N1-DW",
                title: "Egypt, Greece, and Rome",
                startTime: "11:30",
                endTime: "13:00",
                location: "4E.20",
                color: subjectColors.social
            },
            //endregion
        ],
    },
    //endregion

    //region Djal, BdeB
    {
        id: "djal",
        name: "Djal",
        timeSlots: HALF_HOUR_TIME_SLOTS,
        events: [
            //region Monday
            {
                day: "monday",
                id: "601-101-MQ",
                title: "Écriture et littérature",
                startTime: "10:00",
                endTime: "12:00",
                location: "IB-S-370",
                color: subjectColors.french
            },
            {
                day: "monday",
                id: "201-SF2-RE",
                title: "Calcul différentiel",
                startTime: "12:00",
                endTime: "13:00",
                location: "SP-B-239",
                color: subjectColors.math
            },
            {
                day: "monday",
                id: "201-SF1-RE",
                title: "Probabilités et statistique",
                startTime: "14:00",
                endTime: "16:00",
                location: "SP-C-230",
                color: subjectColors.math
            },
            //endregion

            //region Tuesday
            {
                day: "tuesday",
                id: "420-SF1-RE",
                title: "Introduction à la programmation",
                startTime: "8:00",
                endTime: "10:00",
                location: "IB-H-022",
                color: subjectColors.computer
            },
            {
                day: "tuesday",
                id: "601-101-MQ",
                title: "Écriture et littérature",
                startTime: "10:00",
                endTime: "12:00",
                location: "IB-S-369",
                color: subjectColors.french
            },
            //endregion

            //region Wednesday
            {
                day: "wednesday",
                id: "511-C1A-BB",
                title: "Image et création numérique",
                startTime: "8:00",
                endTime: "11:00",
                location: "SP-E-105",
                color: subjectColors.arts
            },
            {
                day: "wednesday",
                id: "201-SF1-RE",
                title: "Probabilités et statistique",
                startTime: "11:00",
                endTime: "12:00",
                location: "SP-B-026",
                color: subjectColors.math
            },
            {
                day: "wednesday",
                id: "201-SF2-RE",
                title: "Calcul différentiel",
                startTime: "14:00",
                endTime: "16:00",
                location: "SP-C-245",
                color: subjectColors.math
            },
            //endregion

            //region Thursday
            {
                day: "thursday",
                id: "420-SF1-RE",
                title: "Introduction à la programmation",
                startTime: "8:00",
                endTime: "11:00",
                location: "IB-H-022",
                color: subjectColors.computer
            },
            // {
            //     day: "thursday",
            //     id: "DINER",
            //     title: "Dîner - Examens communs",
            //     startTime: "11:30",
            //     endTime: "13:00",
            //     location: "",
            //     color: subjectColors.default
            // },
            //endregion

            //region Friday
            {
                day: "friday",
                id: "604-103-MQ",
                title: "Culture anglaise et littérature",
                startTime: "8:00",
                endTime: "11:00",
                location: "SP-B-078",
                color: subjectColors.english
            },
            {
                day: "friday",
                id: "109-619-MA",
                title: "Flag Football et efficacité (masculin)",
                startTime: "12:00",
                endTime: "15:00",
                location: "IB-Y-247; XT-X-Multi",
                color: subjectColors.sport
            },
            {
                day: "friday",
                id: "201-SF2-RE",
                title: "Calcul différentiel",
                startTime: "16:00",
                endTime: "18:00",
                location: "SP-B-239",
                color: subjectColors.math
            },
            //endregion
        ],
    },
    //endregion

    //region Omar, BdeB
    {
        id: "omar",
        name: "Omar",
        timeSlots: HALF_HOUR_TIME_SLOTS,
        events: [
            //region Monday
            {
                day: "monday",
                id: "601-101-MQ",
                title: "Écriture et littérature",
                startTime: "10:00",
                endTime: "12:00",
                location: "IB-S-258",
                color: subjectColors.french
            },
            {
                day: "monday",
                id: "201-SF2-RE",
                title: "Calcul différentiel",
                startTime: "12:00",
                endTime: "13:00",
                location: "SP-B-239",
                color: subjectColors.math
            },
            {
                day: "monday",
                id: "420-SF1-RE",
                title: "Introduction à la programmation",
                startTime: "15:00",
                endTime: "18:00",
                location: "IB-H-022",
                color: subjectColors.computer
            },
            //endregion

            //region Tuesday
            {
                day: "tuesday",
                id: "201-SF1-RE",
                title: "Probabilités et statistique",
                startTime: "8:00",
                endTime: "10:00",
                location: "SP-C-240",
                color: subjectColors.math
            },
            {
                day: "tuesday",
                id: "420-SF1-RE",
                title: "Introduction à la programmation",
                startTime: "14:00",
                endTime: "16:00",
                location: "IB-H-022",
                color: subjectColors.computer
            },
            //endregion

            //region Wednesday
            {
                day: "wednesday",
                id: "109-511-BB",
                title: "Musculation et santé",
                startTime: "10:00",
                endTime: "12:00",
                location: "IB-U-209",
                color: subjectColors.sport
            },
            {
                day: "wednesday",
                id: "201-SF2-RE",
                title: "Calcul différentiel",
                startTime: "14:00",
                endTime: "16:00",
                location: "SP-C-245",
                color: subjectColors.math
            },
            //endregion

            //region Thursday
            {
                day: "thursday",
                id: "604-102-MQ",
                title: "Langue anglaise et culture",
                startTime: "8:00",
                endTime: "11:00",
                location: "IB-S-446",
                color: subjectColors.english
            },
            // {
            //     day: "thursday",
            //     id: "DINER",
            //     title: "Dîner - Examens communs",
            //     startTime: "11:30",
            //     endTime: "13:00",
            //     location: "",
            //     color: subjectColors.default
            // },
            {
                day: "thursday",
                id: "201-SF1-RE",
                title: "Probabilités et statistique",
                startTime: "14:00",
                endTime: "15:00",
                location: "SP-B-278",
                color: subjectColors.math
            },
            {
                day: "thursday",
                id: "601-101-MQ",
                title: "Écriture et littérature",
                startTime: "16:00",
                endTime: "18:00",
                location: "IB-S-258",
                color: subjectColors.french
            },
            //endregion

            //region Friday
            {
                day: "friday",
                id: "350-C1A-BB",
                title: "Psychologie et santé mentale",
                startTime: "12:00",
                endTime: "15:00",
                location: "IB-S-471",
                color: subjectColors.social
            },
            {
                day: "friday",
                id: "201-SF2-RE",
                title: "Calcul différentiel",
                startTime: "16:00",
                endTime: "18:00",
                location: "SP-B-239",
                color: subjectColors.math
            },
            //endregion
        ],
    },
    //endregion

    //region Zackary, breb
    {
        id: "zackary",
        name: "Zackary",
        timeSlots: BREBEUF_TIME_SLOTS,
        events: [
            //region Monday
            {
                day: "monday",
                id: "CHI-NA1-24",
                title: "Chimie générale : la matière",
                startTime: "8:30",
                endTime: "10:20",
                location: "G1-76",
                color: subjectColors.chemistry
            },
            {
                day: "monday",
                id: "PHI-G01-17",
                title: "Philosophie et rationalité",
                startTime: "10:30",
                endTime: "12:20",
                location: "D3-12",
                color: subjectColors.humanities
            },
            {
                day: "monday",
                id: "PHY-NA1-24",
                title: "Mécanique",
                startTime: "14:30",
                endTime: "15:20",
                location: "G1-134",
                color: subjectColors.physics
            },
            //endregion

            //region Tuesday
            {
                day: "tuesday",
                id: "LIT-G01-17",
                title: "Écriture et littérature",
                startTime: "10:30",
                endTime: "12:20",
                location: "A2-45",
                color: subjectColors.french
            },
            {
                day: "tuesday",
                id: "EDP-G2C-17",
                title: "Badminton",
                startTime: "14:30",
                endTime: "16:20",
                location: "J2-60",
                color: subjectColors.sport
            },
            {
                day: "tuesday",
                id: "MAT-NA1-24",
                title: "Calcul différentiel",
                startTime: "16:30",
                endTime: "17:20",
                location: "G1-122",
                color: subjectColors.math
            },
            //endregion

            //region Wednesday
            {
                day: "wednesday",
                id: "PHY-NA1-24",
                title: "Mécanique",
                startTime: "8:30",
                endTime: "10:20",
                location: "G2-59",
                color: subjectColors.physics
            },
            {
                day: "wednesday",
                id: "MAT-NA1-24",
                title: "Calcul différentiel",
                startTime: "11:30",
                endTime: "12:20",
                location: "A2-61",
                color: subjectColors.math
            },
            {
                day: "wednesday",
                id: "CHI-NA1-24",
                title: "Chimie générale : la matière",
                startTime: "14:30",
                endTime: "15:20",
                location: "G2-58",
                color: subjectColors.chemistry
            },
            //endregion

            //region Thursday
            {
                day: "thursday",
                id: "CIN-KA1-26",
                title: "Cinéma contemporain",
                startTime: "9:30",
                endTime: "11:20",
                location: "B2-30",
                color: subjectColors.arts
            },
            {
                day: "thursday",
                id: "TIC-N00-13",
                title: "TIC Sciences de la nature",
                startTime: "13:30",
                endTime: "15:20",
                location: "B1-58",
                color: subjectColors.computer
            },
            {
                day: "thursday",
                id: "PHI-G01-17",
                title: "Philosophie et rationalité",
                startTime: "15:30",
                endTime: "17:20",
                location: "D3-25",
                color: subjectColors.humanities
            },
            //endregion

            //region Friday
            {
                day: "friday",
                id: "PHY-NA1-24",
                title: "Mécanique",
                startTime: "8:30",
                endTime: "10:20",
                location: "G2-35",
                color: subjectColors.physics
            },
            {
                day: "friday",
                id: "CHI-NA1-24",
                title: "Chimie générale : la matière",
                startTime: "10:30",
                endTime: "12:20",
                location: "G2-75",
                color: subjectColors.chemistry
            },
            {
                day: "friday",
                id: "LIT-G01-17",
                title: "Écriture et littérature",
                startTime: "13:30",
                endTime: "15:20",
                location: "A2-35",
                color: subjectColors.french
            },
            {
                day: "friday",
                id: "MAT-NA1-24",
                title: "Calcul différentiel",
                startTime: "15:30",
                endTime: "17:20",
                location: "A2-40",
                color: subjectColors.math
            },
            //endregion
        ],
    },
    //endregion

    //region Jacob, lionel-groulx
    {
        id: "jacob",
        name: "Jacob",
        timeSlots: LIONEL_GROULX_TIME_SLOTS,
        events: [
            //region Monday
            {
                day: "monday",
                id: "420KB1LG",
                title: "Introduction à la programmation",
                startTime: "8:00",
                endTime: "9:45",
                location: "H310",
                color: subjectColors.computer
            },
            {
                day: "monday",
                id: "420KB2LG",
                title: "Conception Web",
                startTime: "10:45",
                endTime: "13:25",
                location: "H311",
                color: subjectColors.computer
            },
            {
                day: "monday",
                id: "601101MQ",
                title: "Écriture et littérature",
                startTime: "16:15",
                endTime: "18:00",
                location: "D230",
                color: subjectColors.french
            },
            //endregion

            //region Tuesday
            {
                day: "tuesday",
                id: "420KB3LG",
                title: "Exploitation",
                startTime: "9:50",
                endTime: "12:30",
                location: "H311",
                color: subjectColors.computer
            },
            {
                day: "tuesday",
                id: "420KB1LG",
                title: "Introduction à la programmation",
                startTime: "12:35",
                endTime: "14:20",
                location: "H310",
                color: subjectColors.computer
            },
            {
                day: "tuesday",
                id: "340101MQ",
                title: "Philosophie et rationalité",
                startTime: "16:15",
                endTime: "18:00",
                location: "H107",
                color: subjectColors.humanities
            },
            //endregion

            //region Wednesday
            {
                day: "wednesday",
                id: "201KB1LG",
                title: "Mathématiques",
                startTime: "8:00",
                endTime: "9:45",
                location: "D328",
                color: subjectColors.math
            },
            //endregion

            //region Thursday
            {
                day: "thursday",
                id: "420KB3LG",
                title: "Exploitation",
                startTime: "8:00",
                endTime: "9:45",
                location: "H311",
                color: subjectColors.computer
            },
            {
                day: "thursday",
                id: "601101MQ",
                title: "Écriture et littérature",
                startTime: "9:50",
                endTime: "11:35",
                location: "H112",
                color: subjectColors.french
            },
            {
                day: "thursday",
                id: "420KB1LG",
                title: "Introduction à la programmation",
                startTime: "12:35",
                endTime: "14:20",
                location: "H310",
                color: subjectColors.computer
            },
            {
                day: "thursday",
                id: "340101MQ",
                title: "Philosophie et rationalité",
                startTime: "16:15",
                endTime: "18:00",
                location: "H011",
                color: subjectColors.humanities
            },
            //endregion

            //region Friday
            {
                day: "friday",
                id: "420KB1LG",
                title: "Introduction à la programmation",
                startTime: "8:00",
                endTime: "9:45",
                location: "H313",
                color: subjectColors.computer
            },
            {
                day: "friday",
                id: "201KB1LG",
                title: "Mathématiques",
                startTime: "10:45",
                endTime: "12:25",
                location: "D124",
                color: subjectColors.math
            },
            //endregion
        ],
    },
    //endregion

];

export default scheduleConfig;
