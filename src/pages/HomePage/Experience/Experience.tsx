import "./Experience.scss";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";
import Card, {CardProps} from "../../../components/Card/Card.tsx";
import _crchum from "../../../assets/experience/crchum.png";
import _t4k from "../../../assets/experience/t4k_special_edition.png";
import _doublestartyre from "../../../assets/projects/doublestartyre.png";
import _ftc from "../../../assets/experience/ftc_icon_horz.png";

function formatDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const today = new Date();
    // Zero out time for both dates
    today.setHours(0, 0, 0, 0);
    const initial_date = new Date(date);
    initial_date.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - initial_date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return `${day}-${month}-${year} (${diffDays} days ago)`;
}

const experiences: CardProps[] = [
    {
        title: "CHUM Research Centre",
        subTitle: "Research Assistant",
        image: _crchum,
        dateDisplay: formatDate(new Date("2025-06-26")),
        url: "https://www.chumontreal.qc.ca/en/crchum",
        description: "Analyzed regional pleural strain via lung ultrasound elastography to establish normative values and their correlations with tidal volume in healthy volunteers. ",
        footer: "Details on CV"
    },
    {
        title: "FIRST Robotics Team 3990",
        subTitle: "Tech for Kids mentor & former student",
        image: _t4k,
        dateDisplay: formatDate(new Date("2023-01-06")),
        url: "https://www.thebluealliance.com/team/3990",
        description: "Mentored high school students in programming, lectured computer vision and machine learning. Participated (me) in 11 FRC competitions, including 3 World Championships",
        // 2023: Finger Lakes, Trois-Rivières, World Championship
        // 2024: Montreal, Long Island, World Championship
        // 2025: Vancouver, Montreal, Las Vegas, World Championship
        // 2026: Las Vegas
        footer: "Details on CV"
    },
    {
        title: "Doublestartyre CA",
        subTitle: "",
        image: _doublestartyre,
        chipText: "✅ Delivered",
        dateDisplay: formatDate(new Date("2024-07-11")),
        url: "https://doublestartyre.ca",
        description: "Doublestartyre.ca is a website for Doublestar Tire, a Dodo Wheels partner in Canada.",
        footer: "For Dodo Wheels"
    },
    {
        title: "FIRST Tech Challenge",
        subTitle: " Team 20117 Student",
        image: _ftc,
        dateDisplay: formatDate(new Date("2021-09-18")),
        description: "Participated in a FTC regional. Developed some skills in Java programming, engineering design, and teamwork.",
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
