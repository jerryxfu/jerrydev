import "./HomePage.scss";
import {Helmet} from "react-helmet-async";
import Navbar from "@/components/Nav/Navbar.tsx";
import Hero from "./Hero/Hero.tsx";
import About from "./About/About.tsx";
import Skills from "./Skills/Skills.tsx";
import Footer from "../../components/Footer/Footer.tsx";

import Projects from "./Projects/Projects.tsx";
import Experience from "./Experience/Experience.tsx";
import Blog from "./Blog/Blog.tsx";
// import OpeningAnimation from "../../components/OpeningAnimation/OpeningAnimation.tsx";

export default function HomePage() {
    return (
        <div className="homepage">
            {/*<OpeningAnimation/>*/}
            <Helmet>
                <title>jerryxf</title>
                <meta name="description"
                      content="Hi there, I'm Jerry!" />
                <link rel="canonical" href="https://jerryxf.net/" />
            </Helmet>
            <Navbar isHero={true} />
            <main id="main">
                <Hero />
                <About />
                <Skills />
                <Projects />
                <Experience />
                <Blog />
            </main>
            <Footer />
        </div>
    );
}
