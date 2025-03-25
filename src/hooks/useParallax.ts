import {useEffect} from "react";

export default function useParallax(selector: string, speed: number) {
    useEffect(() => {
        const parallaxElement = document.querySelector(selector) as HTMLElement;
        if (!parallaxElement) return;

        const onScroll = () => {
            requestAnimationFrame(() => {
                const offset = window.scrollY * speed;
                parallaxElement.style.backgroundPosition = `center ${offset}px`;
            });
        };

        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, [selector, speed]);
}