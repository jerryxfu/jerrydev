import React from "react";
import "./Projects.scss";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";
import ProjectCard, {Project} from "./components/ProjectCard.tsx";
import _llmvsllm from "../../../assets/projects/llmvsllm.png";
import _doublestartyre from "../../../assets/projects/doublestartyre.png";
import _baputils from "../../../assets/projects/baputils.png";
import _jerrybot from "../../../assets/projects/jerrybot.png";
import _jerryxf from "../../../assets/projects/jerryxf.png";
import _conditioner from "../../../assets/projects/conditioner.png";
import _kahootBot from "../../../assets/projects/khaoot_bot.mp4";
import _weatherStation from "../../../assets/projects/weather_station.jpg";
import _endPortal from "../../../assets/projects/end_portal.jpg";
import _supericu from "../../../assets/projects/supericu.png";
import _scheduler from "../../../assets/projects/scheduler.png";
import _scorekeeper from "../../../assets/projects/scorekeeper.png";
import _autoscout from "../../../assets/projects/autoscout.png";
import _medive from "../../../assets/projects/medive.png";
import _unveil from "../../../assets/unveil_dark.png";

function formatDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const today = new Date();
    // Zero out time for both dates
    today.setHours(0, 0, 0, 0);
    const initial_date = new Date(date);
    initial_date.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - initial_date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return `${day}-${month}-${year} (${diffDays} days ago)`;
}

