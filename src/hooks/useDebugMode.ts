import {useState, useEffect} from "react";

export function useDebugMode() {
    const [mode, setMode] = useState(0); // styles are in index.scss, button is in Footer

    useEffect(() => {
        document.body.dataset["debug"] = String(mode);
    }, [mode]);

    const cycle = () => setMode(prev => (prev + 1) % 4); // 0, 1, 2, 3

    return {mode, cycle};
}