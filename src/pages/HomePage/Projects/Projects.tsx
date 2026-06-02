import {useMemo} from "react";
import "./Projects.scss";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";
import Card, {type CardProps} from "../../../components/Card/Card.tsx";
import _llmvsllm from "../../../assets/projects/llmvsllm.jpeg";
import _baputils from "../../../assets/projects/baputils.jpeg";
import _expedite from "../../../assets/projects/expedite.jpeg";
import _jerrybot from "../../../assets/projects/jerrybot.png";
import _jerryxf from "../../../assets/projects/jerryxf.jpeg";
import _conditioner from "../../../assets/projects/conditioner.jpeg";
import _kahootBot from "../../../assets/projects/kahootbot.mp4";
import _weatherStation from "../../../assets/projects/weather_station.jpeg";
import _endPortal from "../../../assets/projects/end_portal.jpg";
import _supericu from "../../../assets/projects/supericu.jpeg";
import _doublestartyre from "../../../assets/projects/doublestartyre.jpeg";
import _scorekeeper from "../../../assets/projects/scorekeeper.jpeg";
import _scheduler from "../../../assets/projects/scheduler.jpeg";
import _autoscout from "../../../assets/projects/autoscout.jpeg";
import _medive from "../../../assets/projects/medive.jpeg";
import _unveil_dark from "../../../assets/projects/unveil/unveil_dark.png";
import _unveil_light from "../../../assets/projects/unveil/unveil_light.png";
import _homeisland from "../../../assets/projects/home-island.jpeg";
import _technexus from "../../../assets/projects/technexus.png";
import _rendezvous from "../../../assets/projects/rendezvous.jpeg";
import {formatDate} from "../../../utils.ts";
import {useTheme} from "../../../context/ThemeContext.tsx";

