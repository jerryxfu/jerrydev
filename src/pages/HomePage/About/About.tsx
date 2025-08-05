import "./About.scss";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";

export default function About() {
    return (
        <div className="section about">
            <SectionTitle text={"About"} />
            <p className={"p-text"}>This website is a work in progress</p>

        </div>
    );
};
