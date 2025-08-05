import React from "react";
import "./Projects.scss";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";
import ProjectCard from "./components/ProjectCard.tsx";

import _favicon from "../../../assets/favicon.png";

const projects = [
    {
        title: "Email Helper",
        subTitle: "Simple reference tables for writing emails",
        image: _favicon,
        chipText: "",
        date: new Date(),
        description: "Hello, World! This is a cool project!"
    },
    {
        title: "Conditioner",
        subTitle: "A rule based diagnostic app",
        image: _favicon,
        chipText: "",
        date: new Date(),
        description: "Hello, World! This is a cool project!"
    },
    {title: "BapUtils", subTitle: "A Hypixel Skyblock Minecraft Forge mod", image: _favicon, chipText: "", date: new Date(), description: "Hello, World! This is a cool project!"},
    {
        title: "Kahoot flood bot",
        subTitle: "Simulates mouse and keyboard input to join kahoots",
        image: _favicon,
        chipText: "",
        date: new Date(),
        description: "Hello, World! This is a cool project!"
    },
    {title: "JerryBot", subTitle: "A comprehensive discord bot", image: _favicon, chipText: "", date: new Date(), description: "Hello, World! This is a cool project!"},
    {title: "Mizu", subTitle: "A clean and unrestricted sticky notes workspace", image: _favicon, chipText: "", date: new Date(), description: "Hello, World! This is a cool project!"},
    {title: "Group availability app", subTitle: "A tool for schedule group events", image: _favicon, chipText: "", date: new Date(), description: "Hello, World! This is a cool project!"},
    {title: "Itinerary", subTitle: "A tool to optimize travel by public transit", image: _favicon, chipText: "", date: new Date(), description: "Hello, World! This is a cool project!"},
    {title: "Doublestartyre CA", subTitle: "", image: _favicon, chipText: "", date: new Date(), description: "Hello, World! This is a cool project!"},
];

export default function Projects() {
    return (
        <div className="section projects">
            <SectionTitle text={"Projects"} />
            {"<<< SECTION IN PROGRESS >>>"}
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
                            date={project.date}
                        />
                    );
                })}
            </div>
        </div>
    );
};
