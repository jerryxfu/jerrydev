import "./About.scss";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";
import Contact from "../Contact/Contact.tsx";
import Friends from "@/components/Friends/Friends.tsx";

export default function About() {
    return (
        <div className="section about">
            {/* Revealed later than the others, once the dive's black has lifted (Dive.tsx). */}
            <SectionTitle text={"About Me"} description={"Based in Montréal."} start="top 45%" />
            <div className="layout-row about_intro">
                <p className="text-body">
                    Hi, I'm Jerry and I do things. Here are some things I find worth sharing.
                </p>
            </div>
            <Contact />
            <Friends />
        </div>
    );
};