const projects: Project[] = [
    {
        title: "MEDIVE",
        subTitle: "Medical Inference via Vector Embedding",
        image: _medive,
        chipText: "🚧 WIP",
        dateDisplay: formatDate(new Date("2025-08-14")),
        url: "https://github.com/jerryxfu/medive",
        // url: "/medive",
        description: "MEDIVE is a personal research project aiming to use vector embeddings to encode symptom and condition meaning.",
    },
    {
        title: "SuperICU",
        subTitle: "A tool to preview ICU monitor data",
        image: _supericu,
        chipText: "🟢 Stable",
        dateDisplay: formatDate(new Date("2025-08-19")),
        url: "/supericu",
        description: "SuperICU is a tool to playback and visualize data from Intensive Care Unit monitor logs, including waveforms, vitals, and alarms, all in a patient monitor-like interface."
    },
    {
        title: "Scheduler",
        subTitle: "A daily/weekly schedule visualizer",
        image: _scheduler,
        chipText: "🟢 Stable",
        dateDisplay: formatDate(new Date("2025-08-27")),
        url: "/scheduler",
        description: "A web app that allows users to visualize and compare daily/weekly schedules with a clean interface.",
    },
    {
        title: "BapUtils",
        subTitle: "A Hypixel Skyblock Minecraft Forge mod",
        image: _baputils,
        chipText: "💤 Stalled",
        dateDisplay: formatDate(new Date("2023-06-24")),
        url: "https://github.com/jerryxfu/BapUtils",
        description: "BapUtils is a lightweight Minecraft Forge mod for Hypixel Skyblock that provides various quality of life utilities.",
        footer: "/bap"
    },
    {
        title: "Doublestartyre CA",
        subTitle: "",
        image: _doublestartyre,
        chipText: "✅ Delivered",
        dateDisplay: formatDate(new Date("2024-07-11")),
        url: "https://doublestartyre.ca",
        description: "Doublestartyre.ca is a website for Doublestar Tire, a Dodo Wheels partner in Canada.",
        footer: "For Dodo Wheels"
    },
    {
        title: "UNVEIL",
        subTitle: "Uncover the unseen",
        image: _unveil,
        chipText: "🚧 WIP",
        dateDisplay: formatDate(new Date("2025-10-01")),
        // Unveil Technologies is an intelligent platform for orchestration and autonomy built to bring clarity to complex missions. From autonomous drone systems to integrated command interfaces, Unveil transforms real-time data into actionable insight—empowering operators to uncover the unseen on the battlefield.
        url: "",
        description: "An intelligent orchestration platform for mission control integrating drones to transform real-time data into actionable insight and empower operators to uncover the unseen on the battlefield.",
    },
    {
        title: "Conditioner",
        subTitle: "A rule based diagnostic app",
        image: _conditioner,
        chipText: "🔁 Superseded",
        dateDisplay: formatDate(new Date("2025-07-24")),
        url: "/conditioner",
        description: "Conditioner is a weighted rule-based diagnostic app that allows users to select symptoms and receive preliminary feedback on their \"condition\".",
    },
    {
        title: "Kahoot! flood bot",
        subTitle: "Simulates mouse and keyboard input to join kahoots",
        image: _kahootBot,
        chipText: "🔴 Broken",
        dateDisplay: formatDate(new Date("2024-07-1")),
        url: "https://github.com/jerryxfu/kahoot-bot",
        description: "Uses PyAutoGUI to simulate inputs to join kahoots and answer questions in one click. No longer works due to Kahoot updates.",
    },
    {
        title: "JerryBot",
        subTitle: "A comprehensive discord bot",
        image: _jerrybot,
        chipText: "📦 Archived",
        url: "https://github.com/jerryxfu/JerryBot",
        dateDisplay: formatDate(new Date("2021-09-01")),
        description: "JerryBot was a comprehensive all purpose Discord bot that provided various features and utilities.",
    },
    {
        title: "jerryxf.net, API",
        subTitle: "This website, right here!",
        image: _jerryxf,
        chipText: "🟢 Stable",
        dateDisplay: formatDate(new Date("2022-07-25")), // aspectofjerry.dev registration date
        description: "This portfolio website, the API, and the PyAPI that empowers other projects.",
    },
    {
        title: "FRC Scorekeeper interface",
        subTitle: "A FRC scorekeeper interface for REEFSCAPE season",
        image: _scorekeeper,
        chipText: "🔒 Internal",
        dateDisplay: formatDate(new Date("2025-05-09")),
        url: "https://mail.rseqmontreal.com/fr/evenements-speciaux/competitions-de-robotique/",
        description: "A real-time score tracking/broadcasting app for our off-season competitions using WebSocket.",
        footer: "For RSEQ Montreal"
    },
    {
        title: "RPI Pico weather station",
        subTitle: "A small indoor weather station",
        image: _weatherStation,
        chipText: "🎖️ Fulfilled",
        dateDisplay: formatDate(new Date("2025-02-08")),
        description: "A cool Raspberry Pi Pico bricolage weather station that displays temperature, humidity, pressure, and air quality info along with dynamic lighting.",
    },
    {
        title: "FRC AutoScout",
        subTitle: "Autonomous scouting for FRC",
        image: _autoscout,
        chipText: "💤 Stalled",
        dateDisplay: formatDate(new Date("2024-03-23")), // MotionLens creation (-> auto-scout)
        description: "A Python script that uses The Blue Alliance data to generate scouting reports, including Zebra MotionWorks motion analysis.",
        url: "https://github.com/jerryxfu/auto-scout"
    },
    {
        title: "LLM vs LLM",
        subTitle: "Two LLMs debate on a given topic",
        image: _llmvsllm,
        chipText: "🎖️ Fulfilled",
        url: "https://github.com/jerryxfu/llmvsllm",
        dateDisplay: formatDate(new Date("2024-05-18")),
        description: "LLM vs LLM was a project that allowed two large language models to debate on a given topic, showcasing the capabilities of LLMs in generating coherent and relevant arguments.",
    },
    {
        title: "Cheatsheet",
        subTitle: "A collection of useful cheatsheets",
        image: _endPortal,
        chipText: "🚧 WIP",
        dateDisplay: "awaiting",
        url: "/cheatsheet",
        description: "A collection of useful cheatsheets for various topics.",
    },
    {
        title: "Mailman",
        subTitle: "Simple reference tables for writing emails",
        image: _endPortal,
        chipText: "🧩 MVP",
        dateDisplay: "awaiting",
        url: "/cheatsheet/mailman",
        description: "Mailman is a set of simple tips like reference tables for email starting and ending phrases.",
    },
    {
        title: "Expedite",
        subTitle: "A tool to share files and text snippets",
        image: _endPortal,
        chipText: "🌀 Concept",
        dateDisplay: "awaiting",
        description: "description.",
        url: "/expedite"
    },
    {
        title: "Breeze",
        subTitle: "A clean and unrestricted sticky notes workspace",
        image: _endPortal,
        chipText: "🌀 Concept",
        dateDisplay: "awaiting",
        description: "description."
    },
    {
        title: "MegaCSV",
        subTitle: "A tool to preview large CSV files",
        image: _endPortal,
        chipText: "🌀 Concept",
        dateDisplay: "awaiting",
        description: "Preview large CSV files without crashing your computer.",
        url: "/megacsv"
    },
    {
        title: "Itinerary",
        subTitle: "A tool to optimize travel by public transit",
        image: _endPortal,
        chipText: "🌀 Concept",
        dateDisplay: "awaiting",
        description: "description."
    },
    {
        title: "Group availability app",
        subTitle: "A tool for scheduler group events",
        image: _endPortal,
        chipText: "🌀 Concept",
        dateDisplay: "awaiting",
        description: "description."
    }
];

export default function Projects() {
    return (
        <div className="section projects">
            <SectionTitle text={"Projects"} />
            <div className="projects-grid">
                {projects.map((project) => {
                    return (
                        <ProjectCard
                            key={project.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}
                            image={project.image}
                            title={project.title}
                            subTitle={project.subTitle}
                            description={project.description}
                            chipText={project.chipText}
                            url={project.url}
                            dateDisplay={project.dateDisplay}
                            footer={project.footer}
                        />
                    );
                })}
            </div>
        </div>
    );
};
