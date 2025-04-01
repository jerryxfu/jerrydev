import {useTheme} from "../context/ThemeContext";

const useThemeSwitcher = () => {
    const themeContext = useTheme();
    if (!themeContext) {
        throw new Error("useThemeSwitcher must be used within a ThemeProvider");
    }
    const {currentTheme, toggleTheme} = themeContext;
    return {currentTheme, toggleTheme};
};

export default useThemeSwitcher;