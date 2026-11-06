import {Search} from "lucide-react";
import {APPLE, openPalette, preloadPalette} from "./host.ts";
import "./PaletteButton.scss";

const KEYS = APPLE ? "⌘K" : "Ctrl K";

// The palette's button in the bar: a magnifier, and the keys that open it (not on a touch screen, which has none). The
// palette's code starts loading as the pointer comes near.
export default function PaletteButton() {
    return (
        <button
            type="button"
            className="palette-button"
            onClick={openPalette}
            onPointerEnter={preloadPalette}
            onPointerDown={preloadPalette}
            onFocus={preloadPalette}
            aria-label="Search the site"
            aria-keyshortcuts={APPLE ? "Meta+K" : "Control+K"}
            title={`Search (${KEYS})`}
        >
            <Search size={20} strokeWidth={1.9} aria-hidden="true" />
            <kbd className="palette-button_keys">{KEYS}</kbd>
        </button>
    );
}
