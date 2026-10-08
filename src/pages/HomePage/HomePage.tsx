import "./HomePage.scss";
import {Helmet} from "react-helmet-async";
import Navbar from "@/components/Nav/Navbar.tsx";
import Hero from "./Hero/Hero.tsx";
import Squares from "./Seam/Squares.tsx";
import Waves from "./Seam/Waves.tsx";
import Board from "./Board/Board.tsx";
import About from "./About/About.tsx";
import Skills from "./Skills/Skills.tsx";
import Footer from "../../components/Footer/Footer.tsx";

import Projects from "./Projects/Projects.tsx";
import Experience from "./Experience/Experience.tsx";
import Blog from "./Blog/Blog.tsx";
import useReveals from "./useReveals.ts";
// import OpeningAnimation from "../../components/OpeningAnimation/OpeningAnimation.tsx";

export default function HomePage() {
    useReveals();

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
                {/* The way from the hero into About: the cells the hero carries on in, under the waves. */}
                <Squares>
                    <Waves />
                </Squares>
                <About />
                <Skills />
                <Projects />
                {/* Under the projects for now, whose statuses it runs through. */}
                <Board />
                <Experience />
                <Blog />
            </main>
            <Footer />
        </div>
    );
}
