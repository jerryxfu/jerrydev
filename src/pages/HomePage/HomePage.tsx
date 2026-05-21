import "./HomePage.scss";
import {Helmet} from "react-helmet-async";
import Navbar from "../../components/Navbar/Navbar.tsx";
import Hero from "./Hero/Hero.tsx";
import About from "./About/About.tsx";
import Skills from "./Skills/Skills.tsx";
import Footer from "../../components/Footer/Footer.tsx";

import Contact from "./Contact/Contact.tsx";
import Projects from "./Projects/Projects.tsx";
import Experience from "./Experience/Experience.tsx";

export default function HomePage() {
    return (
        <div className="homepage">
            <Helmet>
                <title>jerryxf</title>
                <meta name="description"
                      content="Hi there, I'm Jerry!" />
                <link rel="canonical" href="https://jerryxf.net/" />
            </Helmet>
            <Navbar />
            <Hero />
            <About />
            <Skills />
            <Contact />
            <Projects />
            <Experience />
            <Footer />
        </div>
    );
}