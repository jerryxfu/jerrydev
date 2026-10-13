import {useEffect, useEffectEvent} from "react";

// Keys for the tool on screen: "Space", or a letter in lower case. Not while typing in a field, nor Space on a focused
// button (it presses it already; letters still work there, so F right after a click on Start goes fullscreen), nor with
// a modifier (the browser's own shortcuts), nor on a held key's repeats.
export default function useShortcuts(keys: Record<string, (() => void) | undefined>) {
    const onKey = useEffectEvent((e: KeyboardEvent) => {
        if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
        const target = e.target instanceof Element ? e.target : null;
        if (target?.closest("input, textarea, select, [contenteditable]")) return;
        const key = e.key === " " ? "Space" : e.key.toLowerCase();
        if (key === "Space" && target?.closest("button")) return;
        const action = keys[key];
        if (!action) return;
        e.preventDefault(); // Space would scroll the page
        action();
    });

    useEffect(() => {
        const listener = (e: KeyboardEvent) => onKey(e);
        window.addEventListener("keydown", listener);
        return () => window.removeEventListener("keydown", listener);
    }, []);
}
