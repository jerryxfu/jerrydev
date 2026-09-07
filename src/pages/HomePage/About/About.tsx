import "./About.scss";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";
import Contact from "../Contact/Contact.tsx";

export default function About() {
    return (
        <div className="section about">
            <SectionTitle text={"About Me"} />
            <div className="layout-row about_intro">
                <p className="text-body">
                    Hi, I'm Jerry and I do things. Here are some things I find worth sharing.
                </p>
            </div>
            <Contact />
        </div>
    );
};
