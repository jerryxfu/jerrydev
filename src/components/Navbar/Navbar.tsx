import {useEffect, useRef, useState} from "react";
import {useTheme} from "../../context/ThemeContext.tsx";
import "./Navbar.scss";
import {AnimatePresence, motion, useScroll, useTransform} from "framer-motion";
import {ChevronUp} from "lucide-react";

const linksLeft: { href: string, label: string }[] = [
    {href: "#", label: "Home"},
    {href: "#tools---languages", label: "Skills"},
    {href: "#contact-me", label: "Contact"},
    {href: "#projects", label: "Projects"},
    {href: "#experience---extras", label: "Experience"},
];

const linksRight: { href: string, label: string, target?: string }[] = [
    {href: "https://cv.jerryxf.net/", label: "Curriculum Vitae", target: "_blank"},
];

const formatThemeName = (theme: string) =>
    theme.charAt(0).toUpperCase() + theme.slice(1).replace("-", " ");

export default function Navbar() {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isShrunk, setIsShrunk] = useState(false);
    const {currentTheme, toggleTheme} = useTheme();
    const {scrollY} = useScroll();
    const navRef = useRef<HTMLElement>(null);

    const openingDelay = 0.1;
    const scrollThreshold = 512 + 256;

    const navbarBarHeight = useTransform(scrollY, [0, scrollThreshold], ["68px", "50px"]);
    const navbarScale = useTransform(scrollY, [0, scrollThreshold], [1, 0.95]);
    const navbarY = useTransform(scrollY, [0, scrollThreshold], ["0px", "6px"]);
    const navbarPadding = useTransform(scrollY, [0, scrollThreshold], ["0.50rem 0.25rem", "0.50rem 0"]);
    const navbarBorderRadius = useTransform(scrollY, [0, scrollThreshold], ["0px", "8px"]);
    const iconHeight = useTransform(scrollY, [0, scrollThreshold], ["58px", "42px"]);
    const iconBorderRadius = useTransform(scrollY, [0, scrollThreshold], ["0px", "4px"]);

    useEffect(() => {
        return scrollY.on("change", (latest) => {
            const shouldShrink = latest > scrollThreshold;
            if (shouldShrink !== isShrunk) {
                setIsShrunk(shouldShrink);
            }
        });
    }, [scrollY, isShrunk, scrollThreshold]);

    // Click outside to dismiss panel
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

    // Close panel with delay so the browser can follow the href first
    const handlePanelLinkClick = () => {
        setTimeout(() => setIsPanelOpen(false), 100);
    };

    return (
        <motion.nav
            className="navbar"
            ref={navRef}
            initial={{y: "-100%"}}
            animate={{y: 0}}
            transition={{
                type: "spring",
                delay: openingDelay,
                duration: 1.45
            }}
            style={{
                scale: navbarScale,
                y: navbarY,
                padding: navbarPadding,
                borderRadius: navbarBorderRadius,
            }}
        >
            <motion.div className="navbar_bar" style={{height: navbarBarHeight}}>
                <a className="navbar_icon" href="/" aria-label="Go to homepage">
                    <motion.img src="/favicon.jpeg" alt="jerryxf sunset sky with moon icon"
                                style={{height: iconHeight, borderRadius: iconBorderRadius}} />
                </a>

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
                            }}>
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
                            }}>
                            <a href={link.href}
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

                <div className="navbar_toggle">
                    <button
                        className="navbar_toggle-button"
                        onClick={() => setIsPanelOpen(prev => !prev)}
                        aria-label={isPanelOpen ? "Close navigation menu" : "Open navigation menu"}
                    >
                        <motion.span
                            animate={{rotate: isPanelOpen ? 180 : 0}}
                            transition={{type: "spring", stiffness: 300, damping: 20}}
                            style={{display: "flex", alignItems: "center"}}
                        >
                            <ChevronUp size={20} />
                        </motion.span>
                    </button>
                </div>
            </motion.div>

            <AnimatePresence>
                {isPanelOpen && (
                    <motion.div
                        className="navbar_panel"
                        initial={{height: 0, opacity: 0}}
                        animate={{height: "auto", opacity: 1}}
                        exit={{height: 0, opacity: 0}}
                        transition={{
                            height: {type: "spring", damping: 26, stiffness: 240},
                            opacity: {duration: 0.2}
                        }}
                    >
                        <div className="navbar_panel-inner">
                            <div className="navbar_panel-divider" />
                            <ul className="navbar_panel-links">
                                {linksLeft.map((link, index) => (
                                    <motion.li
                                        key={index}
                                        initial={{opacity: 0, y: -6}}
                                        animate={{opacity: 1, y: 0}}
                                        transition={{delay: index * 0.035, duration: 0.2}}
                                    >
                                        <a href={link.href}
                                           className="text text-underline"
                                           onClick={handlePanelLinkClick}
                                        >
                                            {link.label}
                                        </a>
                                    </motion.li>
                                ))}
                            </ul>
                            <div className="navbar_panel-divider" />
                            <ul className="navbar_panel-links">
                                {linksRight.map((link, index) => (
                                    <motion.li
                                        key={index}
                                        initial={{opacity: 0, y: -6}}
                                        animate={{opacity: 1, y: 0}}
                                        transition={{delay: (linksLeft.length + index) * 0.035, duration: 0.2}}
                                    >
                                        <a href={link.href}
                                           className="text text-underline"
                                           onClick={handlePanelLinkClick}
                                           {...(link.target && {target: link.target, rel: "noopener noreferrer"})}
                                        >
                                            {link.label}
                                        </a>
                                    </motion.li>
                                ))}
                            </ul>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
}