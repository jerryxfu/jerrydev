import React, {createContext, ReactNode, useContext, useEffect, useState} from "react";

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

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({children}) => {
    const [themePreference, setThemePreference] = useState<ThemePreference>(getInitialPreference);
    const [currentTheme, setCurrentTheme] = useState<Theme>(() => resolveTheme(getInitialPreference()));

    // Apply theme to DOM
    useEffect(() => {
        const resolved = resolveTheme(themePreference);
        setCurrentTheme(resolved);
        document.documentElement.setAttribute("data-theme", resolved);
        document.body.setAttribute("data-theme", resolved);
        try {
            localStorage.setItem("themeName", themePreference);
        } catch (error) {
            console.warn("Failed to save theme preference:", error);
        }
    }, [themePreference]);

    // Listen for OS theme changes when on auto
    useEffect(() => {
        if (themePreference !== "auto") return;

        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => {
            const resolved = resolveTheme("auto");
            setCurrentTheme(resolved);
            document.documentElement.setAttribute("data-theme", resolved);
            document.body.setAttribute("data-theme", resolved);
        };

        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [themePreference]);

    const toggleTheme = () => {
        const currentIndex = preferences.indexOf(themePreference);
        const nextIndex = (currentIndex + 1) % preferences.length;
        setThemePreference(preferences[nextIndex]!);
    };

    const setTheme = (pref: ThemePreference) => {
        if (preferences.includes(pref)) {
            setThemePreference(pref);
        }
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