import {type ComponentType, useEffect, useState, useSyncExternalStore} from "react";
import {useLocation} from "wouter";
import {APPLE, isOpen, loadPalette, setPaletteOpen, subscribeOpen, takeAfterNavigation} from "./host.ts";

// On every page (main.tsx): the keys that open the palette, and the palette while it's open. ⌘K (Ctrl+K off Apple)
// opens and closes it; / opens it, only outside a field and with no modifier (Time's own keys never use either).
export default function PaletteHost() {
    const open = useSyncExternalStore(subscribeOpen, isOpen);
    const [pathname] = useLocation();

    // The palette, once its code is here. Not React.lazy: Suspense holds a first reveal back about 300 ms (React groups
    // reveals), which the first ⌘K after a reload showed. Its code failing to load (offline) closes it, to try again.
    const [palette, setPalette] = useState<{ Palette: ComponentType } | null>(null);
    useEffect(() => {
        if (!open || palette) return;
        let live = true;
        loadPalette().then(
            (module) => live && setPalette({Palette: module.default}),
            () => setPaletteOpen(false),
        );
        return () => {
            live = false;
        };
    }, [open, palette]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            // The palette's own field takes Ctrl+K to move up, and says so by preventing it.
            if (e.defaultPrevented || e.repeat || e.isComposing) return;
            if (e.key.toLowerCase() === "k" && (APPLE ? e.metaKey : e.ctrlKey) && !e.altKey && !e.shiftKey) {
                e.preventDefault();
                setPaletteOpen(!isOpen());
                return;
            }
            if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || isOpen()) return;
            const target = e.target instanceof Element ? e.target : null;
            if (target?.closest("input, textarea, select, [contenteditable]")) return;
            e.preventDefault(); // Firefox's quick find
            setPaletteOpen(true);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // A new page: the marks a post line left go, then what the palette asked for runs. After main.tsx's ScrollToTop,
    // which is earlier in the tree, so a scroll to the line isn't undone.
    useEffect(() => {
        CSS.highlights?.delete("palette");
        takeAfterNavigation()?.();
    }, [pathname]);

    return open && palette ? <palette.Palette /> : null;
}
