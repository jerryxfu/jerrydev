import React, {createContext, useContext, useState, useEffect} from "react";

const ThemeContext = createContext(null);

export const ThemeProvider = ({children}) => {
    const themes = ["light", "dark"];
    const defaultTheme = localStorage.getItem("themeName") || themes[0] || "light";
    const [currentTheme, setCurrentTheme] = useState<string>(defaultTheme);

    useEffect(() => {
        if (currentTheme) {
            document.body.setAttribute("data-theme", currentTheme);
            localStorage.setItem("themeName", currentTheme);
        }
    }, [currentTheme]);

    const toggleTheme = () => {
        const nextThemeIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
        setCurrentTheme(themes[nextThemeIndex] || "light");
    };

    return (
        <ThemeContext.Provider value={{currentTheme, toggleTheme}}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);