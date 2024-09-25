import React from "react";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";

import _djs from "../../../assets/tech_stack/djs.png";
import _html from "../../../assets/tech_stack/html.png";
import _java from "../../../assets/tech_stack/java.svg";
import _javascript from "../../../assets/tech_stack/javascript.png";
import _kotlin from "../../../assets/tech_stack/kotlin.svg";
import _python from "../../../assets/tech_stack/python.png";
import _pytorch from "../../../assets/tech_stack/pytorch.png";
import _react from "../../../assets/tech_stack/react.svg";
import _sass from "../../../assets/tech_stack/sass.png";
import _tensorflow from "../../../assets/tech_stack/tensorflow.svg";
import _wpilib from "../../../assets/tech_stack/wpilib.png";
import _cloudflare from "../../../assets/dev_tools/cloudflare.svg";
import _digitalocean from "../../../assets/dev_tools/digitalocean.png";
import _git from "../../../assets/dev_tools/git.svg";
import _github from "../../../assets/dev_tools/github.svg";
import _intellij_idea from "../../../assets/dev_tools/intellij_idea.svg";
import _pycharm from "../../../assets/dev_tools/pycharm.svg";
import _vscode from "../../../assets/dev_tools/vscode.svg";
import _webstorm from "../../../assets/dev_tools/webstorm.svg";
import SkillCard from "./components/SkillCard.tsx";

const tech_stack = [
    {
        name: "DiscordJS",
        color: "#a6adff",
        iconUrl: _djs,
        score: 4,
        url: "https://discord.js.org/#/"
    },
    {
        name: "HTML",
        color: "#ffc1a6",
        iconUrl: _html,
        score: 4,
        url: "https://html.spec.whatwg.org/"
    },
    {
        name: "Java",
        color: "#a6eaff",
        description: "Robots (WPILib), Minecraft Forge",
        iconUrl: _java,
        score: 5,
        url: "https://www.java.com/en/"
    },
    {
        name: "JavaScript",
        color: "#fff5a6",
        description: "ReactJS, APIs, services",
        iconUrl: _javascript,
        score: 5,
        url: "https://developer.oracle.com/languages/javascript.html"
    },
    {
        name: "Kotlin",
        color: "#e6a6ff",
        iconUrl: _kotlin,
        score: 1,
        url: "https://kotlinlang.org/"
    },
    {
        name: "Python",
        color: "#ffeda6",
        description: "PyTorch, matplotlib",
        iconUrl: _python,
        score: 3,
        url: "https://www.python.org/"
    },
    {
        name: "PyTorch",
        color: "#ffb5a6",
        description: "Object detection",
        iconUrl: _pytorch,
        score: 3,
        url: "https://pytorch.org/"
    },
    {
        name: "React",
        color: "#a6edff",
        description: "JS/TS, Vite, gsap, mui",
        iconUrl: _react,
        score: 4,
        url: "https://react.dev/"
    },
    {name: "Sass/CSS", color: "#ffa6d2", iconUrl: _sass, score: 3, url: "https://sass-lang.com/"},
    {name: "TensorFlow", color: "#ffe1a6", iconUrl: _tensorflow, score: 1, url: "https://www.tensorflow.org/"},
    {
        name: "WPILib",
        color: "#ffa6af",
        description: "First Robotics Competition (FRC)",
        iconUrl: _wpilib,
        score: 3,
        url: "https://docs.wpilib.org/en/stable/"
    },
];

const dev_tools = [
    {name: "Cloudflare", color: "#ffcea6", iconUrl: _cloudflare, url: "https://www.cloudflare.com/"},
    {name: "DigitalOcean", color: "#a6d2ff", iconUrl: _digitalocean, url: "https://www.digitalocean.com/"},
    {name: "Git", color: "#ffaca6", iconUrl: _git, url: "https://git-scm.com/"},
    {name: "GitHub", color: "#a6d2ff", iconUrl: _github, url: "https://github.com/AspectOfJerry"},
    {name: "IntelliJ IDEA", color: "#ffa6b9", iconUrl: _intellij_idea, url: "https://www.jetbrains.com/idea/"},
    {name: "PyCharm", color: "#a6ffdb", iconUrl: _pycharm, url: "https://www.jetbrains.com/pycharm/"},
    {name: "VS Code", color: "#a6dbff", iconUrl: _vscode, url: "https://code.visualstudio.com/"},
    {name: "WebStorm", color: "#a6fbff", iconUrl: _webstorm, url: "https://www.jetbrains.com/webstorm/"}
];

export default function Skills() {
    return (
        <div>
            <SectionTitle text={"Skills"} />

            {tech_stack.map((tech, index) => (
                <SkillCard
                    key={index}
                    logo={tech.iconUrl}
                    title={tech.name}
                    description={tech.description}
                    score={tech.score}
                    url={tech.url}
                    chipText={"active"}
                />
            ))}
        </div>
    );
};
