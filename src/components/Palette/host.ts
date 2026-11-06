// The palette's always-loaded part, kept small: whether it's open, and a way for the buttons and keys to open it. The
// palette itself (Palette.tsx, with the site's data) loads only when it's first opened, or when its button is hovered.

let open = false;
const listeners = new Set<() => void>();

export const subscribeOpen = (listener: () => void) => {
    listeners.add(listener);
    return () => void listeners.delete(listener);
};

export const isOpen = () => open;

export function setPaletteOpen(next: boolean): void {
    if (open === next) return;
    open = next;
    listeners.forEach((listener) => listener());
}

export const openPalette = () => setPaletteOpen(true);

export const loadPalette = () => import("./Palette.tsx");

// Ahead of a click: the code is there by the time it lands.
export const preloadPalette = () => void loadPalette().catch(() => { /* offline: the click tries again */
});

// Apple's keyboards say ⌘, the others Ctrl.
export const APPLE = /Mac|iPhone|iPad/.test(navigator.userAgent);

// Something to do once the next page is on screen (PaletteHost runs it): marking a line in a post opened from the
// palette, after the page has scrolled to its top.
let afterNavigation: (() => void) | null = null;

export const runAfterNavigation = (task: () => void) => {
    afterNavigation = task;
};

export function takeAfterNavigation(): (() => void) | null {
    const task = afterNavigation;
    afterNavigation = null;
    return task;
}
