import "./About.scss";
import {Link} from "wouter";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";
import Contact from "../Contact/Contact.tsx";
import Friends from "@/components/Friends/Friends.tsx";
import Highlights from "./Highlights.tsx";

// Two halves: the section's title and who I am on the left, a few projects on the right (Highlights.tsx), starting level
// with the title's "Welcome!" (About.scss lays them out). On a phone, one after the other.
export default function About() {
    return (
        <div className="section about">
            <div className="about_split">
                <SectionTitle text={"About Me"} description={"Welcome!"} />
                <div className="about_intro prose">
                    <p>
                        Hi, I'm Jerry, and I do things. Here are the ones I think are worth sharing.
                    </p>
                    <p>
                        I'm interested in robotics, medicine and AI, and especially the places where they overlap.
                    </p>
                    <p>
                        For robotics, I mentor FIRST Robotics team 3990, the same team I was on as a student. I teach
                        programming, computer vision and machine learning. With the team, I've been to 11 competitions,
                        and 3 of them were World Championships.
                    </p>
                    <p>
                        For medicine, I do research at the CHUM Research Centre (University of Montreal hospital). I work on a project where we
                        analyze lungs with ultrasound imaging. I'm also building <Link href="/blog/topics/medive">MEDIVE</Link>, a personal research
                        project where I'm trying to get an AI to suggest diagnoses from symptoms written in plain words.
                    </p>
                    <p>
                        Also, my favorite food is burgers. My favorite color is a pale cornflower blue, which is conveniently
                        #abcdef, but honestly, I like all pastel colors.
                    </p>
                    <p>
                        The rest of the time, I make the tools I wish existed. You can find some of them on this site.
                    </p>
                </div>
                {/* The right column: the highlighted projects, then the people I build with. */}
                <div className="about_side">
                    <Highlights />
                    <Friends />
                </div>
            </div>
            <Contact />
        </div>
    );
};
