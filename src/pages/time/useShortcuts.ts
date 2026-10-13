import {useEffect, useEffectEvent} from "react";

// Keys for the tool on screen: "Space", or a letter in lower case. Not while typing in a field, nor on a focused
// button (Space presses it already), nor with a modifier (the browser's own shortcuts), nor on a held key's repeats.
export default function useShortcuts(keys: Record<string, (() => void) | undefined>) {
    const onKey = useEffectEvent((e: KeyboardEvent) => {
        if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
        if (e.target instanceof Element && e.target.closest("input, textarea, select, button, [contenteditable]")) return;
        const action = keys[e.key === " " ? "Space" : e.key.toLowerCase()];
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
