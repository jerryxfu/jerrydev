import {type MouseEvent, type PointerEvent, useEffect, useRef} from "react";

// Under a finger, the page scrolls unless touch-action is none, on the element or one around it in the grid. A finger
// paints only there (the cells, the calendar's circles); between them it scrolls the page, and a tap there is a click.
function holdsStill(target: EventTarget | null, grid: EventTarget): boolean {
    for (let el = target instanceof Element ? target : null; el && el !== grid; el = el.parentElement) {
        if (getComputedStyle(el).touchAction === "none") return true;
    }
    return false;
}

// Picking cells with the pointer: press on one to turn it on (off if it was on), then drag across others to do the same
// to them. The cells carry their key in data-paint. A mouse paints from anywhere on a cell; a finger as holdsStill says.
export default function usePaint(isOn: (key: string) => boolean, set: (key: string, on: boolean) => void) {
    const painting = useRef<boolean | null>(null);
    // Whether the last press started painting: its click is then already done.
    const pressed = useRef(false);
    const last = useRef({x: 0, y: 0});

    useEffect(() => {
        const stop = () => {
            painting.current = null;
        };
        window.addEventListener("pointerup", stop);
        window.addEventListener("pointercancel", stop);
        return () => {
            window.removeEventListener("pointerup", stop);
            window.removeEventListener("pointercancel", stop);
        };
    }, []);

    const keyOf = (target: EventTarget | null) =>
        target instanceof Element ? target.closest<HTMLElement>("[data-paint]")?.dataset.paint ?? null : null;

    return {
        onPointerDown: (e: PointerEvent) => {
            const key = keyOf(e.target);
            pressed.current = e.button === 0 && key !== null && (e.pointerType === "mouse" || holdsStill(e.target, e.currentTarget));
            if (!pressed.current || key === null) return;
            painting.current = !isOn(key);
            last.current = {x: e.clientX, y: e.clientY};
            set(key, painting.current);
        },
        // A finger's moves all go to the cell it pressed: the cells under it are found by their place. A quick drag
        // jumps over cells between two moves, so the line between them is walked, 8px at a time.
        onPointerMove: (e: PointerEvent) => {
            const on = painting.current;
            if (on === null) return;
            const from = last.current;
            const steps = Math.max(1, Math.ceil(Math.hypot(e.clientX - from.x, e.clientY - from.y) / 8));
            const done = new Set<string>();
            for (let i = 1; i <= steps; i++) {
                const key = keyOf(document.elementFromPoint(
                    from.x + (e.clientX - from.x) * i / steps,
                    from.y + (e.clientY - from.y) * i / steps,
                ));
                if (key !== null && !done.has(key) && isOn(key) !== on) set(key, on);
                if (key !== null) done.add(key);
            }
            last.current = {x: e.clientX, y: e.clientY};
        },
        // A click no press painted: Enter or Space on a focused cell (detail 0), or a finger's tap where it scrolls.
        onClick: (e: MouseEvent) => {
            const key = keyOf(e.target);
            if (key !== null && (e.detail === 0 || !pressed.current)) set(key, !isOn(key));
        },
    };
}
