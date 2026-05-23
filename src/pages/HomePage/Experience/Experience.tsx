import "./Experience.scss";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";
import Card, {type CardProps} from "../../../components/Card/Card.tsx";
import _crchum from "../../../assets/experience/crchum.png";
import _t4k from "../../../assets/experience/t4k_special_edition.png";
import _ftc from "../../../assets/experience/ftc_icon_horz.png";
import _zon01 from "../../../assets/experience/zone01.png";
import {formatDate} from "../../../utils.ts";

const experiences: CardProps[] = [
    {
        title: "CHUM Research Centre",
        subTitle: "Research Assistant",
        image: _crchum,
        dateDisplay: formatDate(new Date("2025-06-26T00:00:00")),
        url: "https://www.chumontreal.qc.ca/en/crchum",
        description: "Analyzed regional pleural strain via lung ultrasound elastography to establish normative values and their correlations with tidal volume in healthy volunteers. ",
        footer: "Details on CV"
    },
    {
        title: "FIRST Robotics Team 3990",
        subTitle: "Tech for Kids mentor & former student",
        image: _t4k,
        dateDisplay: formatDate(new Date("2023-01-06T00:00:00")),
        url: "https://www.thebluealliance.com/team/3990",
        description: "Mentored high school students in programming, lectured computer vision and machine learning. Participated (me) in 11 FRC competitions, including 3 World Championships",
        // 2023: Finger Lakes, Trois-Rivières, World Championship
        // 2024: Montreal, Long Island, World Championship
        // 2025: Vancouver, Montreal, Las Vegas, World Championship
        // 2026: Las Vegas
        footer: "Details on CV"
    },
    {
        title: "FIRST Tech Challenge",
        subTitle: "Team 20117 Student",
        image: _ftc,
        dateDisplay: formatDate(new Date("2021-09-18T00:00:00")),
        description: "Participated in a FTC regional. Developed some skills in Java programming, engineering design, and teamwork.",
    },
    {
        title: "Robotique Zone01",
        subTitle: "World Robot Olympiad (WRO)",
        image: _zon01,
        dateDisplay: formatDate(new Date("2019-01-01T00:00:00")),
        description: "Applied basic programming and robot construction using LEGO Mindstorms NXT and LEGO Mindstorms EV3.",
    }
];

export default function Experience() {
    return (
        <div className="section experience">
            <SectionTitle text={"Experience & Extras"} />
            <div className="experience-grid">
                {experiences.map((experience) => {
                    return (
                        <Card key={experience.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()} {...experience} />
                    );
                })}
            </div>
        </div>
    );
}
