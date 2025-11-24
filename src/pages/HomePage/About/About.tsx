import "./About.scss";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";

export default function About() {
    return (
        <div className="section about">
            <SectionTitle text={"About"} />
            <div className="layout-row">
                <p className="text" /*style={{maxWidth: "70%"}}*/>
                    Hi, I'm Jerry, an aspiring physician-engineer and an IB student in Pure and Applied Sciences. I'm passionate about science, AI,
                    medicine, and technology. This website is a collection of my personal projects, experiments, and interests. Feel free to explore
                    and reach out if you have any questions or just want to say hi!
                </p>
                {/*<div className="container">*/}
                {/*</div>*/}
            </div>
        </div>
    );
};
