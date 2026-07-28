import React, {createContext, type ReactNode, useContext, useEffect, useMemo, useState} from "react";

// Adding a theme:
// 1. add its name to THEMES below
// 2. add a [data-theme="name"] block in index.scss
// 3. add an icon for it in ThemeToggle.tsx
export const THEMES = ["light", "night", "pink"] as const;
export type Theme = typeof THEMES[number];

// The order the toggle cycles through, with auto at thr end
export const THEME_PREFERENCES = [...THEMES, "auto"] as const;
export type ThemePreference = typeof THEME_PREFERENCES[number];

// Themes with a dark background. Used to resolve "auto", and available to components that swap assets based on background lightness.
const DARK_THEMES: readonly Theme[] = ["night"];

export const isDarkTheme = (theme: Theme): boolean => DARK_THEMES.includes(theme);

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

function resolveTheme(pref: ThemePreference): Theme {
    if (pref !== "auto") return pref;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "light";
}

function getInitialPreference(): ThemePreference {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (isPreference(stored)) return stored;
    } catch {
        // localStorage unavailable (private mode, etc.), fall through.
    }
    return "light";
}

// Fixes FOUC (Flash of Unstyled Content): the inline script in index.html has
// already picked a theme before React boots, so trust what it wrote.
function getInitialAutoTheme(): Theme {
    const applied = document.documentElement.getAttribute("data-theme");
    if (applied && THEMES.includes(applied as Theme)) return applied as Theme;
    return resolveTheme(getInitialPreference());
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({children}) => {
    const [themePreference, setThemePreference] = useState<ThemePreference>(getInitialPreference);
    const [autoTheme, setAutoTheme] = useState<Theme>(getInitialAutoTheme);

    const currentTheme = useMemo(
        () => (themePreference === "auto" ? autoTheme : themePreference),
        [themePreference, autoTheme]
    );

    // Apply theme to DOM + persist
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", currentTheme);
        document.body.setAttribute("data-theme", currentTheme);
        // Hand the background back to CSS once styles are loaded (clears the inline boot bg)
        document.documentElement.style.background = "";
        try {
            localStorage.setItem(STORAGE_KEY, themePreference);
        } catch (error) {
            console.warn("Failed to save theme preference:", error);
        }
    }, [currentTheme, themePreference]);

    // Listen for OS theme changes when on auto
    useEffect(() => {
        if (themePreference !== "auto") return;
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => setAutoTheme(resolveTheme("auto"));
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [themePreference]);

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