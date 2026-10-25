import {type CSSProperties, useEffect, useEffectEvent, useRef, useState} from "react";
import {Volume2, VolumeX} from "lucide-react";
import Button from "@/components/Button/Button.tsx";
import {chime, pad2} from "../utils.ts";
import useShortcuts from "../useShortcuts.ts";
import "./Countdown.scss";

type Phase = "idle" | "running" | "paused" | "done";

const MAX = 9 * 3600 + 59 * 60 + 59; // 9:59:59, one digit of hours
const PRESETS = [1, 5, 10, 25]; // minutes
const STORE = "time:countdown";
const MUTED = "time:muted";

// The dial is H:MM:SS, always (no jump from 0:05:00 to 05:00 on Start). Each digit has a button above and below it,
// worth what that digit is worth; the colons have none. A step carries over: 55 s + 10 s is 1:05.
const COLUMNS: ({ seconds: number; amount: number; unit: string } | null)[] = [
    {seconds: 3600, amount: 1, unit: "hour"}, null,
    {seconds: 600, amount: 10, unit: "minutes"}, {seconds: 60, amount: 1, unit: "minute"}, null,
    {seconds: 10, amount: 10, unit: "seconds"}, {seconds: 1, amount: 1, unit: "second"},
];

const dialText = (seconds: number) =>
    `${Math.floor(seconds / 3600)}:${pad2(Math.floor((seconds % 3600) / 60))}:${pad2(seconds % 60)}`;

// The length last started, remembered per browser; five minutes the first time.
function loadLength(): number {
    try {
        const saved = Number(localStorage.getItem(STORE));
        if (Number.isInteger(saved) && saved > 0 && saved <= MAX) return saved;
    } catch {
        // storage refused
    }
    return 300;
}

function loadMuted(): boolean {
    try {
        return localStorage.getItem(MUTED) === "1";
    } catch {
        return false;
    }
}

