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

function DeferredSection({
                             component: Component,
                             placeholderMinHeight,
                             rootMargin = "500px 0px",
                         }: {
    component: ComponentType;
    placeholderMinHeight: number;
    rootMargin?: string;
}) {
    const sectionRef = useRef<HTMLDivElement | null>(null);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (shouldRender) return;

        const node = sectionRef.current;
        if (!node || !("IntersectionObserver" in window)) {
            setShouldRender(true);
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                setShouldRender(true);
                observer.disconnect();
            }
        }, {rootMargin});

        observer.observe(node);
        return () => observer.disconnect();
    }, [rootMargin, shouldRender]);

    return (
        <div
            ref={sectionRef}
            className="homepage_deferred-section"
            style={!shouldRender ? {minHeight: placeholderMinHeight} : undefined}
        >
            {shouldRender && (
                <Suspense fallback={<div style={{minHeight: placeholderMinHeight}} />}>
                    <Component />
                </Suspense>
            )}
        </div>
    );
}

export default function HomePage() {
    return (
        <div className="homepage">
            <Navbar />
            <Hero />
            <About />
            <Skills />
            <DeferredSection component={Contact} placeholderMinHeight={560} />
            <DeferredSection component={Projects} placeholderMinHeight={920} />
            <DeferredSection component={Experience} placeholderMinHeight={680} />
            <Footer />
        </div>
    );
}
