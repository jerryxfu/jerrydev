import "./About.scss";
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
                <div className="about_intro text-body">
                    <p>
                        Hi, I'm Jerry and I do things. Here are some things I find worth sharing. I will write more in this About Me section one day..
                    </p>
                    {/*<p>*/}
                    {/*    Hi, I'm Jerry and I do things. Mostly where code meets medicine, robotics and AI. I'm an aspiring*/}
                    {/*    physician-engineer, based in Montréal.*/}
                    {/*</p>*/}
                    {/*<p>*/}
                    {/*    On the medicine side, I'm a research assistant at the CHUM Research Centre, where I study the lungs*/}
                    {/*    with ultrasound. I'm also building <Link href="/blog/topics/medive">MEDIVE</Link>, an AI that suggests*/}
                    {/*    diagnoses from symptoms written in plain words.*/}
                    {/*</p>*/}
                    {/*<p>*/}
                    {/*    In robotics, I mentor FIRST Robotics team 3990, the team I was a student on. I teach programming,*/}
                    {/*    computer vision and machine learning. With the team, I've been to 11 competitions, 3 of them World*/}
                    {/*    Championships.*/}
                    {/*</p>*/}
                    {/*<p>*/}
                    {/*    The rest of the time, I make the tools I wish existed, like the ones on this site, and I write about*/}
                    {/*    what I learn on the <Link href="/blog">blog</Link>.*/}
                    {/*</p>*/}
                </div>
                <Highlights />
            </div>
            <Contact />
            <Friends />
        </div>
    );
};
