import React, {createContext, useContext, useState, useEffect, ReactNode} from "react";

type Theme = "default" | "night";

interface ThemeContextType {
    currentTheme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
    availableThemes: readonly Theme[];
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({children}) => {
    const themes: readonly Theme[] = ["default", "night"] as const;

    const getInitialTheme = (): Theme => {
        try {
            const stored = localStorage.getItem("themeName") as Theme;
            return themes.includes(stored) ? stored : themes[0] || "default";
        } catch {
            return themes[0] || "default";
        }
    };

    const [currentTheme, setCurrentTheme] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        try {
            // Set the theme on the body element for CSS cascade
            document.body.setAttribute("data-theme", currentTheme);
            localStorage.setItem("themeName", currentTheme);

            // Set on the HTML element for more global scope
            document.documentElement.setAttribute("data-theme", currentTheme);
        } catch (error) {
            console.warn("Failed to save theme preference:", error);
        }
    }, [currentTheme]);

    const toggleTheme = () => {
        const currentIndex = themes.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        if (nextTheme) {
            setCurrentTheme(nextTheme);
        }
    };

    const setTheme = (theme: Theme) => {
        if (themes.includes(theme)) {
            setCurrentTheme(theme);
        }
    };

    const contextValue: ThemeContextType = {
        currentTheme,
        toggleTheme,
        setTheme,
        availableThemes: themes,
    };

    return (
        <ThemeContext.Provider value={contextValue}>
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
