import {useEffect, useRef} from "react";
import {gsap} from "gsap";
import {SunMoon} from "lucide-react";
import {THEME_INFO, useTheme} from "../../../context/ThemeContext.tsx";
import Morph from "@/components/Morph/Morph.tsx";
import "./ThemeToggle.scss";

// Cycles through every theme in THEME_INFO + "auto".
// The icon and the name beside it reflect the user's preference (includes "auto"), while the actual colors follow the
// resolved theme. The name changes as the hero's theme card's does (Morph).

export default function ThemeToggle() {
    const {themePreference, currentTheme, toggleTheme} = useTheme();
    const iconRef = useRef<HTMLSpanElement>(null);
    const isFirstRender = useRef(true);

    // Pop the icon on change. Skipped on mount so it doesn't fight the navbar's entry stagger, and with reduced motion.
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (!iconRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        void gsap.fromTo(
            iconRef.current,
            {rotate: -35, scale: 0.6, opacity: 0},
            {rotate: 0, scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2)", clearProps: "all"}
        );
    }, [themePreference]);

    const Icon = themePreference === "auto" ? SunMoon : THEME_INFO[themePreference].icon;
    const name = themePreference === "auto" ? "Auto" : THEME_INFO[themePreference].label;
    const label = themePreference === "auto"
        ? `Theme: auto (${THEME_INFO[currentTheme].label}). Switch theme.`
        : `Theme: ${THEME_INFO[themePreference].label}. Switch theme.`;

    return (
        <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={label}
            title={label}
        >
            <span className="theme-toggle_icon" ref={iconRef}>
                <Icon size={20} strokeWidth={1.9} />
            </span>
            <Morph text={name} className="theme-toggle_name" />
        </button>
    );
}