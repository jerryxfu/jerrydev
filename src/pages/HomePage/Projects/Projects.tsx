import React from "react";
import "./Projects.scss";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";
import ProjectCard, {Project} from "./components/ProjectCard.tsx";

import _favicon from "../../../assets/favicon.png";
import _reefscape from "../../../assets/projects/reefscape.png";

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
        image: "https://placehold.co/600x400?text=?",
        chipText: "🚧 WIP",
        date: new Date(),
        description: "description."
    },
    {
        title: "BapUtils",
        subTitle: "A Hypixel Skyblock Minecraft Forge mod",
        image: "https://placehold.co/600x400?text=?",
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
        image: "https://placehold.co/600x400?text=?",
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
        image: _favicon,
        chipText: "🟢 Stable",
        date: new Date(),
        description: "description."
    },
    {
        title: "LLM vs LLM",
        subTitle: "Two LLMs debate on a given topic",
        image: "https://placehold.co/600x400?text=?",
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
        image: "https://placehold.co/600x400?text=?",
        chipText: "✅ Delivered",
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
