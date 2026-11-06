import {type CSSProperties, useEffect, useEffectEvent, useRef, useState} from "react";
import {Volume2, VolumeX} from "lucide-react";
import Button from "@/components/Button/Button.tsx";
import {chime, pad2} from "../utils.ts";
import useShortcuts from "../useShortcuts.ts";
import {loadUntil, saveUntil} from "../until.ts";
import "./Countdown.scss";

type Phase = "idle" | "running" | "paused" | "done";
// For a length of time, set on the dial; or until a moment, picked in a field (#75).
type Mode = "for" | "until";

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

// "52d 02:13:45", or "02:13:45" within a day: a countdown to a moment can be days away. A no-break space: the dial
// draws each character on its own, where a plain space would collapse.
const untilText = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const time = `${pad2(Math.floor((seconds % 86400) / 3600))}:${pad2(Math.floor((seconds % 3600) / 60))}:${pad2(seconds % 60)}`;
    return days > 0 ? `${days}d\u00a0${time}` : time;
};

// The field's value for a moment, to the minute, in the reader's time: 2026-12-25T00:00. The next full hour to start
// from.
const fieldValue = (ms: number) => Temporal.Instant.fromEpochMilliseconds(ms).toZonedDateTimeISO(Temporal.Now.timeZoneId())
    .toPlainDateTime().toString({smallestUnit: "minute"});
const nextHour = () => fieldValue(Temporal.Now.zonedDateTimeISO().add({hours: 1}).round({smallestUnit: "hour", roundingMode: "floor"}).epochMilliseconds);

// The field's value as a moment (ms), read as the reader's local time; null if it isn't one.
function momentOf(value: string): number | null {
    try {
        return Temporal.PlainDateTime.from(value).toZonedDateTime(Temporal.Now.timeZoneId()).epochMilliseconds;
    } catch {
        return null;
    }
}

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

