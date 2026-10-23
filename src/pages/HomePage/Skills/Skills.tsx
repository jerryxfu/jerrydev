import {useState} from "react";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";
import {isDarkTheme, useTheme} from "@/context/ThemeContext.tsx";
import "./Skills.scss";
import SkillCard from "./components/SkillCard.tsx";
import _java from "../../../assets/skills/java.svg";
import _javascript from "../../../assets/skills/javascript.jpeg";
import _react from "../../../assets/skills/react.svg";
import _webstack from "../../../assets/skills/webstack.png";
import _python from "../../../assets/skills/python.svg";
import _lightroom from "../../../assets/skills/lightroom.svg";
import _jetbrains from "../../../assets/skills/jetbrains.svg";
import _swift from "../../../assets/skills/swift.svg";
import _kotlin from "../../../assets/skills/kotlin.svg";

const tech_stack = [
    {
        // An invisible break after the slash: on a phone's narrow card it wraps there, out of the chip's way.
        name: "JavaScript/TS",
        color: "#2f74c010",
        description: "React, APIs, scripting, DiscordJS",
        iconUrl: _javascript,
        chipText: "5/5",
        url: "https://developer.oracle.com/languages/javascript.html"
    },
    {
        name: "Python",
        color: "#ffeda610",
        description: "PyTorch, OpenCV, scripting, MAVSDK",
        iconUrl: _python,
        chipText: "4/5",
        url: "https://www.python.org/"
    },
    {
        name: "Java",
        color: "#a6eaff10",
        description: "Robots (WPILib), Minecraft modding",
        iconUrl: _java,
        chipText: "5/5",
        url: "https://www.java.com/en/"
    },
    {
        name: "Kotlin",
        color: "#e6a6ff10",
        description: "Kotlin Multiplatform",
        iconUrl: _kotlin,
        chipText: "3/5",
        url: "https://kotlinlang.org/"
    },
    {
        name: "React",
        color: "#a6edff10",
        description: "TS/JS, Vite, OAuth",
        iconUrl: _react,
        chipText: "4/5",
        url: "https://react.dev/"
    },
    {
        name: "SwiftUI",
        color: "#ffc1a610",
        description: "iOS, iPadOS, watchOS",
        iconUrl: _swift,
        chipText: "2/5",
        url: "https://developer.apple.com/swiftui/"
    },
    {
        name: "HTML, Sass/CSS", color: "#ffc1a610", iconUrl: _webstack, chipText: "4/5", url: "https://html.spec.whatwg.org/"
    },
    {
        name: "Adobe Lightroom",
        color: "#2daaff10",
        iconUrl: _lightroom,
        chipText: "3/5",
        url: "https://lightroom.adobe.com/"
    },
    {
        name: "JetBrains IDEs",
        color: "#ff6ea610",
        iconUrl: _jetbrains,
        chipText: "❤️",
        url: "https://www.jetbrains.com/"
    }
];

// The languages card is a picture from the stats server, so its text can't follow the theme: on the dark themes it's
// asked for in a light grey (Night's --text-2), as its default, #434d58, is 2.2:1 there.
const LANGUAGES_CARD = "https://github-stats.jerryxf.net/api/top-langs/?username=jerryxfu&layout=compact&langs_count=20"
    + "&hide_title=true&hide_border=true&bg_color=00000000&title_color=abcdef";

export default function Skills() {
    const {currentTheme} = useTheme();
    // On some networks Vercel's automatic protection answers the card with its checkpoint, which a picture can't pass.
    const [cardFailed, setCardFailed] = useState(false);
    return (
        <div className="section skills">
            <SectionTitle
                text={"Tools & Languages"}
                description={"The stuff I build my projects with, with a thoroughly unscientific rating of how good I am at each." +
                    ` ${tech_stack.length} tools, honestly rated.`}
            />

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
                    <h2 style={{fontWeight: 400}}>Github top languages</h2>
                    {cardFailed ? (
                        <p className="skills_languages-fallback text-caption">The card didn't load.</p>
                    ) : (
                        <img
                            className="skills_languages-card"
                            src={isDarkTheme(currentTheme) ? `${LANGUAGES_CARD}&text_color=c8c8c8` : LANGUAGES_CARD}
                            alt="Github languages card"
                            width={300}
                            height={285}
                            loading="lazy"
                            decoding="async"
                            fetchPriority="low"
                            onError={() => setCardFailed(true)} />
                    )}
                </div>
            </div>
        </div>
    );
};
