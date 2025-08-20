import React, {useEffect, useRef, useState} from "react";
import "./SuperICU.scss";
import {useWaveTemplates, sampleTemplate, useDemoVitals, modifyDemoSample} from "./sim";
import type {AlertItem} from "./sim";
import {checkAlarms, defaultCounters} from "./alarms";
import {alertSound} from "./sound";

// Centralized data color palette (can be overridden via props)
export type Palette = {
    ecg: string;      // ECG waveform + HR numeric
    pleth: string;    // Pleth waveform + SpO2 numeric
    resp: string;     // Resp waveform + RR numeric
    bp: string;       // NIBP/ABP numeric
    spo2: string;     // SpO2 numeric (defaults to pleth)
    rr: string;       // RR numeric (defaults to resp)
    etco2: string;    // EtCO2 numeric
    fio2: string;     // FIO2 numeric
    temp: string;     // Temperature numeric
    defaultText: string; // fallback
};

const DEFAULT_PALETTE: Palette = {
    ecg: "#00ff00",
    pleth: "#00e5ff",
    resp: "#ffffff",
    bp: "#ff5252",
    spo2: "#00e5ff",
    rr: "#ffffff",
    etco2: "#ffffff",
    fio2: "#ffffff",
    temp: "#ffffff",
    defaultText: "#d7e0ea",
};

// Changing TICK_MS or DEFAULT_SHOW_SECONDS affects perceived sweep speed.
const CFG = {
    // Core timing for the sweep renderer; lower = more updates per second
    TICK_MS: 20,
    // How many seconds should be visible across the canvas width by default
    DEFAULT_SHOW_SECONDS: 10,
    // Options for the Window selector in the top bar
    WINDOW_CHOICES: [4, 6, 8, 10, 12, 15, 20] as const,

    LINE_WIDTH: 2,
    CLEAR_WIDTH: 2,
    AMP_FRAC: 0.4,
    VAL_CLAMP: 1.2,

    // Ensure enough points per beat to preserve QRS peak at high HR
    MIN_SAMPLES_PER_BEAT: 300,
} as const;

