import {useEffect, useState} from "react";
import {Hourglass} from "lucide-react";
import "./HangToast.scss";

// A clock that should tick every TICK_MS; a tick that comes FREEZE_MS late or more means the page was frozen that long.
// Gaps past SLEEP_MS aren't freezes: the computer slept.
const TICK_MS = 200;
const FREEZE_MS = 1000;
const SLEEP_MS = 60_000;
// How long the toast stays up.
const SHOWN_MS = 5000;

/**
 * Says the page just froze, and for how long. Nothing can draw while the page is frozen, this included, so it tells
 * afterwards: its clock notices it ran late, and by how much. Drawn like the offline toast, above it when both show.
 */
export default function HangToast() {
    const [frozeFor, setFrozeFor] = useState<number | null>(null);

    useEffect(() => {
        let last = performance.now();
        // The tab was hidden since the last tick: the browser slows a hidden tab's timers on purpose, so its gap says
        // nothing about a freeze.
        let wasHidden = document.hidden;
        let hide = 0;

        const tick = () => {
            const now = performance.now();
            const late = now - last - TICK_MS;
            last = now;
            if (wasHidden || document.hidden) {
                wasHidden = document.hidden;
                return;
            }
            if (late < FREEZE_MS || late > SLEEP_MS) return;
            setFrozeFor(Math.round(late));
            window.clearTimeout(hide);
            hide = window.setTimeout(() => setFrozeFor(null), SHOWN_MS);
        };
        const onVisibility = () => {
            wasHidden = true;
        };

        const clock = window.setInterval(tick, TICK_MS);
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            window.clearInterval(clock);
            window.clearTimeout(hide);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, []);

    if (frozeFor == null) return null;

    return (
        <div className="offline-toast hang-toast" role="status" aria-live="polite">
            <Hourglass size={16} strokeWidth={1.9} color={"var(--danger)"} />
            <span className="text-small">The page froze for {frozeFor.toLocaleString()} ms</span>
        </div>
    );
}
