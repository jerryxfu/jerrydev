import {useEffect, useRef} from "react";
import {gsap} from "gsap";
import {Flower2, Moon, Sun, SunMoon} from "lucide-react";
import {type ThemePreference, useTheme} from "../../../context/ThemeContext.tsx";
import "./ThemeToggle.scss";

// Cycles through every theme in THEMES + "auto".
// The icon reflects the user's preference (includes "auto"), while the actual colors follow the resolved theme.

// Typed as a full Record, so adding a theme to THEMES without adding an icon here is an error.
const ICONS: Record<ThemePreference, typeof Sun> = {
    light: Sun,
    night: Moon,
    pink: Flower2,
    auto: SunMoon,
};

const LABELS: Record<ThemePreference, string> = {
    light: "Light",
    night: "Night",
    pink: "Pink",
    auto: "Auto",
};

export default function ThemeToggle() {
    const {themePreference, currentTheme, toggleTheme} = useTheme();
    const iconRef = useRef<HTMLSpanElement>(null);
    const isFirstRender = useRef(true);

    // Pop the icon on change. Skipped on mount so it doesn't fight the navbar's entry stagger?
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (!iconRef.current) return;
        gsap.fromTo(
            iconRef.current,
            {rotate: -35, scale: 0.6, opacity: 0},
            {rotate: 0, scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2)", clearProps: "all"}
        );
    }, [themePreference]);

    const Icon = ICONS[themePreference];
    const label = themePreference === "auto"
        ? `Theme: auto (${LABELS[currentTheme]}). Switch theme.`
        : `Theme: ${LABELS[themePreference]}. Switch theme.`;

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
        </button>
    );
}