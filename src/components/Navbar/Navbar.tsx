import {useEffect, useRef, useState} from "react";
import {useTheme} from "../../context/ThemeContext.tsx";
import "./Navbar.scss";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import {ChevronUp} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const linksLeft: { href: string; label: string }[] = [
    {href: "#", label: "Home"},
    {href: "#tools---languages", label: "Skills"},
    {href: "#contact-me", label: "Contact"},
    {href: "#projects", label: "Projects"},
    {href: "#experience---extras", label: "Experience"},
];

const linksRight: { label: string; href: string; target?: string }[] = [
    {label: "Expedite 📦", href: "/expedite"},
    {label: "GitHub", href: "https://github.com/jerryxfu"},
    {label: "Curriculum Vitae", href: "https://cv.jerryxf.net/"},
];

const formatThemeName = (theme: string) =>
    theme.charAt(0).toUpperCase() + theme.slice(1).replace("-", " ");

export default function Navbar() {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const {currentTheme, toggleTheme} = useTheme();

    const navRef = useRef<HTMLElement>(null);
    const barRef = useRef<HTMLDivElement>(null);
    const iconRef = useRef<HTMLImageElement>(null);
    const linkRefs = useRef<(HTMLLIElement | null)[]>([]);
    const panelRef = useRef<HTMLDivElement>(null);
    const panelInnerRef = useRef<HTMLDivElement>(null);
    const chevronRef = useRef<HTMLSpanElement>(null);

    const openingDelay = 0.1;
    const scrollThreshold = 768;

    useGSAP(() => {
        // Entry animations
        const nav = navRef.current;
        const bar = barRef.current;
        const icon = iconRef.current;
        if (!nav || !bar || !icon) return;

        // Slide navbar in from top
        gsap.from(nav, {
            yPercent: -100,
            duration: 1.55,
            delay: openingDelay,
            ease: "elastic.out(1,0.95)",
        });

        // Stagger links in
        const allLinks = linkRefs.current.filter(Boolean);
        gsap.from(allLinks, {
            opacity: 0,
            y: "-125%",
            duration: 0.75,
            delay: openingDelay + 0.15,
            stagger: 0.07,
            ease: "power2.out",
        });

        // Scroll-driven shrink
        const shrinkTl = gsap.timeline({paused: true});

        shrinkTl.to(nav, {
            scale: 0.95,
            y: 6,
            padding: "0.50rem 0",
            borderRadius: "8px",
            duration: 1,
        }, 0);

        shrinkTl.to(bar, {
            height: "50px",
            duration: 1,
        }, 0);

        shrinkTl.to(icon, {
            height: "42px",
            borderRadius: "4px",
            duration: 1,
        }, 0);

        ScrollTrigger.create({
            start: 0,
            end: scrollThreshold,
            scrub: true,
            animation: shrinkTl,
        });
    });

    // Chevron rotation
    useEffect(() => {
        if (!chevronRef.current) return;
        gsap.to(chevronRef.current, {
            rotation: isPanelOpen ? 180 : 0,
            duration: 0.4,
            ease: "power2.out",
        });
    }, [isPanelOpen]);

    // Panel open/close
    useEffect(() => {
        if (!panelRef.current || !panelInnerRef.current) return;

        if (isPanelOpen) {
            gsap.set(panelRef.current, {height: "auto", opacity: 1});
            const fullHeight = panelRef.current.offsetHeight;
            gsap.fromTo(panelRef.current,
                {height: 0, opacity: 0},
                {height: fullHeight, opacity: 1, duration: 0.4, ease: "power2.out"}
            );

            const panelLinks = panelInnerRef.current.querySelectorAll("li");
            gsap.fromTo(panelLinks,
                {opacity: 0, y: -6},
                {opacity: 1, y: 0, duration: 0.2, stagger: 0.035}
            );
        } else {
            gsap.to(panelRef.current, {
                height: 0,
                opacity: 0,
                duration: 0.3,
                ease: "power2.in",
            });
        }
    }, [isPanelOpen]);

    // Click outside to dismiss
    useEffect(() => {
        if (!isPanelOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(e.target as Node)) {
                setIsPanelOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside as EventListener);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside as EventListener);
        };
    }, [isPanelOpen]);

    const handlePanelLinkClick = () => {
        setTimeout(() => setIsPanelOpen(false), 100);
    };

    const totalLinks = linksLeft.length + linksRight.length;

    return (
        <nav className="navbar" ref={navRef}>
            <div className="navbar_bar" ref={barRef}>
                <a className="navbar_icon" href="/" aria-label="Go to homepage">
                    <img
                        ref={iconRef}
                        src="/favicon.jpeg"
                        alt="jerryxf sunset sky with moon icon"
                        style={{height: "58px", borderRadius: "0px"}}
                    />
                </a>

                <ul className="navbar_links">
                    {linksLeft.map((link, index) => (
                        <li
                            key={index}
                            className="navbar_link"
                            ref={(el) => {
                                linkRefs.current[index] = el;
                            }}
                        >
                            <a href={link.href} className="text text-underline">
                                {link.label}
                            </a>
                        </li>
                    ))}
                </ul>

                <ul className="navbar_links navbar_links-external">
                    {linksRight.map((link, index) => (
                        <li
                            key={index}
                            className="navbar_link"
                            ref={(el) => {
                                linkRefs.current[linksLeft.length + index] = el;
                            }}
                        >
                            <a
                                href={link.href}
                                className="text text-underline"
                                {...(link.target && {target: link.target, rel: "noopener noreferrer"})}
                            >
                                {link.label}
                            </a>
                        </li>
                    ))}
                </ul>

                <button
                    className="navbar_theme-button"
                    onClick={toggleTheme}
                    aria-label={`Switch to next theme (current: ${currentTheme})`}
                >
                    <div className="navbar_theme-circle" />
                    <p className="text" style={{textTransform: "capitalize"}}>
                        {formatThemeName(currentTheme)}
                    </p>
                </button>

                <div className="navbar_toggle">
                    <button
                        className="navbar_toggle-button"
                        onClick={() => setIsPanelOpen((prev) => !prev)}
                        aria-label={isPanelOpen ? "Close navigation menu" : "Open navigation menu"}
                    >
                        <span
                            ref={chevronRef}
                            style={{display: "flex", alignItems: "center"}}
                        >
                            <ChevronUp size={20} />
                        </span>
                    </button>
                </div>
            </div>

            <div
                className="navbar_panel"
                ref={panelRef}
                style={{height: 0, overflow: "hidden"}}
            >
                <div className="navbar_panel-inner" ref={panelInnerRef}>
                    <div className="navbar_panel-divider" />
                    <ul className="navbar_panel-links">
                        {linksLeft.map((link, index) => (
                            <li key={index}>
                                <a
                                    href={link.href}
                                    className="text text-underline"
                                    onClick={handlePanelLinkClick}
                                >
                                    {link.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                    <div className="navbar_panel-divider" />
                    <ul className="navbar_panel-links">
                        {linksRight.map((link, index) => (
                            <li key={index}>
                                <a
                                    href={link.href}
                                    className="text text-underline"
                                    onClick={handlePanelLinkClick}
                                    {...(link.target && {target: link.target, rel: "noopener noreferrer"})}
                                >
                                    {link.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </nav>
    );
}