const projects: CardProps[] = [
    {
        title: "Home Island",
        subTitle: "Custom browser start page",
        image: _homeisland,
        chipText: "🟢 Stable",
        dateDisplay: formatDate(new Date("2026-02-05T00:00:00")),
        url: "https://github.com/jerryxfu/home-island",
        description: "A beautiful, minimalist browser extension with time-based dynamic backgrounds and personalized settings. Available on Chrome, Firefox, and Safari.",
        footer: "Click image for links"
    },
    {
        title: "Expedite",
        subTitle: "Share files and text snippets instantly!",
        image: _expedite,
        chipText: "🟢 Stable",
        dateDisplay: formatDate(new Date("2026-05-18T00:00:00")),
        description: "A webpage for quickly sharing files and text snippets with other people or across your own devices",
        url: "/expedite",
        footer: "Same-day shipping!"
    },
    {
        title: "Rendezvous",
        subTitle: "A tool to help schedule group events",
        image: _rendezvous,
        chipText: "🟢 Stable",
        description: "Planning a meetup but coordinating availabilities is a nightmare? Create and event, share a code or link, and let everyone select when they're free!",
        url: "/rendezvous",
        dateDisplay: formatDate(new Date("2026-05-22T00:00:00"))
    },
    {
        title: "TechNexus",
        subTitle: "A companion app for FRC",
        image: _technexus,
        chipText: "🚧 WIP",
        dateDisplay: formatDate(new Date("2026-04-08T00:00:00")),
        url: "https://github.com/jerryxfu/matchtimer",
        description: "A mobile app that provides dynamic schedule updates and useful tools & information for our team members during FIRST Robotics competitions.",
        footer: "iOS 16.7+ & Android 13+"
    },
    {
        title: "MEDIVE",
        subTitle: "Research project",
        image: _medive,
        chipText: "🚧 WIP",
        dateDisplay: formatDate(new Date("2025-08-14T00:00:00")),
        url: "https://github.com/jerryxfu/medive",
        description: "An AI system that generates differential diagnoses and identifies co-occurring symptoms from symptomatic presentations using a hybrid attention-based encoding model.",
        footer: "IB EE"
    },
    {
        title: "BapUtils",
        subTitle: "A Hypixel Skyblock Minecraft mod",
        image: _baputils,
        chipText: "💤 Stalled",
        dateDisplay: formatDate(new Date("2023-06-24T00:00:00")),
        url: "https://github.com/jerryxfu/BapUtils",
        description: "BapUtils is a lightweight Minecraft Forge mod for Hypixel Skyblock that provides various quality of life utilities. An update to 1.21+ is planned",
        footer: "/bap"
    },
    {
        title: "Kahoot! bot",
        subTitle: "",
        image: _kahootBot,
        chipText: "🟢 Stable",
        dateDisplay: formatDate(new Date("2024-07-01T00:00:00")),
        url: "https://github.com/jerryxfu/kahoot-bot",
        description: "A Kahoot bot that can join games, answer questions, and send reactions at your command. Built using Python and Playwright to automate the web interface.",
    },
    {
        title: "Unveil Technologies",
        subTitle: "Building what's next",
        image: _unveil_dark,
        chipText: "Founder",
        dateDisplay: formatDate(new Date("2025-10-01T00:00:00")),
        url: "https://unveiltechnologies.com",
        description: "A defense-software company building the operational intelligence layer that turns raw, multi-source data into live, explainable decisions. Unveil builds ORCA and everything that follows."
    },
    {
        title: "ORCA",
        subTitle: "Uncover the unseen",
        image: _endPortal,
        chipText: "🧩 MVP",
        dateDisplay: formatDate(new Date("2025-10-01T00:00:00")),
        url: "https://unveiltechnologies.com",
        description: "A tactical intelligence platform that turns battlefield data into live, actionable insight — through AI-driven multimodal fusion, anomaly detection, and explainable intel assessments.",
    },
    {
        title: "SuperICU",
        subTitle: "A tool to preview ICU monitor data",
        image: _supericu,
        chipText: "🎖️ Completed",
        dateDisplay: formatDate(new Date("2025-08-19T00:00:00")),
        url: "/supericu",
        description: "SuperICU is a tool to playback and visualize data from Intensive Care Unit monitor logs, including waveforms, vitals, and alarms, all in a patient monitor-like interface."
    },
    {
        title: "*.jerryxf.net",
        subTitle: "This website, right here!",
        image: _jerryxf,
        chipText: "🟢 Stable",
        dateDisplay: formatDate(new Date("2022-07-25T00:00:00")), // aspectofjerry.dev registration date
        description: "This portfolio website as well as the API that empowers other projects.",
    },
    {
        title: "Scheduler",
        subTitle: "A schedule visualizer and comparer",
        image: _scheduler,
        chipText: "🟢 Stable",
        dateDisplay: formatDate(new Date("2025-08-27")),
        description: "A web app to visualize and compare daily/weekly schedules.",
    },
    {
        title: "Doublestartyre CA",
        subTitle: "",
        image: _doublestartyre,
        chipText: "🟢 Stable",
        dateDisplay: formatDate(new Date("2024-07-11T00:00:00")),
        url: "https://doublestartyre.ca",
        description: "Doublestartyre.ca is a website for Doublestar Tire, a Dodo Wheels partner in Canada.",
        footer: "For Dodo Wheels"
    },
    {
        title: "Cyclic",
        subTitle: "Sleep cycle calculator and periods tracker",
        image: _endPortal,
        chipText: "🧩 MVP",
        dateDisplay: formatDate(new Date("2025-12-28T00:00:00")),
        description: "A mobile app for optimising sleep cycles and tracking periods, built with privacy at its core.",
        footer: "iOS 17.7+ & Android 13+"
    },
    {
        title: "FRC Scorekeeper interface",
        subTitle: "A FRC scorekeeper interface for REEFSCAPE season",
        image: _scorekeeper,
        chipText: "📦 Archived",
        dateDisplay: formatDate(new Date("2025-05-09T00:00:00")),
        url: "https://www.lapresse.ca/societe/2025-05-18/mission-la-robotique-pour-tous-et-toutes.php",
        description: "A real-time score tracking and broadcasting app for our off-season robotics competition.",
        footer: "RSEQ Montreal & CRA"
    },
    {
        title: "Conditioner",
        subTitle: "A rule based diagnostic app",
        image: _conditioner,
        chipText: "🗑️ Obsolete",
        dateDisplay: formatDate(new Date("2025-07-24T00:00:00")),
        url: "/#:~:text=MEDIVE",
        description: "Conditioner is a weighted rule-based diagnostic app that allows users to select symptoms and receive preliminary feedback on their \"condition\". Superseded by MEDIVE."
    },
    {
        title: "JerryBot",
        subTitle: "A comprehensive discord bot",
        image: _jerrybot,
        chipText: "📦 Archived",
        url: "https://github.com/jerryxfu/JerryBot",
        dateDisplay: formatDate(new Date("2021-09-01T00:00:00")),
        description: "JerryBot was a comprehensive all purpose Discord bot that provided various features and utilities.",
    },
    {
        title: "RPI Pico weather station",
        subTitle: "A small indoor weather station",
        image: _weatherStation,
        chipText: "🎖️ Completed",
        dateDisplay: formatDate(new Date("2025-02-08T00:00:00")),
        description: "A cool Raspberry Pi Pico bricolage weather station that displays temperature, humidity, pressure, and air quality info along with dynamic lighting.",
    },
    {
        title: "FRC AutoScout",
        subTitle: "Autonomous scouting for FRC",
        image: _autoscout,
        chipText: "🗑️ Obsolete",
        dateDisplay: formatDate(new Date("2024-03-23T00:00:00")), // MotionLens creation
        description: "A Python script that uses The Blue Alliance data to generate scouting reports, including Zebra MotionWorks motion analysis.",
        url: "https://github.com/jerryxfu/auto-scout"
    },
    {
        title: "LLM vs LLM",
        subTitle: "Two LLMs debate on a given topic",
        image: _llmvsllm,
        chipText: "📦 Archived",
        url: "https://github.com/jerryxfu/llmvsllm",
        dateDisplay: formatDate(new Date("2024-05-18T00:00:00")),
        description: "LLM vs LLM was a project that allowed two large language models to debate on a given topic, showcasing the capabilities of LLMs in generating coherent and relevant arguments.",
    },
    {
        title: "Pulse",
        subTitle: "Screen time micro-session limiter",
        image: _endPortal,
        chipText: "🌀 Concept",
        dateDisplay: formatDate(new Date("2026-04-20T00:00:00")),
        url: "",
        description: "A screen time app with micro-sessions. Open any app freely, get a short window to use it, and get cut off when time's up.",
        footer: "iOS 17+ & Android 13+"
    },
    {
        title: "Cheatsheet",
        subTitle: "A collection of useful cheatsheets",
        image: _endPortal,
        chipText: "🧩 MVP",
        dateDisplay: "awaiting",
        url: "/cheatsheet",
        description: "A collection of useful cheatsheets for various topics.",
    },
    {
        title: "TechDashboard",
        subTitle: "Pit dashboard for FRC",
        image: _endPortal,
        chipText: "🌀 Concept",
        dateDisplay: "awaiting",
        description: "A pit display for FIRST Robotics competitions, integrating robot telemetry, battery tracker, self-tests, slack messaging, and more.",
    },
    {
        title: "MegaCSV",
        subTitle: "Preview large CSV files",
        image: _endPortal,
        chipText: "🌀 Concept",
        dateDisplay: "awaiting",
        description: "Preview large CSV files without crashing your computer.",
        url: "/megacsv"
    },
    {
        title: "Itinerary",
        subTitle: "Optimize travel by public transit",
        image: _endPortal,
        chipText: "🌀 Concept",
        dateDisplay: "awaiting",
        description: "description."
    }
];

export default function Projects() {
    const {currentTheme} = useTheme();

    const themedProjects = useMemo(() => projects.map((project) => {
        if (project.title !== "Unveil Technologies") return project;

        return {
            ...project,
            image: currentTheme === "night" ? _unveil_light : _unveil_dark
        };
    }), [currentTheme]);

    return (
        <div className="section projects">
            <SectionTitle text={"Projects"} />
            <div className="projects-grid">
                {themedProjects.map((project) => (
                    <Card key={project.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()} {...project} />
                ))}
            </div>
        </div>
    );
};