// `active`: on screen. It runs on the other tabs too, hidden (Time.tsx), with its keys off there.
export default function Countdown({active}: { active: boolean }) {
    const [resumed] = useState(loadUntil);            // a countdown to a moment left running in this browser
    const [mode, setMode] = useState<Mode>(resumed ? "until" : "for");
    const [length, setLength] = useState(loadLength); // seconds, as set on the dial
    const [target, setTarget] = useState(() => (resumed ? fieldValue(resumed.end) : nextHour())); // the field, until
    const [phase, setPhase] = useState<Phase>(resumed ? "running" : "idle");
    const [left, setLeft] = useState(() => (resumed ? resumed.end - Date.now() : 0)); // ms left, once started
    const [started, setStarted] = useState(resumed ? resumed.end - resumed.from : 0); // ms it was started with, for the bar
    const [now, setNow] = useState(Date.now);         // while a moment is picked, for the time left to it
    const endRef = useRef(resumed?.end ?? 0);         // Date.now() at zero, while running: the wall clock, so a laptop's sleep counts
    const audioRef = useRef<AudioContext | null>(null);
    const [muted, setMuted] = useState(loadMuted);    // remembered per browser
    const until = mode === "until";
    const targetMs = momentOf(target);

    // At zero. An Effect Event, so it reads whether it's muted now, not when the countdown started.
    const finish = useEffectEvent(() => {
        setLeft(0);
        setPhase("done");
        saveUntil(null);
        if (!muted) chime(audioRef.current);
    });

    // The end comes from a timeout set for it, which a hidden tab still fires (on time to the second); the display
    // follows on a short interval, which a hidden tab slows down, unseen. A browser fires a timeout of more than about
    // 24.8 days (2^31 - 1 ms) at once, so a far end is waited for in steps.
    useEffect(() => {
        if (phase !== "running") return;
        const update = window.setInterval(() => setLeft(Math.max(0, endRef.current - Date.now())), 100);
        let end = 0;
        const wait = () => {
            const ms = Math.min(Math.max(0, endRef.current - Date.now()), 2 ** 31 - 1);
            end = window.setTimeout(() => (endRef.current <= Date.now() ? finish() : wait()), ms);
        };
        wait();
        return () => {
            window.clearInterval(update);
            window.clearTimeout(end);
        };
    }, [phase]);

    // While a moment is picked, the time left to it moves on, a second at a time.
    useEffect(() => {
        if (!until || phase !== "idle") return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [until, phase]);

    // A countdown resumed after a reload has had no click to wake its sound with: the first one on the page does.
    useEffect(() => {
        if (!resumed) return;
        const wake = () => {
            audioRef.current ??= new AudioContext();
            void audioRef.current.resume();
        };
        window.addEventListener("pointerdown", wake, {once: true});
        window.addEventListener("keydown", wake, {once: true});
        return () => {
            window.removeEventListener("pointerdown", wake);
            window.removeEventListener("keydown", wake);
        };
    }, [resumed]);

    useEffect(() => () => void audioRef.current?.close(), []);

    // Whole seconds, rounded up: 4.2 seconds left still reads 0:00:05, and 0:00:00 only at the end. While a moment is
    // picked, the time left to it.
    const shown = phase !== "idle" ? Math.ceil(left / 1000)
        : until ? Math.max(0, Math.ceil(((targetMs ?? now) - now) / 1000)) : length;
    const text = until ? untilText(shown) : dialText(shown);

    // The time left at the front of the tab's title, to see it from another tab. Each change puts the page's title
    // back first, so Reset or leaving the tool leaves it as it was.
    useEffect(() => {
        if (phase === "idle") return;
        const page = document.title;
        document.title = `${phase === "done" ? "Time's up" : text} · ${page}`;
        return () => {
            document.title = page;
        };
    }, [phase, text]);

    const run = (end: number) => {
        // Made (or woken) on this click or key press, so the chime is allowed to play later.
        audioRef.current ??= new AudioContext();
        void audioRef.current.resume();
        endRef.current = end;
        setLeft(end - Date.now());
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
        run(Date.now() + length * 1000);
    };
    const startUntil = () => {
        if (targetMs === null || targetMs <= Date.now()) return;
        const from = Date.now();
        saveUntil({end: targetMs, from});
        setStarted(targetMs - from);
        run(targetMs);
    };
    const resume = () => run(Date.now() + left);
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
        setNow(Date.now());
        saveUntil(null);
    };
    const choose = (next: Mode) => {
        setMode(next);
        setNow(Date.now());
    };
    const step = (seconds: number) => setLength((now) => Math.min(MAX, Math.max(0, now + seconds)));

    useShortcuts({
        // A moment doesn't wait: counting down to one, there's no pause.
        Space: until ? {idle: startUntil, running: undefined, paused: undefined, done: reset}[phase]
            : {idle: start, running: pause, paused: resume, done: start}[phase],
        r: phase === "idle" ? undefined : reset,
        m: toggleMute,
    }, active);

    const setting = phase === "idle";

    return (
        <div className="countdown">
            <div className={`countdown_dial is-${phase}${until ? " is-until" : ""}`} role="timer" aria-label={text}>
                {/* Until a moment, the time left alone: the moment is set in its field. */}
                {until && [...text].map((char, i) => <span key={i} className="time_num countdown_digit" aria-hidden>{char}</span>)}
                {!until && [...text].map((char, i) => {
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
                    <div className="countdown_setup">
                        <div className="time_toggle" role="group" aria-label="Count down">
                            <button className={until ? "" : "active"} aria-pressed={!until} onClick={() => choose("for")}>For</button>
                            <button className={until ? "active" : ""} aria-pressed={until} onClick={() => choose("until")}>Until</button>
                        </div>
                        {until ? (
                            <input
                                className="time_input countdown_until"
                                type="datetime-local"
                                aria-label="Count down until"
                                value={target}
                                onChange={(e) => setTarget(e.target.value)}
                            />
                        ) : (
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
                        )}
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
                    <Button
                        variant="main" size="big"
                        onClick={until ? startUntil : start}
                        disabled={until ? targetMs === null || targetMs <= now : length === 0}
                    >
                        Start
                    </Button>
                )}
                {phase === "running" && !until && <Button size="big" onClick={pause}>Pause</Button>}
                {phase === "paused" && <Button variant="main" size="big" onClick={resume}>Resume</Button>}
                {phase === "done" && !until && <Button variant="main" size="big" onClick={start}>Again</Button>}
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
            <p className="time_keys">{until ? "Space starts." : "Space starts and pauses."} R resets. M mutes the chime.</p>
        </div>
    );
}
