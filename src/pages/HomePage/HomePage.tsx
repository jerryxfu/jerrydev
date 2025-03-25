import React from "react";
import "./HomePage.scss";
import Navbar from "../../components/Navbar/Navbar.tsx";
import Hero from "./sections/Hero/Hero.tsx";
import About from "./sections/About/About.tsx";
import Skills from "./sections/Skills/Skills.tsx";
import Contact from "./sections/Contact/Contact.tsx";
import Projects from "./sections/Projects/Projects.tsx";
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
