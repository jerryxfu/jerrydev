import "./About.scss";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";
import Contact from "../Contact/Contact.tsx";

export default function About() {
    return (
        <div className="section about">
            <SectionTitle text={"About Me"} />
            <div className="layout-row about_intro">
                <p className="text-body">
                    Hi, I'm Jerry and I do things. Here are some things I find worth sharing. Feel free to reach out if you have any ideas or
                    suggestions!
                    {/*Hi, I'm Jerry — a student and developer building intelligent systems at the intersection of robotics, medicine, and AI. */}
                </p>
            </div>

            {/* Not its own section any more: reaching me is part of the introduction, not a separate
                destination. Contact renders no heading of its own, so its two subsections read as the
                second half of this one. */}
            <Contact />
        </div>
    );
};
