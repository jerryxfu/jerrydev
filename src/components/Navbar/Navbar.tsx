import React, {useRef, useState} from "react";
import useThemeSwitcher from "../../hooks/useThemeSwitcher";
import "./Navbar.scss";
import {gsap} from "gsap";
import {useGSAP} from "@gsap/react";
import MenuIcon from "@mui/icons-material/Menu";
import {Drawer, IconButton} from "@mui/joy";
import "../../styles/gradient-mesh-default.scss";

export default function Navbar() {
    // const {isAuthenticated, logout} = useAuth();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const {currentTheme, toggleTheme} = useThemeSwitcher();

    const navbarRef = useRef(null);

    useGSAP(() => {
        gsap.from(navbarRef.current, {
            height: "36px",
            ease: "nativeEase",
            duration: 0.8,
            delay: 0.5
        });
    });

    const internalLinks = [
        {href: "#home", label: "Home"},
        {href: "#skills", label: "Skills"},
        {href: "#experience", label: "Experience"},
        {href: "contact", label: "Contact"},
        {href: "#projects", label: "Projects"}
    ];

    const externalLinks = [
        {href: "https://bap.jerrydev.net/", label: "Bap", target: "_blank"}
    ];

    return (
        <>
            <nav className="navbar">
                <a className="navbar_icon" href="/"><img src="/favicon.png" alt="jerrydev sunset sky with moon icon" /></a>
                <div className="navbar_menu-button">
                    <IconButton variant="outlined" color="neutral" onClick={() => setIsDrawerOpen(true)}>
                        <MenuIcon />
                    </IconButton>
                </div>

                <ul className="navbar_links">
                    {internalLinks.map((link, index) => (
                        <li key={index}>
                            <a href={link.href} className="text text-underline">
                                {link.label}
                            </a>
                        </li>
                    ))}
                </ul>

                <ul className="navbar_links navbar_links-external">
                    {externalLinks.map((link, index) => (
                        <li key={index}>
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
