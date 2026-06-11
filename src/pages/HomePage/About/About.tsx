import "./About.scss";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";

export default function About() {
    return (
        <div className="section about">
            <SectionTitle text={"About Me"} />
            <div className="layout-row">
                <p className="text-body">
                    Hi, I'm Jerry and I do things. Here are some things I find worth sharing.
                    {/*Hi, I'm Jerry — a student and developer building intelligent systems at the intersection of robotics, medicine, and AI. */}
                </p>
            </div>
        </div>
    );
};
