import {ComponentType, lazy, Suspense, useEffect, useRef, useState} from "react";
import "./HomePage.scss";
import Navbar from "../../components/Navbar/Navbar.tsx";
import Hero from "./Hero/Hero.tsx";
import About from "./About/About.tsx";
import Skills from "./Skills/Skills.tsx";
import Footer from "../../components/Footer/Footer.tsx";

const Contact = lazy(() => import("./Contact/Contact.tsx"));
const Projects = lazy(() => import("./Projects/Projects.tsx"));
const Experience = lazy(() => import("./Experience/Experience.tsx"));

export default function HomePage() {
    return (
        <div className="homepage">
            <Navbar />
            <Hero />
            <About />
            <Skills />
            <Suspense fallback={<div style={{minHeight: 560}} />}>
                <Contact />
            </Suspense>
            <Suspense fallback={<div style={{minHeight: 920}} />}>
                <Projects />
            </Suspense>
            <Suspense fallback={<div style={{minHeight: 680}} />}>
                <Experience />
            </Suspense>
            <Footer />
        </div>
    );
}