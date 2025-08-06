import React from "react";
import "./Projects.scss";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";
import ProjectCard, {Project} from "./components/ProjectCard.tsx";

import _favicon from "../../../assets/favicon.png";
import _reefscape from "../../../assets/projects/reefscape.png";
import _llmvsllm from "../../../assets/projects/llmvsllm.png";
import _doublestartyre from "../../../assets/projects/doublestartyre.png";
import _baputils from "../../../assets/projects/baputils.png";
import _jerrybot from "../../../assets/projects/jerrybot.png";
import _jerryxf from "../../../assets/projects/jerryxf.png";
import _conditioner from "../../../assets/projects/conditioner.png";

const projects: Project[] = [
    {
        title: "Email Helper",
        subTitle: "Simple reference tables for writing emails",
        image: "https://placehold.co/600x400?text=?",
        chipText: "🌀 Concept",
        date: new Date(),
        description: "description."
    },
    {
        title: "Conditioner",
        subTitle: "A rule based diagnostic app",
        image: _conditioner,
        chipText: "🚧 WIP",
        date: new Date(),
        description: "description."
    },
    {
        title: "BapUtils",
        subTitle: "A Hypixel Skyblock Minecraft Forge mod",
        image: _baputils,
        chipText: "💤 Stalled",
        date: new Date(),
        description: "description.",
        footer: "/bap"
    },
    {
        title: "Kahoot flood bot",
        subTitle: "Simulates mouse and keyboard input to join kahoots",
        image: "https://placehold.co/600x400?text=?",
        chipText: "🔴 Broken",
        date: new Date(),
        description: "description."
    },
    {
        title: "JerryBot",
        subTitle: "A comprehensive discord bot",
        image: _jerrybot,
        chipText: "📦 Archived",
        date: new Date(),
        description: "description."
    },
    {
        title: "Mizu",
        subTitle: "A clean and unrestricted sticky notes workspace",
        image: "https://placehold.co/600x400?text=?",
        chipText: "🌀 Concept",
        date: new Date(),
        description: "description."
    },
    {
        title: "jerryxf.net",
        subTitle: "This website, right here!",
        image: _jerryxf,
        chipText: "🟢 Stable",
        date: new Date(),
        description: "description."
    },
    {
        title: "LLM vs LLM",
        subTitle: "Two LLMs debate on a given topic",
        image: _llmvsllm,
        chipText: "🎖️ Fulfilled",
        url: "https://github.com/jerryxfu/llmvsllm",
        date: new Date(),
        description: "description."
    },
    {
        title: "RBPi weather station",
        subTitle: "A small indoor weather station",
        image: "https://placehold.co/600x400?text=?",
        chipText: "🎖️ Fulfilled",
        date: new Date(),
        description: "description.",
    },
    {
        title: "FRC Scorekeeper interface",
        subTitle: "A FRC scorekeeper interface for REEFSCAPE season",
        image: _reefscape,
        chipText: "🔒 Internal",
        date: new Date(),
        description: "A real-time score tracking app for our off-season competitions using WebSocket."
    },
    {
        title: "Group availability app",
        subTitle: "A tool for schedule group events",
        image: "https://placehold.co/600x400?text=?",
        chipText: "🌀 Concept",
        date: new Date(),
        description: "description."
    },
    {
        title: "Itinerary",
        subTitle: "A tool to optimize travel by public transit",
        image: "https://placehold.co/600x400?text=?",
        chipText: "🌀 Concept",
        date: new Date(),
        description: "description."
    },
    {
        title: "Doublestartyre CA",
        subTitle: "",
        image: _doublestartyre,
        chipText: "✅ Delivered",
        date: new Date(),
        url: "https://doublestartyre.ca",
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