export default function SuperIcu({
                                     inputRates,
                                     paletteOverrides,
                                 }: {
    inputRates?: { ecgHz?: number; plethHz?: number; respHz?: number };
    paletteOverrides?: Partial<Palette>;
} = {}) {
    const palette: Palette = {...DEFAULT_PALETTE, ...(paletteOverrides || {})};

    // Sound toggle (off by default due to browser autoplay policies)
    const [soundOn, setSoundOn] = useState(false);
    useEffect(() => {
        alertSound.setEnabled(soundOn);
    }, [soundOn]);

    // Canvas refs map to each waveform row
    const ecgRef = useRef<HTMLCanvasElement | null>(null);
    const plethRef = useRef<HTMLCanvasElement | null>(null);
    const respRef = useRef<HTMLCanvasElement | null>(null);

    // Demo vitals
    const {vitals} = useDemoVitals();
    const vitalsRef = useRef(vitals);
    useEffect(() => {
        vitalsRef.current = vitals;
    }, [vitals]);

    // init and ECG lead
    const [initialized, setInitialized] = useState<boolean>(false);
    const [ecgConnected, setEcgConnected] = useState<boolean>(true);

    // Alerts list
    const [alerts, setAlerts] = useState<AlertItem[]>([
        {id: randomId(), time: new Date().toLocaleTimeString(), level: "low", msg: "Monitoring started"}
    ]);

    // Top bar
    const [timeStr, setTimeStr] = useState<string>(new Date().toLocaleTimeString());
    // Seconds of waveform visible across the canvas width; controls horizontal sweep velocity
    const [showSeconds, setShowSeconds] = useState<number>(CFG.DEFAULT_SHOW_SECONDS);
    useEffect(() => {
        const t = setInterval(() => setTimeStr(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(t);
    }, []);

    // Precomputed waveform templates (ECG, Pleth, Resp) from sim.ts
    const {ecgTemplate, plethTemplate, respTemplate} = useWaveTemplates();

    // Sweep renderer: builds one drawing context per canvas and advances a "pen" at fixed time steps
    useEffect(() => {
        const canvases = [
            {ref: ecgRef, color: palette.ecg},
            {ref: plethRef, color: palette.pleth},
            {ref: respRef, color: palette.resp},
        ];

        type Sweep = {
            canvas: HTMLCanvasElement;
            ctx: CanvasRenderingContext2D;
            width: number; height: number; dpr: number;
            x: number;       // current pen x-position (CSS pixels)
            lastX: number | null; // last drawn x (used for segment continuity)
            lastY: number | null; // last drawn y
            color: string;   // stroke color
            lineWidth: number; // stroke width
            clearW: number;  // width of cleared strip at the pen
            resize: () => void; // handle DPR/size changes
            clearAll: () => void; // full canvas clear
        };

        const sweeps: Sweep[] = [];
        const ros: ResizeObserver[] = [];

        // Create a Sweep controller for a canvas element
        function makeSweep(canvas: HTMLCanvasElement, color: string): Sweep | null {
            const ctx = canvas.getContext("2d");
            if (!ctx) return null;
            const s: Sweep = {
                canvas, ctx,
                width: 0, height: 0, dpr: window.devicePixelRatio || 1,
                x: 0, lastX: null, lastY: null,
                color, lineWidth: CFG.LINE_WIDTH, clearW: CFG.CLEAR_WIDTH,
                resize: () => {
                    // Match device pixel ratio for crisp lines, but render in CSS pixels
                    const dpr = window.devicePixelRatio || 1;
                    s.dpr = dpr;
                    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
                    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
                    canvas.width = w;
                    canvas.height = h;
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixel coords
                    s.width = w / dpr;
                    s.height = h / dpr;
                    s.x = 0;
                    s.lastX = null;
                    s.lastY = null;
                    s.clearAll();
                },
                clearAll: () => {
                    ctx.save();
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.restore();
                },
            };
            s.resize();
            const ro = new ResizeObserver(() => s.resize());
            ro.observe(canvas);
            ros.push(ro);
            return s;
        }

        // Initialize sweeps for each visible canvas
        for (const c of canvases) {
            const el = c.ref.current;
            if (!el) continue;
            const s = makeSweep(el, c.color);
            if (s) sweeps.push(s);
        }
        if (sweeps.length !== canvases.length) {
            // if any canvas missing, bail to avoid partial rendering
            return () => {
                ros.forEach(r => r.disconnect());
            };
        }
        const [ecg, pleth, resp] = sweeps as [Sweep, Sweep, Sweep];

        // Continuous normalized phases [0,1) for each waveform
        let ecgPhase = 0, plethPhase = 0, respPhase = 0;
        const tickMs = CFG.TICK_MS;
        const dt = tickMs / 1000;
        let tSec = 0;
        let lastTs = performance.now();

        const timer = setInterval(() => {
            const now = performance.now();
            const elapsedSec = Math.max(0, (now - lastTs) / 1000);
            lastTs = now;

            if (!initialized) {
                ecg.clearAll();
                pleth.clearAll();
                resp.clearAll();
                return;
            }
            const hr = Math.max(1, Number(vitalsRef.current.hr));
            const rr = Math.max(1, Number(vitalsRef.current.rr));
            const hrHz = hr / 60;
            const rrHz = rr / 60;
            const stepEcg = hrHz * dt;
            const stepPleth = stepEcg;
            const stepResp = rrHz * dt;

            // Advance horizontally exactly by elapsed time fraction of the window width
            const dxEcgTotal = Math.max(0.5, ecg.width * (elapsedSec / showSeconds));
            const dxPlethTotal = Math.max(0.5, pleth.width * (elapsedSec / showSeconds));
            const dxRespTotal = Math.max(0.5, resp.width * (elapsedSec / showSeconds));

            const desiredPhaseStep = 1 / CFG.MIN_SAMPLES_PER_BEAT;
            const subEcg = Math.max(1, Math.ceil(stepEcg / desiredPhaseStep));
            const subPleth = Math.max(1, Math.ceil(stepPleth / desiredPhaseStep));
            const subResp = Math.max(1, Math.ceil(stepResp / desiredPhaseStep));

            const advanceAndDraw = (s: any, getVal: () => number, sub: number, dxTotal: number) => {
                const subDt = elapsedSec / sub;
                for (let i = 0; i < sub; i++) {
                    const v = getVal();
                    drawSweep(s, v, dxTotal / sub);
                    tSec += subDt;
                }
            };

            if (ecgConnected) {
                advanceAndDraw(
                    ecg,
                    () => {
                        ecgPhase += (hrHz * elapsedSec) / subEcg;
                        if (ecgPhase >= 1) ecgPhase -= 1;
                        const raw = sampleTemplate(ecgTemplate, ecgPhase, 1);
                        return modifyDemoSample("ecg", raw, tSec, vitalsRef.current);
                    },
                    subEcg,
                    dxEcgTotal
                );
            } else {
                ecg.clearAll();
                drawLeadOff(ecg, "LEAD OFF");
            }

            advanceAndDraw(
                pleth,
                () => {
                    plethPhase += (hrHz * elapsedSec) / subPleth;
                    if (plethPhase >= 1) plethPhase -= 1;
                    const raw = sampleTemplate(plethTemplate, plethPhase, 1) - 0.5;
                    return modifyDemoSample("pleth", raw, tSec, vitalsRef.current);
                },
                subPleth,
                dxPlethTotal
            );

            advanceAndDraw(
                resp,
                () => {
                    respPhase += (rrHz * elapsedSec) / subResp;
                    if (respPhase >= 1) respPhase -= 1;
                    const raw = sampleTemplate(respTemplate, respPhase, 1);
                    return modifyDemoSample("resp", raw, tSec, vitalsRef.current);
                },
                subResp,
                dxRespTotal
            );
        }, tickMs);

        const OVERWRITE_BAND_PX = 8; // Width of the band cleared ahead of the pen

        // Draw a single segment and advance the pen; clears a small band ahead to mimic overwrite
        function drawSweep(s: Sweep, val: number, dx: number) {
            const ctx = s.ctx;
            const mid = s.height / 2;
            const amp = s.height * CFG.AMP_FRAC;
            const y = mid - Math.max(-CFG.VAL_CLAMP, Math.min(CFG.VAL_CLAMP, val)) * amp;

            ctx.save();
            const clearW = Math.max(dx, OVERWRITE_BAND_PX);
            ctx.clearRect(s.x, 0, clearW, s.height); // erase only what the pen will overwrite
            ctx.strokeStyle = s.color;
            ctx.lineWidth = s.lineWidth;
            ctx.beginPath();
            if (s.lastX == null || (s.x === 0 && s.lastX !== 0)) {
                // First point of a sweep pass: start at current pen location
                ctx.moveTo(s.x, y);
            } else {
                // Continue from the last point for smoothness
                ctx.moveTo(s.lastX, s.lastY ?? y);
            }
            const newX = s.x + dx;
            ctx.lineTo(newX, y);
            ctx.stroke();
            ctx.restore();

            // Advance the pen and wrap
            s.lastX = newX;
            s.lastY = y;
            s.x = newX;
            if (s.x >= s.width) {
                s.x = 0;
                s.lastX = null;
                s.lastY = null;
            }
        }

        return () => {
            clearInterval(timer);
            ros.forEach(r => r.disconnect());
        };
    }, [ecgTemplate, plethTemplate, respTemplate, showSeconds, initialized, ecgConnected, palette.ecg, palette.pleth, palette.resp]);

    // Alarm checks: thresholds + persistence live in alarms.ts; evaluated every second
    useEffect(() => {
        const countersRef = {current: defaultCounters};
        const check = setInterval(() => {
            // Optionally suppress HR-triggered alarms when ECG is disconnected
            const v = vitalsRef.current;
            const vForAlarms = ecgConnected ? v : {...v, hr: "-?-" as const};
            const evald = checkAlarms(vForAlarms, countersRef.current);
            countersRef.current = evald.counters;
            if (evald.alerts.length) {
                // Play a tone per new alert if sound is enabled
                if (soundOn) {
                    for (const a of evald.alerts) alertSound.playAlert(a.level);
                }
                setAlerts(prev => [...evald.alerts, ...prev].slice(0, 50));
            }
        }, 1000);
        return () => clearInterval(check);
    }, [ecgConnected, soundOn]);

    // After first vitals update, mark initialized so numbers/waves can appear
    useEffect(() => {
        const ready = setTimeout(() => setInitialized(true), 1000);
        return () => clearTimeout(ready);
    }, []);

    // show "-?-" until initialized or when disconnected
    const disp = {
        hr: (!initialized || !ecgConnected) ? "-?-" : vitals.hr,
        spo2: (!initialized) ? "-?-" : vitals.spo2,
        rr: (!initialized) ? "-?-" : vitals.rr,
        bpSys: (!initialized) ? "-?-" : vitals.bp.sys,
        bpDia: (!initialized) ? "-?-" : vitals.bp.dia,
    } as const;

    return (
        <div className="super-icu">
            <div className="super-icu-core">
                <div className="top-bar">
                    SuperICU
                    <span className="status-pill">{timeStr}</span>
                    <span className="status-pill">Alarms: On</span>
                    <span className="status-pill" style={{cursor: "pointer"}} onClick={() => setEcgConnected(s => !s)}>
                        ECG: {ecgConnected ? "Connected" : "Disconnected"}
                    </span>
                    <span
                        className="status-pill"
                        style={{cursor: "pointer"}}
                        onClick={async () => {
                            if (!soundOn) await alertSound.kickstart();
                            setSoundOn(v => !v);
                        }}
                    >
                        Sound: {soundOn ? "On" : "Off"}
                    </span>
                    <div className="window-ctl" style={{marginLeft: "auto"}}>
                        <span className="muted">Window</span>
                        <select className="window-select" value={showSeconds} onChange={e => setShowSeconds(parseInt(e.target.value, 10))}>
                            {CFG.WINDOW_CHOICES.map(s => <option key={s} value={s}>{s}s</option>)}
                        </select>
                    </div>
                </div>

                {/* ECG row (frequency paced by HR) */}
                <div className="wave-row ecg">
                    <div className="lead-label" style={{color: palette.ecg}}>Lead II</div>
                    <div className="canvas-wrap">
                        <canvas ref={ecgRef} />
                    </div>
                    <div className="vitals">
                        <div className="vital">
                            <div className="label">HR</div>
                            <div className="value" style={{color: palette.ecg}}>{disp.hr}<span
                                style={{fontSize: 14, marginLeft: 4}}>{disp.hr === "-?-" ? "" : "bpm"}</span></div>
                        </div>
                    </div>
                </div>

                {/* Pleth row (paced by HR) */}
                <div className="wave-row pleth">
                    <div className="lead-label" style={{color: palette.pleth}}>Pleth</div>
                    <div className="canvas-wrap">
                        <canvas ref={plethRef} />
                    </div>
                    <div className="vitals">
                        <div className="vital spo2">
                            <div className="label">SpO₂</div>
                            <div className="value" style={{color: palette.spo2}}>{disp.spo2}<span
                                style={{fontSize: 14}}>{disp.spo2 === "-?-" ? "" : "%"}</span></div>
                        </div>
                    </div>
                </div>

                {/* Respiration row (frequency paced by RR) */}
                <div className="wave-row resp">
                    <div className="lead-label" style={{color: palette.resp}}>RESP</div>
                    <div className="canvas-wrap">
                        <canvas ref={respRef} />
                    </div>
                    <div className="vitals">
                        <div className="vital rr">
                            <div className="label">RR</div>
                            <div className="value" style={{color: palette.rr}}>{disp.rr}<span
                                style={{fontSize: 14, marginLeft: 4}}>{disp.rr === "-?-" ? "" : "rpm"}</span></div>
                        </div>
                        <div className="vital">
                            <div className="label">EtCO₂</div>
                            <div className="value" style={{color: palette.etco2}}>38</div>
                        </div>
                    </div>
                </div>

                {/* Non-waveform row for NIBP */}
                <div className="data-row">
                    <div className="vitals">
                        <div className="vital">
                            <div className="label" style={{color: palette.bp}}>NIBP</div>
                            <div className="value" style={{color: palette.bp}}>{disp.bpSys}/{disp.bpDia}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="side">
                <div className="side-header">Alerts</div>
                <div className="alerts">
                    {alerts.map(a => (
                        <div key={a.id} className={`alert ${a.level}`}>
                            <div className="time">{a.time}</div>
                            <div className="msg">{a.msg}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Helpers
function randomId() {
    try {
        // @ts-ignore
        const b = (crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(8)) : null;
        if (b) return Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("");
    } catch {
    }
    return Math.random().toString(36).slice(2);
}

// Overlay helper for disconnected leads
function drawLeadOff(s: { ctx: CanvasRenderingContext2D; width: number; height: number }, text: string) {
    const ctx = s.ctx;
    ctx.save();
    ctx.fillStyle = "#0b0d10"; // neutral dark background
    ctx.fillRect(0, 0, s.width, s.height);
    ctx.fillStyle = "#9fb2c8"; // muted neutral text
    ctx.font = "12px monospace";
    const metrics = ctx.measureText(text);
    const x = (s.width - metrics.width) / 2;
    const y = s.height / 2;
    ctx.fillText(text, x, y);
    ctx.restore();
}
