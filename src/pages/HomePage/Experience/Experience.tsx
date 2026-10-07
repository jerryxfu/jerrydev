import {useRef} from "react";
import {FileText} from "lucide-react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import "./Experience.scss";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";
import useLocalClock from "@/hooks/useLocalClock.ts";
import _crchum from "../../../assets/experience/crchum.png";
import _t4k from "../../../assets/experience/t4k_special_edition.png";
import _ftc from "../../../assets/experience/ftc_icon_horz.png";
import _zon01 from "../../../assets/experience/zone01.png";
import {formatDate} from "@/utils.ts";

gsap.registerPlugin(ScrollTrigger);

const CV_URL = "https://cv.jerryxf.net";

type ExperienceEntry = {
    title: string;
    subTitle: string;
    image: string;
    // A picture that fills its tile. Logos without it sit whole on white.
    fill?: boolean;
    date: Date; // when it started: the timeline's year, and the date line under the entry
    url: string;
    description: string;
    cv?: boolean; // the CV has more on it
};

// Newest first, down the timeline from now.
const experiences: ExperienceEntry[] = [
    {
        title: "CHUM Research Centre",
        subTitle: "Research Assistant",
        image: _crchum,
        date: new Date("2025-06-26T00:00:00"),
        url: "https://www.chumontreal.qc.ca/en/crchum",
        description: "Analyzed regional pleural strain via lung ultrasound elastography to establish normative values and their correlations with tidal volume in healthy volunteers. ",
        cv: true,
    },
    {
        title: "FIRST Robotics Team 3990",
        subTitle: "Mentor & former student",
        image: _t4k,
        fill: true,
        date: new Date("2023-01-06T00:00:00"),
        url: "https://www.thebluealliance.com/team/3990",
        description: "Former student. Mentoring high school students in programming, computer vision and machine learning. Participated (me) in 11 FRC competitions, including 3 World Championships",
        // 2023: Finger Lakes, Trois-Rivières, World Championship
        // 2024: Montreal, Long Island, World Championship
        // 2025: Vancouver, Montreal, Las Vegas, World Championship
        // 2026: Las Vegas
        cv: true,
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

// A start date as a <time> wants it, from the calendar fields, as formatDate reads them.
const isoDay = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function Experience() {
    const timeline = useRef<HTMLDivElement>(null);
    // Today in Montréal: the top of the line, where it runs to.
    const {date, day} = useLocalClock();

    useGSAP(() => {
        const root = timeline.current;
        if (!root) return;
        const q = gsap.utils.selector(root);

        const mm = gsap.matchMedia();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
            const [spine] = q(".experience-timeline_spine");
            const [glow] = q(".experience-timeline_glow");
            const [pulse] = q(".experience-timeline_pulse");
            const items = q(".experience-timeline_item");

            // In once, as it scrolls into view: the line runs down from now, and each entry comes in as the line
            // reaches it, its node first. Hidden before the first paint, since useGSAP runs as a layout effect.
            const intro = gsap.timeline({paused: true, defaults: {ease: "power2.out"}})
                .fromTo(spine!, {scaleY: 0, transformOrigin: "50% 0%"}, {scaleY: 1, duration: 1.1, ease: "power2.inOut"}, 0);
            items.forEach((item, i) => {
                const at = 0.1 + i * 0.16;
                intro
                    .fromTo(item.querySelector(".experience-timeline_node"), {scale: 0}, {scale: 1, duration: 0.45, ease: "back.out(3)"}, at)
                    .fromTo(item.querySelectorAll(".experience-timeline_year, .experience-timeline_today, .experience-timeline_card"),
                        {opacity: 0, x: 16}, {opacity: 1, x: 0, duration: 0.6}, at + 0.05);
            });

            // Then, while it's on screen, a glow runs up the line into now every few seconds, and now pulses when it
            // gets there. The window in Experience.scss slides from below the line (125%) to above it (-25%).
            const loop = gsap.timeline({paused: true, repeat: -1, repeatDelay: 2.2})
                .fromTo(glow!, {"--glow-at": "125%"}, {"--glow-at": "-25%", duration: 2.4, ease: "sine.inOut"})
                .fromTo(pulse!, {scale: 1, opacity: 0.7}, {scale: 2.8, opacity: 0, duration: 1.1, ease: "power2.out"}, ">-0.45");

            let introDone = false;
            let onScreen = false;
            const sync = () => (introDone && onScreen ? loop.play() : loop.pause());
            intro.eventCallback("onComplete", () => {
                introDone = true;
                sync();
            });
            ScrollTrigger.create({trigger: root, start: "top 80%", once: true, onEnter: () => intro.play()});
            ScrollTrigger.create({
                trigger: root,
                start: "top bottom",
                end: "bottom top",
                onToggle: (self) => {
                    onScreen = self.isActive;
                    sync();
                },
            });
        });
        return () => mm.revert();
    }, {scope: timeline});

    return (
        <div className="section experience">
            <SectionTitle
                text={"Experience & Extras"}
                description={"The notable extracurriculars and stuff beyond my own projects." +
                    ` Since ${Math.min(...experiences.map(({date}) => date.getFullYear()))}.`}
            />

            <div className="experience_container">
                <div className="experience-timeline" ref={timeline}>
                    <span className="experience-timeline_spine" aria-hidden="true" />
                    <span className="experience-timeline_glow" aria-hidden="true" />

                    <ol className="experience-timeline_list">
                        <li className="experience-timeline_item is-now">
                            <span className="experience-timeline_node" aria-hidden="true">
                                <span className="experience-timeline_pulse" />
                            </span>
                            <span className="experience-timeline_year">Now</span>
                            <p className="experience-timeline_today">
                                <time dateTime={day}>{date}</time>
                            </p>
                        </li>

                        {experiences.map(({title, subTitle, image, fill, date, url, description, cv}) => (
                            <li className="experience-timeline_item" key={title}>
                                <span className="experience-timeline_node" aria-hidden="true" />
                                <span className="experience-timeline_year" aria-hidden="true">{date.getFullYear()}</span>

                                <article className="experience-timeline_card">
                                    <a
                                        className={`experience-timeline_logo${fill ? " is-fill" : ""}`}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <img src={image} alt={`${title} website`} loading="lazy" decoding="async" />
                                    </a>
                                    <h3 className="experience-timeline_title">{title}</h3>
                                    <p className="experience-timeline_role">{subTitle}</p>
                                    <p className="experience-timeline_description">{description}</p>
                                    <p className="experience-timeline_meta">
                                        <time dateTime={isoDay(date)}>{formatDate(date)}</time>
                                        {cv && (
                                            <a href={CV_URL} target="_blank" rel="noopener noreferrer">Details on CV</a>
                                        )}
                                    </p>
                                </article>
                            </li>
                        ))}
                    </ol>
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
