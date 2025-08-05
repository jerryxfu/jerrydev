import "./HomePage.scss";
import Navbar from "../../components/Navbar/Navbar.tsx";
import Hero from "./Hero/Hero.tsx";
import About from "./About/About.tsx";
import Skills from "./Skills/Skills.tsx";
import Contact from "./Contact/Contact.tsx";
import Projects from "./Projects/Projects.tsx";
import Footer from "../../components/Footer/Footer.tsx";

export default function HomePage() {
    return (
        <div className="homepage">
            <Navbar />
            <Hero />
            <About />
            <Skills />
            <Contact />
            <Projects />
            <Footer />
        </div>
    );
};
