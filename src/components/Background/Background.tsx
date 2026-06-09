import {useEffect, useMemo, useRef} from "react";
import {createPortal} from "react-dom";
import {buildGradient, getColorsForTime, getDecimalHour, getStarOpacity} from "../../context/dynamicTheme";
import {StarField} from "../../context/StarField";
import "./Background.scss";

export default function Background() {
    const skyRef = useRef<HTMLDivElement>(null);
    const starsRef = useRef<HTMLDivElement>(null);

    // Correct sky on the first paint so there's no pop-in
    const initialGradient = useMemo(() => buildGradient(getColorsForTime(getDecimalHour())), []);

    useEffect(() => {
        const sky = skyRef.current;
        const container = starsRef.current;
        if (!sky || !container) return;

        const field = new StarField(container);

        const update = () => {
            const hour = getDecimalHour();
            sky.style.background = buildGradient(getColorsForTime(hour));
            const opacity = getStarOpacity(hour);
            field.setOpacity(opacity);
            if (opacity > 0) field.start();
            else field.stop();
        };

        update();
        const id = window.setInterval(update, 60_000);
        const onVisible = () => {
            if (!document.hidden) update();
        };
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            window.clearInterval(id);
            document.removeEventListener("visibilitychange", onVisible);
            field.destroy();
        };
    }, []);

    return createPortal(
        <>
            <div className="site-bg_sky" ref={skyRef} style={{background: initialGradient}} />
            <div className="site-bg_stars" ref={starsRef} />
        </>,
        document.body
    );
}