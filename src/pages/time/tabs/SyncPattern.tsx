import {useEffect, useRef, useState} from "react";
import {Maximize, Volume2, VolumeX} from "lucide-react";
import useShortcuts from "../useShortcuts.ts";
import {drawPattern, frameCounter} from "./pattern.ts";
import "./SyncPattern.scss";

let offset: number | null = null; // Date.now() minus performance.now()

// The wall clock at a frame, read through the frame's own timestamp: performance.now()'s even steps, Date.now()'s
// seconds, so two devices with set clocks show the same picture. The gap between the two clocks is taken again when it
// moves by more than 5 ms (a laptop's sleep, a clock correction); smaller moves are only their rounding.
function wallTime(frame: number): number {
    const gap = Date.now() - performance.now();
    if (offset === null || Math.abs(gap - offset) > 5) offset = gap;
    return frame + offset;
}

const BEEP = 0.05; // seconds, as long as the flash

// A 1 kHz beep heard from `at` (the AudioContext's time): in over 2 ms, a sharp start without a click, out over 3 ms.
function beep(audio: AudioContext, at: number) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.3, at + 0.002);
    gain.gain.setValueAtTime(0.3, at + BEEP - 0.003);
    gain.gain.linearRampToValueAtTime(0, at + BEEP);
    osc.connect(gain).connect(audio.destination);
    osc.start(at);
    osc.stop(at + BEEP);
}

// The AudioContext's time at which a sound comes out of the speaker at a given performance.now() time. The browser's
// output stamp pairs the two clocks with the way out to the speaker counted in; before it has one (or in a browser
// without it), the time being rendered, less the latency the browser reports.
function audioTimeAt(audio: AudioContext, perf: number): number {
    const stamp = audio.getOutputTimestamp?.();
    if (stamp?.contextTime && stamp.performanceTime) return stamp.contextTime + (perf - stamp.performanceTime) / 1000;
    return audio.currentTime + (perf - performance.now()) / 1000 - (audio.baseLatency ?? 0) - (audio.outputLatency ?? 0);
}

