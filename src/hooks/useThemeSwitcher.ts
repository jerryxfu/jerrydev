import {useTheme} from "../context/ThemeContext";

const useThemeSwitcher = () => {
    const {currentTheme, toggleTheme} = useTheme();
    return {currentTheme, toggleTheme};
};

export default useThemeSwitcher;