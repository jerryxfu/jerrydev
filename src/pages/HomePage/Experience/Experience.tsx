import {FileText} from "lucide-react";
import "./Experience.scss";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";
import Card, {type CardProps} from "../../../components/Card/Card.tsx";
import _crchum from "../../../assets/experience/crchum.png";
import _t4k from "../../../assets/experience/t4k_special_edition.png";
import _ftc from "../../../assets/experience/ftc_icon_horz.png";
import _zon01 from "../../../assets/experience/zone01.png";
import {formatDate} from "@/utils.ts";

const CV_URL = "https://cv.jerryxf.net";

// The card takes a pre-formatted string, but the callout below needs to compare dates to find the most
// recent entry, so the Date is what's stored and dateDisplay is derived at render. One source of truth:
// editing a start date can't leave the callout pointing at the wrong role.
type ExperienceEntry = Omit<CardProps, "dateDisplay"> & { date: Date };

const experiences: ExperienceEntry[] = [
    {
        title: "CHUM Research Centre",
        subTitle: "Research Assistant",
        image: _crchum,
        date: new Date("2025-06-26T00:00:00"),
        url: "https://www.chumontreal.qc.ca/en/crchum",
        specialLink: CV_URL,
        specialLinkText: "Open CV",
        description: "Analyzed regional pleural strain via lung ultrasound elastography to establish normative values and their correlations with tidal volume in healthy volunteers. ",
        footer: "Details on CV"
    },
    {
        title: "FIRST Robotics Team 3990",
        subTitle: "Mentor & former student",
        image: _t4k,
        specialLink: CV_URL,
        specialLinkText: "Open CV",
        date: new Date("2023-01-06T00:00:00"),
        url: "https://www.thebluealliance.com/team/3990",
        description: "Former student. Mentoring high school students in programming, computer vision and machine learning. Participated (me) in 11 FRC competitions, including 3 World Championships",
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
        url: "https://www.firstinspires.org/programs/ftc/",
        date: new Date("2021-09-18T00:00:00"),
        description: "Participated in a FTC regional. Developed some skills in Java programming, engineering design, and teamwork.",
    },
    {
        title: "Robotique Zone01",
        subTitle: "World Robot Olympiad (WRO)",
        image: _zon01,
        url: "https://www.zone01.ca/",
        date: new Date("2019-01-01T00:00:00"),
        description: "Applied basic programming and robot construction using LEGO Mindstorms NXT and LEGO Mindstorms EV3.",
    }
];

export default function Experience() {
    return (
        <div className="section experience">
            <SectionTitle
                text={"Experience & Extras"}
                description={"The notable extracurriculars and stuff beyond my own projects."}
            />

            <div className="experience_container">
                <div className="experience-grid">
                    {experiences.map(({date, ...experience}) => {
                        return (
                            <Card
                                key={experience.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}
                                {...experience}
                                dateDisplay={formatDate(date)}
                            />
                        );
                    })}
                </div>

                <aside className="experience_cv">
                    <div className="experience_cv-head">
                        <FileText size={20} aria-hidden="true" />
                        <div className="experience_cv-heading">
                            <h3>Curriculum Vitae</h3>
                            <p>cv.jerryxf.net</p>
                        </div>
                    </div>

                    <p className="experience_cv-blurb">
                        Custom built for the web with a PDF download option. Includes a more detailed list of my experience that would not fit well on
                        my website.
                    </p>

                    <a className="experience_cv-link" href={CV_URL} target="_blank" rel="noopener noreferrer">
                        <span>Open CV</span>
                        <span className="experience_cv-arrow" aria-hidden="true">→</span>
                    </a>
                </aside>
            </div>
        </div>
    );
}
