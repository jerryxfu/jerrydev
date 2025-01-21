import {useState, useEffect} from "react";

const useThemeSwitcher = () => {
    const themes = ["light", "dark"]; // list of data-theme attribute names
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

    return {currentTheme, toggleTheme};
};

export default useThemeSwitcher;