export default function Countdown() {
    const [length, setLength] = useState(loadLength); // seconds, as set on the dial
    const [phase, setPhase] = useState<Phase>("idle");
    const [left, setLeft] = useState(0);              // ms left, once started
    const [started, setStarted] = useState(0);        // ms it was started with, for the bar
    const endRef = useRef(0);                         // Date.now() at zero, while running: the wall clock, so a laptop's sleep counts
    const audioRef = useRef<AudioContext | null>(null);
    const [muted, setMuted] = useState(loadMuted);    // remembered per browser

    // At zero. An Effect Event, so it reads whether it's muted now, not when the countdown started.
    const finish = useEffectEvent(() => {
        setLeft(0);
        setPhase("done");
        if (!muted) chime(audioRef.current);
    });

    // The end comes from one timeout set for it, which a hidden tab still fires (on time to the second); the display
    // follows on a short interval, which a hidden tab slows down, unseen.
    useEffect(() => {
        if (phase !== "running") return;
        const update = window.setInterval(() => setLeft(Math.max(0, endRef.current - Date.now())), 100);
        const end = window.setTimeout(() => finish(), endRef.current - Date.now());
        return () => {
            window.clearInterval(update);
            window.clearTimeout(end);
        };
    }, [phase]);

    useEffect(() => () => void audioRef.current?.close(), []);

    // Whole seconds, rounded up: 4.2 seconds left still reads 0:00:05, and 0:00:00 only at the end.
    const shown = phase === "idle" ? length : Math.ceil(left / 1000);

    // The time left at the front of the tab's title, to see it from another tab. Each change puts the page's title
    // back first, so Reset or leaving the tool leaves it as it was.
    useEffect(() => {
        if (phase === "idle") return;
        const page = document.title;
        document.title = `${phase === "done" ? "Time's up" : dialText(shown)} · ${page}`;
        return () => {
            document.title = page;
        };
    }, [phase, shown]);

    const run = (ms: number) => {
        // Made (or woken) on this click or key press, so the chime is allowed to play later.
        audioRef.current ??= new AudioContext();
        void audioRef.current.resume();
        endRef.current = Date.now() + ms;
        setLeft(ms);
        setPhase("running");
    };
    const start = () => {
        if (length === 0) return;
        try {
            localStorage.setItem(STORE, String(length));
        } catch {
            // not remembered
        }
        setStarted(length * 1000);
        run(length * 1000);
    };
    const pause = () => {
        setLeft(Math.max(0, endRef.current - Date.now()));
        setPhase("paused");
    };
    // Muting cuts a chime already playing; it plays again from the next Start.
    const toggleMute = () => {
        const next = !muted;
        setMuted(next);
        if (next) void audioRef.current?.suspend();
        try {
            localStorage.setItem(MUTED, next ? "1" : "0");
        } catch {
            // not remembered
        }
    };
    const reset = () => {
        setPhase("idle");
        setLeft(0);
    };
    const step = (seconds: number) => setLength((now) => Math.min(MAX, Math.max(0, now + seconds)));

    useShortcuts({
        Space: {idle: start, running: pause, paused: () => run(left), done: start}[phase],
        r: phase === "idle" ? undefined : reset,
        m: toggleMute,
    });

    const setting = phase === "idle";

    return (
        <div className="countdown">
            <div className={`countdown_dial is-${phase}`} role="timer" aria-label={dialText(shown)}>
                {[...dialText(shown)].map((char, i) => {
                    const column = COLUMNS[i];
                    if (!column) return <span key={i} className="time_num countdown_colon" aria-hidden>{char}</span>;
                    // The buttons leave and come back one column after the other.
                    const order = {"--k": i} as CSSProperties;
                    return (
                        <div key={i} className="countdown_column">
                            <div className="countdown_fold" inert={!setting}>
                                <button
                                    className="countdown_step countdown_step--up"
                                    style={order}
                                    onClick={() => step(column.seconds)}
                                    aria-label={`Add ${column.amount} ${column.unit}`}
                                >
                                    +{column.amount}
                                </button>
                            </div>
                            <span className="time_num countdown_digit" aria-hidden>{char}</span>
                            <div className="countdown_fold" inert={!setting}>
                                <button
                                    className="countdown_step countdown_step--down"
                                    style={order}
                                    onClick={() => step(-column.seconds)}
                                    aria-label={`Remove ${column.amount} ${column.unit}`}
                                >
                                    −{column.amount}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Setting up only: folded away on Start, with the dial's buttons, as the bar opens. */}
            <div className={`countdown_presets ${setting ? "" : "is-hidden"}`} inert={!setting}>
                <div>
                    <div className="time_toggle" role="group" aria-label="Presets">
                        {PRESETS.map((minutes) => (
                            <button
                                key={minutes}
                                className={length === minutes * 60 ? "active" : ""}
                                aria-pressed={length === minutes * 60}
                                onClick={() => setLength(minutes * 60)}
                            >
                                {minutes} min
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className={`countdown_progress ${setting ? "" : "is-shown"}`}>
                <div className="countdown_progress-inner">
                    <div className="countdown_bar">
                        <div className="countdown_bar-fill" style={{width: `${started ? (left / started) * 100 : 0}%`}} />
                    </div>
                    <p className="countdown_note" aria-live="polite">{phase === "done" ? "Time's up." : ""}</p>
                </div>
            </div>

            <div className="countdown_controls">
                {phase === "idle" && (
                    <Button variant="main" size="big" onClick={start} disabled={length === 0}>Start</Button>
                )}
                {phase === "running" && <Button size="big" onClick={pause}>Pause</Button>}
                {phase === "paused" && <Button variant="main" size="big" onClick={() => run(left)}>Resume</Button>}
                {phase === "done" && <Button variant="main" size="big" onClick={start}>Again</Button>}
                {phase !== "idle" && <Button size="big" onClick={reset}>Reset</Button>}
                <Button
                    size="big"
                    start={muted ? VolumeX : Volume2}
                    aria-pressed={muted}
                    aria-label="Mute the chime"
                    title={muted ? "Chime off" : "Chime on"}
                    onClick={toggleMute}
                />
            </div>
            <p className="time_keys">Space starts and pauses. R resets. M mutes the chime.</p>
        </div>
    );
}
