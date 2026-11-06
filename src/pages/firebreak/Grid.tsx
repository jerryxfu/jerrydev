import {type CSSProperties, type KeyboardEvent, useRef, useState} from "react";
import {CELLS, SIZE} from "./rules.ts";

// How a cell looks. Grass the fire can still reach, grass it reaches on its next spread, grass it can't reach (safe, and
// saved at the end), fire that caught on the last spread, fire a spread older (embers), burnt, a wall, a rock.
export type Look = "grass" | "next" | "safe" | "fire" | "embers" | "burnt" | "wall" | "rock";

const WORDS: Record<Look, string> = {
    grass: "grass",
    next: "grass, burns next",
    safe: "safe grass",
    fire: "fire",
    embers: "fire",
    burnt: "burnt",
    wall: "wall",
    rock: "rock",
};
const COLUMNS = "ABCDEFGHIJ";

// Each cell's flicker, its own length and moment, so the fire doesn't flicker in step. Fixed per cell, from its index.
const FLICKER = Array.from({length: CELLS}, (_, i) => {
    const h = (Math.imul(i + 1, 2654435761) >>> 0) / 4294967296;
    const k = (Math.imul(i + 7, 2246822519) >>> 0) / 4294967296;
    return {"--fb-t": `${(0.7 + h * 0.6).toFixed(2)}s`, "--fb-d": `${(-k * 1.3).toFixed(2)}s`} as CSSProperties;
});

const MOVES: Record<string, [number, number]> = {ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1]};

/**
 * The board: 100 buttons, one tab stop, the arrows to move between them, Enter or Space (or a click, a tap) to build.
 * Only grass can take a wall; the other cells still take the focus, so the arrows go everywhere.
 */
export default function Grid({looks, onBuild, still = false, label}: {
    looks: Look[];
    onBuild?: (i: number) => void;
    still?: boolean; // no hover, no building: the board is only shown (the best found)
    label: string;
}) {
    const [focus, setFocus] = useState(Math.floor(CELLS / 2 - SIZE / 2));
    const cells = useRef<(HTMLButtonElement | null)[]>([]);

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const move = MOVES[event.key];
        if (!move) return;
        event.preventDefault();
        const r = Math.min(SIZE - 1, Math.max(0, Math.floor(focus / SIZE) + move[0]));
        const c = Math.min(SIZE - 1, Math.max(0, (focus % SIZE) + move[1]));
        const next = r * SIZE + c;
        setFocus(next);
        cells.current[next]?.focus();
    };

    return (
        <div className={`fb_grid ${still ? "fb_grid--still" : ""}`} role="group" aria-label={label} onKeyDown={onKeyDown}>
            {looks.map((look, i) => {
                const buildable = !still && (look === "grass" || look === "next" || look === "safe");
                return (
                    <button
                        key={i}
                        ref={(el) => {
                            cells.current[i] = el;
                        }}
                        type="button"
                        className={`fb_cell fb_cell--${look}`}
                        style={look === "fire" || look === "embers" ? FLICKER[i] : undefined}
                        tabIndex={i === focus ? 0 : -1}
                        aria-label={`${COLUMNS[i % SIZE]}${Math.floor(i / SIZE) + 1}, ${WORDS[look]}`}
                        aria-disabled={!buildable}
                        onFocus={() => setFocus(i)}
                        onClick={() => {
                            if (buildable) onBuild?.(i);
                        }}
                    />
                );
            })}
        </div>
    );
}
