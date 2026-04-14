import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";
import "./Skills.scss";
import SkillCard from "./components/SkillCard.tsx";
import _java from "../../../assets/skills/java.svg";
import _javascript from "../../../assets/skills/javascript.png";
import _react from "../../../assets/skills/react.svg";
import _webstack from "../../../assets/skills/webstack.png";

const tech_stack = [
    {
        name: "JavaScript/TS",
        color: "#2f74c010",
        description: "React, APIs, scripting, DiscordJS",
        iconUrl: _javascript,
        chipText: "5/5",
        url: "https://developer.oracle.com/languages/javascript.html"
    },
    {
        name: "Java",
        color: "#a6eaff10",
        description: "Robots (WPILib), Minecraft Forge modding",
        iconUrl: _java,
        chipText: "5/5",
        url: "https://www.java.com/en/"
    },
    {
        name: "Kotlin",
        color: "#e6a6ff10",
        description: "Kotlin Multiplatform, Minecraft Forge modding",
        iconUrl: "https://favicon.im/kotlinlang.org",
        chipText: "3/5",
        url: "https://kotlinlang.org/"
    },
    {
        name: "React",
        color: "#a6edff10",
        description: "JS/TS, Vite, mui, framer-motion",
        iconUrl: _react,
        chipText: "4/5",
        url: "https://react.dev/"
    },
    {
        name: "Python",
        color: "#ffeda610",
        description: "PyTorch, OpenCV, scripting, MAVSDK",
        iconUrl: "https://favicon.im/www.python.org?larger=true",
        chipText: "3/5",
        url: "https://www.python.org/"
    },
    {
        name: "SwiftUI",
        color: "#ffc1a610",
        description: "With Kotlin Multiplatform",
        iconUrl: "https://favicon.im/www.swift.org?larger=true",
        chipText: "1/5",
        url: "https://developer.apple.com/swiftui/"
    },
    {
        name: "HTML, Sass/CSS", color: "#ffc1a610", iconUrl: _webstack, chipText: "4/5", url: "https://html.spec.whatwg.org/"
    },
    {
        name: "Adobe Lightroom",
        color: "#2daaff10",
        iconUrl: "https://favicon.im/lightroom.adobe.com?larger=true",
        chipText: "3/5",
        url: "https://lightroom.adobe.com/"
    },
    {
        name: "JetBrains IDEs",
        color: "#ff6ea610",
        iconUrl: "https://favicon.im/www.jetbrains.com",
        chipText: "❤️",
        url: "https://www.jetbrains.com/"
    }
];

export default function Skills() {
    return (
        <div className="section skills">
            <SectionTitle text={"Tools & Languages"} />

            <div className="skills_container">
                <div className="skills_grid">
                    {tech_stack.map((tech) => (
                        <SkillCard
                            key={tech.name}
                            image={tech.iconUrl}
                            title={tech.name}
                            description={tech.description || ""}
                            chipText={tech.chipText}
                            url={tech.url}
                            color={tech.color}
                        />
                    ))}
                </div>
                <div className="skills_text">
                    <h4>Github top languages</h4>
                    <img
                        className="skills_languages-card"
                        src="https://github-stats.jerryxf.net/api/top-langs/?username=jerryxfu&layout=compact&langs_count=20&hide_title=true&hide_border=true&bg_color=00000000&title_color=abcdef"
                        alt="Github languages card" />
                </div>
            </div>
        </div>
    );
};
