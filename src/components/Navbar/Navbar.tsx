import React from "react";
import useThemeSwitcher from "../../hooks/useThemeSwitcher";
import "./Navbar.scss";

export default function Navbar() {
    const {currentTheme, toggleTheme} = useThemeSwitcher();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

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
        <nav className="navbar">
            <a className="navbar_icon" href="/"><img src="/favicon.png" alt="jerrydev sunset sky with moon icon" /></a>

            <ul className="navbar_links">
                {internalLinks.map((link, index) => (
                    <li key={index}>
                        <a href={link.href} className="navbar_link text text-underline">
                            {link.label}
                        </a>
                    </li>
                ))}
            </ul>

            <ul className="navbar_links navbar_links-external">
                {externalLinks.map((link, index) => (
                    <li key={index}>
                        <a href={link.href} className="navbar_link text text-underline">
                            {link.label}
                        </a>
                    </li>
                ))}
            </ul>

            <button className="navbar_theme-button" style={{marginRight: "3rem"}} onClick={toggleTheme}>
                <div className="navbar_theme-circle" />
                <p className="text" style={{textTransform: "capitalize"}}>{currentTheme.toString().replace("-", " ")}</p>
            </button>
        </nav>
    );
}
