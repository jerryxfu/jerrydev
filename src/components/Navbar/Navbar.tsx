import {useEffect, useState} from "react";
import {useTheme} from "../../context/ThemeContext.tsx";
import "./Navbar.scss";
import {motion, useScroll, useTransform} from "framer-motion";
import MenuIcon from "@mui/icons-material/Menu";
import {Drawer, IconButton} from "@mui/joy";

// Constants outside component to prevent re-creation on every render
const linksLeft: { href: string, label: string }[] = [
    {href: "#", label: "Home"},
    {href: "#skills", label: "Skills"},
    {href: "#experience", label: "Experience"},
    {href: "#contact-me", label: "Contact"},
    {href: "#projects", label: "Projects"}
];

const linksRight: { href: string, label: string, target?: string }[] = [
    {href: "/scheduler", label: "📅 Scheduler", target: "_blank"},
    {href: "https://cv.jerryxf.net/", label: "Curriculum Vitae", target: "_blank"}
];

const formatThemeName = (theme: string) =>
    theme.charAt(0).toUpperCase() + theme.slice(1).replace("-", " ");

export default function Navbar() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isShrunk, setIsShrunk] = useState(false);
    const {currentTheme, toggleTheme} = useTheme();
    const {scrollY} = useScroll();

    // Animation configuration
    const openingDelay = 0.1;
    const scrollThreshold = 512;

    // Scroll-based transformations for the navbar
    const navbarHeight = useTransform(scrollY, [0, scrollThreshold], ["68px", "50px"]);
    const navbarScale = useTransform(scrollY, [0, scrollThreshold], [1, 0.95]);
    const navbarY = useTransform(scrollY, [0, scrollThreshold], ["0px", "6px"]);
    const navbarPadding = useTransform(scrollY, [0, scrollThreshold], ["0.50rem 0.25rem", "0.50rem 0"]);
    const navbarBorderRadius = useTransform(scrollY, [0, scrollThreshold], ["0px", "12px"]);

    // Track shrunk state for CSS classes
    useEffect(() => {
        return scrollY.on("change", (latest) => {
            const shouldShrink = latest > scrollThreshold;
            if (shouldShrink !== isShrunk) {
                setIsShrunk(shouldShrink);
            }
        });
    }, [scrollY, isShrunk, scrollThreshold]);

    return (
        <motion.nav
            className="navbar"
            initial={{y: "-100%"}}
            animate={{y: 0}}
            transition={{
                type: "spring",
                delay: openingDelay,
                duration: 1.45
            }}
            style={{
                height: navbarHeight,
                scale: navbarScale,
                y: navbarY,
                padding: navbarPadding,
                borderRadius: navbarBorderRadius,
            }}
        >
            <a
                className={`navbar_icon ${isShrunk ? "navbar_icon-shrunk" : ""}`}
                href="/"
                aria-label="Go to homepage"
            >
                <img
                    src="/favicon.png"
                    alt="jerrydev sunset sky with moon icon"
                />
            </a>

            <div className="navbar_menu-button">
                <IconButton
                    variant="outlined"
                    color="neutral"
                    onClick={() => setIsDrawerOpen(true)}
                    aria-label="Open navigation menu"
                >
                    <MenuIcon />
                </IconButton>
            </div>

            <ul className="navbar_links">
                {linksLeft.map((link, index) => (
                    <motion.li
                        key={index}
                        className="navbar_link"
                        initial={{opacity: 0, y: "-125%"}}
                        animate={{opacity: 1, y: 0}}
                        transition={{
                            delay: openingDelay + 0.15 + (index * 0.06),
                            duration: 0.9,
                            ease: "easeOut"
                        }}
                    >
                        <a href={link.href} className="text text-underline">
                            {link.label}
                        </a>
                    </motion.li>
                ))}
            </ul>

            <ul className="navbar_links navbar_links-external">
                {linksRight.map((link, index) => (
                    <motion.li
                        key={index}
                        className="navbar_link"
                        initial={{opacity: 0, y: "-125%"}}
                        animate={{opacity: 1, y: 0}}
                        transition={{
                            delay: openingDelay + 0.15 + ((index + linksLeft.length) * 0.06),
                            duration: 0.9,
                            ease: "easeOut"
                        }}
                    >
                        <a
                            href={link.href}
                            className="text text-underline"
                            {...(link.target && {target: link.target, rel: "noopener noreferrer"})}
                        >
                            {link.label}
                        </a>
                    </motion.li>
                ))}
            </ul>

            <motion.button
                className="navbar_theme-button"
                style={{marginRight: "3rem"}}
                onClick={toggleTheme}
                aria-label={`Switch to next theme (current: ${currentTheme})`}
                whileHover={{scale: 1.05}}
                whileTap={{scale: 0.95}}
            >
                <div className="navbar_theme-circle" />
                <p className="text" style={{textTransform: "capitalize"}}>
                    {formatThemeName(currentTheme)}
                </p>
            </motion.button>

            <Drawer
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                anchor="top"
                size="sm"
                variant="soft"
            >
                <ul className="navbar_links-mobile">
                    {linksLeft.map((link, index) => (
                        <li key={index}>
                            <a href={link.href} className="text text-underline">
                                {link.label}
                            </a>
                        </li>
                    ))}
                </ul>

                <ul className="navbar_links-mobile navbar_links-external">
                    {linksRight.map((link, index) => (
                        <li key={index}>
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
            </Drawer>
        </motion.nav>
    );
}