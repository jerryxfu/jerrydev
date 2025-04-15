import React, {useEffect, useRef, useState} from "react";
import useThemeSwitcher from "../../hooks/useThemeSwitcher";
import "./Navbar.scss";
import {gsap} from "gsap";
import {useGSAP} from "@gsap/react";
import MenuIcon from "@mui/icons-material/Menu";
import {Drawer, IconButton} from "@mui/joy";

export default function Navbar() {
    // const {isAuthenticated, logout} = useAuth();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const {currentTheme, toggleTheme} = useThemeSwitcher();
    const [isShrunk, setIsShrunk] = useState(false);

    const navbarRef = useRef(null);

    useGSAP(() => {
        const opening_delay = 1.2;

        gsap.from(navbarRef.current, {
            y: "-100%",
            ease: "power2.out",
            duration: 1.35,
            delay: opening_delay,
        });

        gsap.from([".navbar_link"], {
            easing: "nativeEase",
            opacity: 0,
            y: "-125%",
            delay: opening_delay + 0.15,
            stagger: 0.06,
            duration: 1,
        });
    });

    useEffect(() => {
        const handleScroll = () => {
            const shouldShrink = window.scrollY > 50;

            if (shouldShrink !== isShrunk) {
                setIsShrunk(shouldShrink);

                gsap.to(navbarRef.current, {
                    height: shouldShrink ? "50px" : "68px",
                    scale: shouldShrink ? 0.95 : 1,
                    y: shouldShrink ? "6px" : "0px",
                    padding: shouldShrink ? "0.50rem 0" : "0.50rem 0.25rem",
                    borderRadius: shouldShrink ? "12px" : 0,
                    duration: 0.6,
                    ease: "power1.out",
                });
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [isShrunk]);

    const internalLinks = [
        {href: "#", label: "Home"},
        {href: "#skills", label: "Skills"},
        {href: "#experience", label: "Experience"},
        {href: "#contact-me", label: "Contact"},
        {href: "#projects", label: "Projects"}
    ];

    const externalLinks = [
        {href: "https://bap.jerrydev.net/", label: "Bap", target: "_blank"}
    ];

    return (
        <>
            <nav className="navbar" ref={navbarRef}>
                <a className={`navbar_icon ${isShrunk ? "navbar_icon-shrunk" : ""}`} href="/"><img src="/favicon.png"
                                                                                                   alt="jerrydev sunset sky with moon icon" /></a>
                <div className="navbar_menu-button">
                    <IconButton variant="outlined" color="neutral" onClick={() => setIsDrawerOpen(true)}>
                        <MenuIcon />
                    </IconButton>
                </div>

                <ul className="navbar_links">
                    {internalLinks.map((link, index) => (
                        <li key={index} className="navbar_link">
                            <a href={link.href} className="text text-underline">
                                {link.label}
                            </a>
                        </li>
                    ))}
                </ul>

                <ul className="navbar_links navbar_links-external">
                    {externalLinks.map((link, index) => (
                        <li key={index} className="navbar_link">
                            <a href={link.href} className="text text-underline">
                                {link.label}
                            </a>
                        </li>
                    ))}
                </ul>

                <button className="navbar_theme-button" style={{marginRight: "3rem"}} onClick={toggleTheme}>
                    <div className="navbar_theme-circle" />
                    <p className="text" style={{textTransform: "capitalize"}}>{currentTheme?.toString().replace("-", " ")}</p>
                </button>

                <Drawer
                    open={isDrawerOpen}
                    onClose={() => setIsDrawerOpen(false)}
                    anchor="top"
                    size="sm"
                    variant="soft"
                >
                    <ul className="navbar_links-mobile">
                        {internalLinks.map((link, index) => (
                            <li key={index}>
                                <a href={link.href} className="text text-underline">
                                    {link.label}
                                </a>
                            </li>
                        ))}
                    </ul>

                    <ul className="navbar_links-mobile navbar_links-external">
                        {externalLinks.map((link, index) => (
                            <li key={index}>
                                <a href={link.href} className="text text-underline">
                                    {link.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </Drawer>
            </nav>
        </>
    );
}