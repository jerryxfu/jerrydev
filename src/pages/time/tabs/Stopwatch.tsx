import {useEffect, useRef, useState} from "react";
import "./Stopwatch.scss";

interface Lap {
    index: number;
    total: number;
    split: number;
}

function fmt(ms: number, decimals: 2 | 3): string {
    const totalSec = ms / 1000;
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = Math.floor(totalSec % 60);
    const frac = Math.floor((ms % 1000) / (decimals === 2 ? 10 : 1));
    const fracStr = String(frac).padStart(decimals, "0");
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}.${fracStr}` : `${mm}:${ss}.${fracStr}`;
}

export default function Stopwatch() {
    const [running, setRunning] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [laps, setLaps] = useState<Lap[]>([]);
    const startRef = useRef(0);   // performance.now() at last (re)start
    const accumRef = useRef(0);   // ms accumulated before current run
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (!running) return;
        const tick = () => {
            setElapsed(accumRef.current + (performance.now() - startRef.current));
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [running]);

    const start = () => {
        startRef.current = performance.now();
        setRunning(true);
    };
    const stop = () => {
        accumRef.current += performance.now() - startRef.current;
        setElapsed(accumRef.current);
        setRunning(false);
    };
    const reset = () => {
        setRunning(false);
        accumRef.current = 0;
        setElapsed(0);
        setLaps([]);
    };
    const lap = () => {
        const total = running ? accumRef.current + (performance.now() - startRef.current) : elapsed;
        setLaps((prev) => {
            const prevTotal = prev.length ? prev[prev.length - 1].total : 0;
            return [...prev, {index: prev.length + 1, total, split: total - prevTotal}];
        });
    };

    return (
        <div className="stopwatch">
            <div className="time_mono stopwatch_display">{fmt(elapsed, 2)}</div>

            <div className="stopwatch_controls">
                {!running ? (
                    <button className="stopwatch_btn primary" onClick={start}>
                        {elapsed > 0 ? "Resume" : "Start"}
                    </button>
                ) : (
                    <button className="stopwatch_btn danger" onClick={stop}>Stop</button>
                )}
                <button className="stopwatch_btn" onClick={lap} disabled={elapsed === 0}>Lap</button>
                <button className="stopwatch_btn" onClick={reset} disabled={elapsed === 0}>Reset</button>
            </div>

            {laps.length > 0 && (
                <div className="stopwatch_laps">
                    {[...laps].reverse().map((l) => (
                        <div className="stopwatch_lap" key={l.index}>
                            <span className="stopwatch_lap-n">#{l.index}</span>
                            <span className="time_mono stopwatch_lap-split">+{fmt(l.split, 3)}</span>
                            <span className="time_mono stopwatch_lap-total">{fmt(l.total, 3)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}