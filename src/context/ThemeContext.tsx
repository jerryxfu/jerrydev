import React, {createContext, useContext, useState, useEffect} from "react";

const ThemeContext = createContext<{ currentTheme: string; toggleTheme: () => void } | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const themes = ["default", "night", "celestial"];
    const defaultTheme = localStorage.getItem("themeName") || themes[0] || "default";
    const [currentTheme, setCurrentTheme] = useState<string>(defaultTheme);

    useEffect(() => {
        if (currentTheme) {
            document.body.setAttribute("data-theme", currentTheme);
            localStorage.setItem("themeName", currentTheme);
        }
    }, [currentTheme]);

    const toggleTheme = () => {
        const nextThemeIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
        setCurrentTheme(themes[nextThemeIndex] || "default");
    };

    return (
        <ThemeContext.Provider value={{currentTheme, toggleTheme}}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);