import React from "react";
import "./Projects.scss";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";
import ProjectCard, {Project} from "./components/ProjectCard.tsx";
import _reefscape from "../../../assets/projects/reefscape.png";
import _llmvsllm from "../../../assets/projects/llmvsllm.png";
import _doublestartyre from "../../../assets/projects/doublestartyre.png";
import _baputils from "../../../assets/projects/baputils.png";
import _jerrybot from "../../../assets/projects/jerrybot.png";
import _jerryxf from "../../../assets/projects/jerryxf.png";
import _conditioner from "../../../assets/projects/conditioner.png";
import _kahootBot from "../../../assets/projects/khaoot_bot.mp4";
import _weatherStation from "../../../assets/projects/weather_station.jpg";
import _endPortal from "../../../assets/projects/end_portal.jpg";

const projects: Project[] = [
    {
        title: "SuperICU",
        subTitle: "A tool to preview ICU monitor data",
        image: _endPortal,
        chipText: "🧩 MVP",
        date: new Date(),
        url: "/supericu",
        description: "ICU monitor is a tool to playback and visualize data from Intensive Care Unit monitor logs, including waveforms, vitals, and alarms, all in an ICU monitor-like interface."
    },
    {
        title: "ECG ECG previewer",
        subTitle: "A tool to preview ECG waveforms",
        image: _endPortal,
        chipText: "🧩 MVP",
        date: new Date(),
        description: "ECG ECG previewer is a tool to visualize ECG waveforms, allowing users to view and analyze ECG data in a user-friendly interface.",
        url: "/waveform"
    },
    {
        title: "Conditioner",
        subTitle: "A rule based diagnostic app",
        image: _conditioner,
        chipText: "🚧 WIP",
        date: new Date(),
        description: "Conditioner is a weighted rule-based diagnostic app that allows users to select symptoms and receive preliminary feedback on their \"condition\".",
    },
    {
        title: "BapUtils",
        subTitle: "A Hypixel Skyblock Minecraft Forge mod",
        image: _baputils,
        chipText: "💤 Stalled",
        date: new Date(),
        url: "https://github.com/jerryxfu/BapUtils",
        description: "BapUtils is a lightweight Hypixel Skyblock Minecraft Forge mod that provides various quality of life utilities.",
        footer: "/bap"
    },
    {
        title: "Doublestartyre CA",
        subTitle: "",
        image: _doublestartyre,
        chipText: "✅ Delivered",
        date: new Date(),
        url: "https://doublestartyre.ca",
        description: "Doublestartyre.ca is a website for Doublestar Tire, a Dodo Wheels partner in Canada.",
        footer: "Contracted by Dodo Wheels"
    },
    {
        title: "Kahoot! flood bot",
        subTitle: "Simulates mouse and keyboard input to join kahoots",
        image: _kahootBot,
        chipText: "🔴 Broken",
        date: new Date(),
        url: "https://github.com/jerryxfu/kahoot-bot",
        description: "Uses PyAutoGUI to simulate inputs to join kahoots and answer questions in one click. No longer works due to Kahoot updates.",
    },
    {
        title: "JerryBot",
        subTitle: "A comprehensive discord bot",
        image: _jerrybot,
        chipText: "📦 Archived",
        url: "https://github.com/jerryxfu/JerryBot",
        date: new Date(),
        description: "JerryBot was a comprehensive all purpose Discord bot that provided various features and utilities.",
    },
    {
        title: "Mizu",
        subTitle: "A clean and unrestricted sticky notes workspace",
        image: _endPortal,
        chipText: "🌀 Concept",
        date: new Date(),
        description: "description."
    },
    {
        title: "jerryxf.net, API, PyAPI",
        subTitle: "This website, right here!",
        image: _jerryxf,
        chipText: "🟢 Stable",
        date: new Date(),
        description: "This portfolio website, the API, and the PyAPI that empowers other projects.",
    },
    {
        title: "LLM vs LLM",
        subTitle: "Two LLMs debate on a given topic",
        image: _llmvsllm,
        chipText: "🎖️ Fulfilled",
        url: "https://github.com/jerryxfu/llmvsllm",
        date: new Date(),
        description: "LLM vs LLM was a project that allowed two large language models to debate on a given topic, showcasing the capabilities of LLMs in generating coherent and relevant arguments.",
    },
    {
        title: "Mailman",
        subTitle: "Simple reference tables for writing emails",
        image: _endPortal,
        chipText: "🧩 MVP",
        date: new Date(),
        url: "/cheatsheet/mailman",
        description: "Mailman is a set of simple tips like reference tables for email starting and ending phrases.",
    },
    {
        title: "FRC Scorekeeper interface",
        subTitle: "A FRC scorekeeper interface for REEFSCAPE season",
        image: _reefscape,
        chipText: "🔒 Internal",
        date: new Date(),
        url: "https://mail.rseqmontreal.com/fr/evenements-speciaux/competitions-de-robotique/",
        description: "A real-time score tracking/broadcasting app for our off-season competitions using WebSocket.",
        footer: "Contracted by RSEQ Montreal"
    },
    {
        title: "RPI Pico weather station",
        subTitle: "A small indoor weather station",
        image: _weatherStation,
        chipText: "🎖️ Fulfilled",
        date: new Date(),
        description: "A cool Raspberry Pi Pico bricolage weather station that displays temperature, humidity, pressure, and air quality info along with dynamic lighting.",
    },
    {
        title: "Transient Share",
        subTitle: "A tool to share files and text snippets",
        image: _endPortal,
        chipText: "🌀 Concept",
        date: new Date(),
        description: "description.",
        url: "/transient"
    },
    {
        title: "Group availability app",
        subTitle: "A tool for schedule group events",
        image: _endPortal,
        chipText: "🌀 Concept",
        date: new Date(),
        description: "description."
    },
    {
        title: "Itinerary",
        subTitle: "A tool to optimize travel by public transit",
        image: _endPortal,
        chipText: "🌀 Concept",
        date: new Date(),
        description: "description."
    },
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
                            date={project.date}
                            footer={project.footer}
                        />
                    );
                })}
            </div>
        </div>
    );
};
