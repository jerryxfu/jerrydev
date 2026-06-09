import React, {createContext, type ReactNode, useContext, useEffect, useMemo, useState} from "react";

type Theme = "default" | "night";
type ThemePreference = "auto" | Theme;

interface ThemeContextType {
    currentTheme: Theme;              // the resolved theme
    themePreference: ThemePreference; // what the user chose, including "auto"
    toggleTheme: () => void;
    setTheme: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

// theme order
const preferences: readonly ThemePreference[] = ["default", "night", "auto"] as const;

function resolveTheme(pref: ThemePreference): Theme {
    if (pref !== "auto") return pref;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "default";
}

function getInitialPreference(): ThemePreference {
    try {
        const stored = localStorage.getItem("themeName") as ThemePreference;
        return preferences.includes(stored) ? stored : "default";
    } catch {
        return "default";
    }
}

// thing to fix the FOUC (Flash of Unstyled Content) problem
function getInitialAutoTheme(): Theme {
    // If the inline script in index.html already set data-theme, trust it
    const applied = document.documentElement.getAttribute("data-theme") as Theme;
    if (applied === "night" || applied === "default") return applied;
    return resolveTheme(getInitialPreference());
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({children}) => {
    const [themePreference, setThemePreference] = useState<ThemePreference>(getInitialPreference);
    const [autoTheme, setAutoTheme] = useState<Theme>(getInitialAutoTheme);

    const currentTheme = useMemo(() =>
            themePreference === "auto" ? autoTheme : themePreference,
        [themePreference, autoTheme]);

    // Apply theme to DOM + persist
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", currentTheme);
        document.body.setAttribute("data-theme", currentTheme);
        // Hand the background back to CSS once styles are loaded (clears the inline boot bg)
        document.documentElement.style.background = "";
        try {
            localStorage.setItem("themeName", themePreference);
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
        const currentIndex = preferences.indexOf(themePreference);
        setThemePreference(preferences[(currentIndex + 1) % preferences.length]!);
    };

    const setTheme = (pref: ThemePreference) => {
        if (preferences.includes(pref)) setThemePreference(pref);
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