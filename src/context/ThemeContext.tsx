import React, {createContext, type ReactNode, useContext, useEffect, useState, useSyncExternalStore} from "react";
import {Coffee, Flower2, type LucideIcon, Moon, Snowflake, Sun, Wine} from "lucide-react";

// Every theme, in the order the toggle cycles through them: its name and icon (the toggle), and whether its background
// is dark (to resolve "auto", for data-scheme, which the styles that change only in the dark go by, and for components
// that swap assets).
// Adding a theme, four steps:
// 1. an entry here
// 2. a [data-theme="name"] block in index.scss
// 3. its mesh in src/assets/styles/gradient-meshes.scss
// 4. its background, and whether it's dark, in the boot map in index.html
// Only 1 is type checked. The rest fail silently, so work the list.
export const THEME_INFO = {
    light: {label: "Light", icon: Sun, dark: false},
    night: {label: "Night", icon: Moon, dark: true},
    blush: {label: "Blush", icon: Flower2, dark: false},
    burgundy: {label: "Burgundy", icon: Wine, dark: true},
    glacier: {label: "Glacier", icon: Snowflake, dark: false},
    latte: {label: "Latte", icon: Coffee, dark: false},
} satisfies Record<string, {label: string; icon: LucideIcon; dark: boolean}>;
export type Theme = keyof typeof THEME_INFO;
export const THEMES = Object.keys(THEME_INFO) as Theme[];

// The order the toggle cycles through, with auto at the end
export type ThemePreference = Theme | "auto";
export const THEME_PREFERENCES: readonly ThemePreference[] = [...THEMES, "auto"];

export const isDarkTheme = (theme: Theme): boolean => THEME_INFO[theme].dark;

const STORAGE_KEY = "themeName";

interface ThemeContextType {
    currentTheme: Theme;              // the resolved theme
    themePreference: ThemePreference; // what the user chose, including "auto"
    toggleTheme: () => void;          // advance one step through THEME_PREFERENCES
    setTheme: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const isPreference = (value: unknown): value is ThemePreference =>
    THEME_PREFERENCES.includes(value as ThemePreference);

// Whether the OS asks for dark, followed live: what "auto" resolves to (Night or Light), as index.html's boot script
// resolves it before React starts, so the first render agrees with the first paint.
const DARK_QUERY = "(prefers-color-scheme: dark)";
const prefersDark = () => window.matchMedia(DARK_QUERY).matches;
const watchScheme = (onChange: () => void) => {
    const mq = window.matchMedia(DARK_QUERY);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
};

function getInitialPreference(): ThemePreference {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (isPreference(stored)) return stored;
    } catch {
        // localStorage unavailable (private mode, etc.), fall through.
    }
    return "light";
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({children}) => {
    const [themePreference, setThemePreference] = useState<ThemePreference>(getInitialPreference);
    const osDark = useSyncExternalStore(watchScheme, prefersDark);
    const currentTheme: Theme = themePreference === "auto" ? (osDark ? "night" : "light") : themePreference;

    // Apply theme to DOM + persist
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", currentTheme);
        document.documentElement.setAttribute("data-scheme", isDarkTheme(currentTheme) ? "dark" : "light");
        document.body.setAttribute("data-theme", currentTheme);
        // Hand the background back to CSS once styles are loaded (clears the inline boot bg)
        document.documentElement.style.background = "";

        // Browser chrome follows the chosen theme rather than the OS
        const themeColor = document.querySelector("meta[name=\"theme-color\"]");
        if (themeColor) {
            const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
            if (bg) themeColor.setAttribute("content", bg);
        }

        try {
            localStorage.setItem(STORAGE_KEY, themePreference);
        } catch (error) {
            console.warn("Failed to save theme preference:", error);
        }
    }, [currentTheme, themePreference]);

    const toggleTheme = () => {
        setThemePreference((prev) => {
            const index = THEME_PREFERENCES.indexOf(prev);
            return THEME_PREFERENCES[(index + 1) % THEME_PREFERENCES.length]!;
        });
    };

    const setTheme = (pref: ThemePreference) => {
        if (isPreference(pref)) setThemePreference(pref);
    };

    return (
        <ThemeContext.Provider value={{currentTheme, themePreference, toggleTheme, setTheme}}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};