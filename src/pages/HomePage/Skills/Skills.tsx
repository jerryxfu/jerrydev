import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";
import "./Skills.scss";
import SkillCard from "./components/SkillCard.tsx";
import _djs from "../../../assets/tech_stack/djs.png";
import _html from "../../../assets/tech_stack/html.png";
import _java from "../../../assets/tech_stack/java.svg";
import _javascript from "../../../assets/tech_stack/javascript.png";
import _kotlin from "../../../assets/tech_stack/kotlin.svg";
import _python from "../../../assets/tech_stack/python.png";
import _pytorch from "../../../assets/tech_stack/pytorch.png";
import _react from "../../../assets/tech_stack/react.svg";
import _sass from "../../../assets/tech_stack/sass.png";
import _lightroom from "../../../assets/lightroom.png";

const tech_stack = [
    {
        name: "DiscordJS", color: "#a6adff10", iconUrl: _djs, score: 4, chipText: "4/5", url: "https://discord.js.org/#/"
    },
    {
        name: "HTML", color: "#ffc1a610", iconUrl: _html, score: 4, chipText: "4/5", url: "https://html.spec.whatwg.org/"
    },
    {
        name: "Java",
        color: "#a6eaff10",
        description: "Robots (WPILib), Minecraft Forge",
        iconUrl: _java,
        score: 5,
        chipText: "5/5",
        url: "https://www.java.com/en/"
    },
    {
        name: "JavaScript",
        color: "#fff5a610",
        description: "ReactJS, APIs, services",
        iconUrl: _javascript,
        score: 5,
        chipText: "5/5",
        url: "https://developer.oracle.com/languages/javascript.html"
    },
    {
        name: "Kotlin",
        color: "#e6a6ff10",
        description: "Minecraft Forge",
        iconUrl: _kotlin,
        score: 1,
        chipText: "1/5",
        url: "https://kotlinlang.org/"
    },
    {
        name: "Python",
        color: "#ffeda610",
        description: "PyTorch, matplotlib",
        iconUrl: _python,
        score: 3,
        chipText: "3/5",
        url: "https://www.python.org/"
    },
    {
        name: "PyTorch",
        color: "#ffb5a610",
        description: "Object detection",
        iconUrl: _pytorch,
        score: 3,
        chipText: "3/5",
        url: "https://pytorch.org/"
    },
    {
        name: "React",
        color: "#a6edff10",
        description: "JS/TS, Vite, gsap, mui",
        iconUrl: _react,
        score: 4,
        chipText: "4/5",
        url: "https://react.dev/"
    },
    {name: "Sass/CSS", color: "#ffa6d210", iconUrl: _sass, score: 2, chipText: "2/5", url: "https://sass-lang.com/"},
    {name: "Adobe Lightroom", color: "#2daaff10", iconUrl: _lightroom, score: 3, chipText: "3/5", url: "https://lightroom.adobe.com/"}
];

export default function Skills() {
    return (
        <div className="section skills">
            <SectionTitle text={"Skills"} />

            <div className="skills_container">
                <div className="skills_grid">
                    {tech_stack.map((tech, index) => (
                        <SkillCard
                            key={index}
                            image={tech.iconUrl}
                            title={tech.name}
                            description={tech.description || ""}
                            score={tech.score}
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
                        src="https://github-stats.jerryxf.net/api/top-langs/?username=jerryxfu&layout=compact&langs_count=10&hide_title=true&hide_border=true&bg_color=00000000&title_color=87ceeb"
                        alt="Github languages card" />
                </div>
            </div>
        </div>
    );
};