export default function SyncPattern() {
    const [running, setRunning] = useState(false);
    const [muted, setMuted] = useState(true); // the beep, off on each visit
    const stageRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const timeRef = useRef<number | null>(null); // the moment last drawn, kept on screen once stopped
    const statsRef = useRef("");                 // the frame counter's text, kept with it
    const audioRef = useRef<AudioContext | null>(null); // only while the beep is heard: running and not muted
    const beepedRef = useRef(0); // the last second whose beep is set
    const canFullscreen = document.fullscreenEnabled; // not on an iPhone

    // One canvas, redrawn on every frame while running. A hidden tab gets no frames, and leaving the tool stops them.
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d", {alpha: false});
        if (!canvas || !ctx) return;
        const font = getComputedStyle(canvas).fontFamily;
        const paint = () => {
            timeRef.current ??= wallTime(performance.now());
            drawPattern(ctx, timeRef.current, canvas.width, canvas.height, font, statsRef.current);
        };

        // The screen's own pixels, up to 2 per CSS pixel (a 4K screen draws fewer); redrawn when the box changes size.
        const resize = new ResizeObserver(() => {
            const scale = Math.min(devicePixelRatio, 2);
            canvas.width = Math.round(canvas.clientWidth * scale);
            canvas.height = Math.round(canvas.clientHeight * scale);
            paint();
        });
        resize.observe(canvas);

        // The next second's beep, set once, a second ahead: time enough for any output latency.
        const setBeep = (now: number, t: number) => {
            const audio = audioRef.current;
            const next = Math.floor(t / 1000) + 1;
            if (audio?.state !== "running" || beepedRef.current >= next) return;
            beepedRef.current = next;
            const at = audioTimeAt(audio, now + next * 1000 - t);
            if (at > audio.currentTime) beep(audio, at);
        };

        // Counted from Start. Not counted: a hidden tab's pause, and the switch to or from fullscreen (setting up, not
        // the steady state).
        const counter = frameCounter();
        const onVisibility = () => counter.pause();
        const onFullscreen = () => counter.reset();

        let frame = 0;
        const tick = (now: number) => {
            timeRef.current = wallTime(now);
            counter.frame(now);
            statsRef.current = counter.text();
            paint();
            setBeep(now, timeRef.current);
            frame = requestAnimationFrame(tick);
        };
        if (running) {
            statsRef.current = "";
            document.addEventListener("visibilitychange", onVisibility);
            document.addEventListener("fullscreenchange", onFullscreen);
            frame = requestAnimationFrame(tick);
        }
        return () => {
            cancelAnimationFrame(frame);
            resize.disconnect();
            document.removeEventListener("visibilitychange", onVisibility);
            document.removeEventListener("fullscreenchange", onFullscreen);
        };
    }, [running]);

    useEffect(() => () => void audioRef.current?.close(), []);

    // The screen stays awake while the pattern runs (a laptop on a projector would dim it). The browser lets go of the
    // lock when the tab is hidden, so it's asked for again on the way back.
    useEffect(() => {
        if (!running || !("wakeLock" in navigator)) return;
        let lock: WakeLockSentinel | null = null;
        let done = false;
        const ask = () => {
            if (document.visibilityState !== "visible") return;
            navigator.wakeLock.request("screen").then((got) => {
                if (done) void got.release();
                else lock = got;
            }).catch(() => undefined); // refused (low battery, a setting): the screen may sleep
        };
        ask();
        document.addEventListener("visibilitychange", ask);
        return () => {
            done = true;
            document.removeEventListener("visibilitychange", ask);
            void lock?.release();
        };
    }, [running]);

    // The browser lets a page make sound only from an AudioContext made on a click or a key, so it's made on Start or on
    // unmute. Closing it cuts a beep already set, so it's closed on Stop, on mute and on leaving the tool.
    const wake = () => {
        audioRef.current ??= new AudioContext();
        void audioRef.current.resume();
    };
    const hush = () => {
        void audioRef.current?.close();
        audioRef.current = null;
        beepedRef.current = 0;
    };
    const start = () => {
        setRunning(true);
        if (!muted) wake();
    };
    const stop = () => {
        setRunning(false);
        hush();
    };
    const toggleMute = () => {
        if (muted && running) wake();
        if (!muted) hush();
        setMuted(!muted);
    };

    // The picture alone fills the screen. It takes the focus, so Space doesn't press a button left behind the screen.
    const fullscreen = () => {
        if (document.fullscreenElement) {
            void document.exitFullscreen();
            return;
        }
        stageRef.current?.requestFullscreen().catch(() => undefined); // refused: it stays in the page
        stageRef.current?.focus({preventScroll: true});
    };

    useShortcuts({
        Space: running ? stop : start,
        m: toggleMute,
        f: canFullscreen ? fullscreen : undefined,
    });

    return (
        <div className={`sync ${running ? "is-running" : ""}`}>
            <div className="sync_stage" ref={stageRef} tabIndex={-1}>
                <canvas className="sync_canvas" ref={canvasRef} role="img" aria-label="A/V sync test pattern" />
            </div>

            <div className="sync_controls">
                {running ? (
                    <button className="time_btn time_btn--danger time_btn--big" onClick={stop}>Stop</button>
                ) : (
                    <button className="time_btn time_btn--primary time_btn--big" onClick={start}>Start</button>
                )}
                <button
                    className="time_btn time_btn--big time_btn--icon"
                    aria-pressed={muted}
                    aria-label="Mute the beep"
                    title={muted ? "Beep off" : "Beep on"}
                    onClick={toggleMute}
                >
                    {muted ? <VolumeX size={20} aria-hidden /> : <Volume2 size={20} aria-hidden />}
                </button>
                {canFullscreen && (
                    <button
                        className="time_btn time_btn--big time_btn--icon"
                        aria-label="Fullscreen"
                        title="Fullscreen"
                        onClick={fullscreen}
                    >
                        <Maximize size={20} aria-hidden />
                    </button>
                )}
            </div>
            <p className="sync_note">Every part repeats once a second, in step with this device's clock. It flashes once a second.</p>
            <p className="time_keys">Space starts and stops. M turns the beep on and off. F goes fullscreen.</p>
        </div>
    );
}
