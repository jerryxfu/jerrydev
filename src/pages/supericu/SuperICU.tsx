import React, {useEffect, useRef, useState} from "react";
import "./SuperICU.scss";
import {useWaveTemplates, useDemoVitals} from "./sim";
import type {AlertItem} from "./sim";
import {checkAlarms, defaultCounters, thresholds} from "./alarms";
import type {AlarmCounters} from "./alarms";
import {alertSound} from "./sound";
import {useSweepRenderer} from "./useSweepRenderer";

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

// UI config
const CFG = {
    DEFAULT_SHOW_SECONDS: 10,
    WINDOW_CHOICES: [1, 4, 6, 8, 10, 12, 15, 20] as const,
} as const;

export default function SuperIcu({paletteOverrides}: {
    paletteOverrides?: Partial<Palette>;
} = {}) {
    const palette: Palette = {...DEFAULT_PALETTE, ...(paletteOverrides || {})};

    // Helper to attach CSS variables without any-casts
    const withVar = (base: React.CSSProperties, vars: Record<string, string | number>): React.CSSProperties => {
        return {...base, ...vars} as unknown as React.CSSProperties;
    };

    // Shared input style
    const inputStyle: React.CSSProperties = {
        background: "#01060a",
        color: "inherit",
        border: "1px solid var(--ui-border)",
        borderRadius: 4,
        padding: "2px 4px",
        fontSize: 12,
    };

    // Helper to commit numeric input on Enter
    const commitOnEnter = (
        e: React.KeyboardEvent<HTMLInputElement>,
        min: number,
        max: number,
        apply: (val: number) => void
    ) => {
        if (e.key !== "Enter") return;
        const val = parseInt((e.currentTarget.value || "").trim(), 10);
        if (Number.isFinite(val) && val >= min && val <= max) {
            apply(val);
            e.currentTarget.value = "";
        }
    };

    // Sound toggle (off by default due to browser autoplay policies)
    const [soundOn, setSoundOn] = useState(false);
    // New: user silenced flag (resets automatically when all alarms clear)
    const [silenced, setSilenced] = useState(false);
    // Heartbeat sound toggle
    const [heartbeatSound, setHeartbeatSound] = useState(false);
    const heartbeatRef = useRef(heartbeatSound);
    useEffect(() => {
        heartbeatRef.current = heartbeatSound;
    }, [heartbeatSound]);

    useEffect(() => {
        alertSound.setEnabled(soundOn || heartbeatSound); // Enable if either sound or heartbeat is on
        if (!soundOn) alertSound.stopLooping();
    }, [soundOn, heartbeatSound]);

    // Canvas refs map to each waveform row
    const ecgRef = useRef<HTMLCanvasElement | null>(null);
    const plethRef = useRef<HTMLCanvasElement | null>(null);
    const respRef = useRef<HTMLCanvasElement | null>(null);

    // Demo vitals
    const {vitals, correctVital} = useDemoVitals();
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

    // Track whether we are currently looping and at what level to avoid rescheduling
    const loopingRef = useRef<{ active: boolean; level: "low" | "medium" | "high" | null }>({active: false, level: null});

    // Flashing state for vitals by severity level per vital
    const [vitalAlarmLevel, setVitalAlarmLevel] = useState<{
        hr: "low" | "medium" | "high" | null;
        spo2: "low" | "medium" | "high" | null;
        rr: "low" | "medium" | "high" | null;
        bp?: "low" | "medium" | "high" | null;
    }>({hr: null, spo2: null, rr: null});

    // Top bar
    const [timeStr, setTimeStr] = useState<string>(new Date().toLocaleTimeString());
    // Show seconds in the top bar (default 10s)
    const [showSeconds, setShowSeconds] = useState<number>(CFG.DEFAULT_SHOW_SECONDS);
    useEffect(() => {
        const t = setInterval(() => setTimeStr(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(t);
    }, []);

    // Waveform templates
    const {ecgTemplate, plethTemplate, respTemplate} = useWaveTemplates();

    // Main sweep renderer hook
    useSweepRenderer({
        refs: {ecgRef, plethRef, respRef},
        colors: {ecg: palette.ecg, pleth: palette.pleth, resp: palette.resp},
        showSeconds,
        initialized,
        ecgConnected,
        templates: {ecgTemplate, plethTemplate, respTemplate},
        vitalsRef,
        heartbeatRef,
    });

    // Main alarm checking loop
    useEffect(() => {
        const countersRef: { current: AlarmCounters } = {current: defaultCounters};
        const check = setInterval(() => {
            // Optionally suppress HR-triggered alarms when ECG is disconnected
            const v = vitalsRef.current;
            const vForAlarms = ecgConnected ? v : {...v, hr: "-?-" as const};
            const evald = checkAlarms(vForAlarms, countersRef.current);
            countersRef.current = evald.counters;

            // Log any newly-triggered alerts (no one-shot notification sounds)
            if (evald.alerts.length) {
                // One-shot beep for warnings only
                if (soundOn && !silenced) {
                    for (const a of evald.alerts) {
                        if (a.level === "low") alertSound.playAlert("low");
                        if (a.level === "medium") alertSound.playAlert("medium");
                    }
                }
                setAlerts(prev => [...evald.alerts, ...prev].slice(0, 50));
            }

            // Determine currently active alarm conditions (persisting)
            const c = countersRef.current;
            const active = {
                hrHigh: c.hrHigh >= thresholds.hr.persistence,
                hrLow: c.hrLow >= thresholds.hr.persistence,
                spo2Low: c.spo2Low >= thresholds.spo2.persistence,
                rrHigh: c.rrHigh >= thresholds.rr.persistence,
                bpLow: c.bpLow >= thresholds.bp.persistence,
                bpHigh: c.bpHigh >= thresholds.bp.persistence,
            } as const;

            // Map to per-vital severity for flashing
            const hrLevel = active.hrHigh ? "high" : active.hrLow ? "medium" : null;
            const spo2Level = active.spo2Low ? "high" : null;
            const rrLevel = active.rrHigh ? "medium" : null;
            const bpLevel = active.bpLow ? "high" : active.bpHigh ? "medium" : null;
            setVitalAlarmLevel({hr: hrLevel, spo2: spo2Level, rr: rrLevel, bp: bpLevel});

            // Overall highest level for looping tone
            const highestLevel = (hrLevel === "high" || spo2Level === "high" || bpLevel === "high") ? "high" :
                ((hrLevel === "medium" || rrLevel === "medium" || bpLevel === "medium") ? "medium" : null);
            const anyActive = highestLevel !== null;

            // Auto-unsilence when all alarms clear
            if (!anyActive && silenced) setSilenced(false);

            // Control continuous looping alarm
            if (soundOn && anyActive && !silenced && highestLevel) {
                if (!loopingRef.current.active || loopingRef.current.level !== highestLevel) {
                    alertSound.startLooping(highestLevel);
                    loopingRef.current = {active: true, level: highestLevel};
                }
            } else {
                if (loopingRef.current.active) {
                    alertSound.stopLooping();
                    loopingRef.current = {active: false, level: null};
                }
            }
        }, 1000);
        return () => clearInterval(check);
    }, [ecgConnected, soundOn, silenced]);

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
                    SuperICU DEMO
                    <span className="status-pill">{timeStr}</span>
                    <span className="status-pill">Alarms: {silenced ? "Silenced" : "On"}</span>
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
                    {/* Heartbeat sound toggle */}
                    <span
                        className="status-pill"
                        style={{cursor: "pointer"}}
                        onClick={async () => {
                            if (!heartbeatSound) await alertSound.kickstart();
                            setHeartbeatSound(v => !v);
                        }}
                    >
                        Heartbeat: {heartbeatSound ? "On" : "Off"}
                    </span>
                    {/* Silence/Clear Alerts */}
                    <span
                        className="status-pill"
                        style={{cursor: "pointer"}}
                        onClick={() => {
                            setAlerts([]);
                            setSilenced(true);
                            alertSound.stopLooping();
                        }}
                    >
                        Clear Alerts
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
                    <div className="lead-label" style={{color: palette.ecg}}>
                        Lead II
                        <span
                            className="status-pill"
                            style={{cursor: "pointer", fontSize: 10, marginLeft: 8}}
                            onClick={() => setEcgConnected(s => !s)}
                        >
                            {ecgConnected ? "Connected" : "Disconnected"}
                        </span>
                    </div>
                    <div className="canvas-wrap">
                        <canvas ref={ecgRef} />
                    </div>
                    <div className="vitals">
                        <div className="vital">
                            <div className="label">HR</div>
                            <div className={`value ${vitalAlarmLevel.hr ? `alarm-${vitalAlarmLevel.hr}` : ""}`}
                                 style={withVar({color: palette.ecg}, {"--vital-color": palette.ecg as string})}>{disp.hr}<span
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
                            <div className={`value ${vitalAlarmLevel.spo2 ? `alarm-${vitalAlarmLevel.spo2}` : ""}`}
                                 style={withVar({color: palette.spo2}, {"--vital-color": palette.spo2 as string})}>{disp.spo2}<span
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
                            <div className={`value ${vitalAlarmLevel.rr ? `alarm-${vitalAlarmLevel.rr}` : ""}`}
                                 style={withVar({color: palette.rr}, {"--vital-color": palette.rr as string})}>{disp.rr}<span
                                style={{fontSize: 14, marginLeft: 4}}>{disp.rr === "-?-" ? "" : "rpm"}</span></div>
                        </div>
                        <div className="vital">
                            <div className="label">EtCO₂</div>
                            <div className="value" style={{color: palette.etco2}}>--</div>
                        </div>
                    </div>
                </div>

                {/* Non-waveform row for NIBP */}
                <div className="data-row">
                    <div className="vitals">
                        <div className="vital">
                            <div className="label" style={{color: palette.bp}}>NIBP</div>
                            <div className={`value ${vitalAlarmLevel.bp ? `alarm-${vitalAlarmLevel.bp}` : ""}`}
                                 style={withVar({color: palette.bp}, {"--vital-color": palette.bp as string})}>{disp.bpSys}/{disp.bpDia}</div>
                        </div>
                        {/* Manual vital corrections */}
                        <div className="vital">
                            <div className="label" style={{color: palette.defaultText}}>Set Values</div>
                            <div className="value" style={{color: palette.defaultText, display: "flex", alignItems: "center", gap: 6, fontSize: 14}}>
                                <input
                                    type="number"
                                    placeholder="HR"
                                    min={20}
                                    max={240}
                                    style={inputStyle}
                                    onKeyDown={(e) => commitOnEnter(e, 20, 240, val => correctVital({hr: val}))}
                                />
                                <input
                                    type="number"
                                    placeholder="SpO2"
                                    min={0}
                                    max={100}
                                    style={inputStyle}
                                    onKeyDown={(e) => commitOnEnter(e, 0, 100, val => correctVital({spo2: val}))}
                                />
                                <input
                                    type="number"
                                    placeholder="RR"
                                    min={0}
                                    max={60}
                                    style={inputStyle}
                                    onKeyDown={(e) => commitOnEnter(e, 0, 60, val => correctVital({rr: val}))}
                                />
                                <input
                                    type="number"
                                    placeholder="SYS"
                                    min={40}
                                    max={300}
                                    style={inputStyle}
                                    onKeyDown={(e) => commitOnEnter(e, 40, 300, val => correctVital({bpSys: val}))}
                                />
                                <input
                                    type="number"
                                    placeholder="DIA"
                                    min={20}
                                    max={200}
                                    style={inputStyle}
                                    onKeyDown={(e) => commitOnEnter(e, 20, 200, val => correctVital({bpDia: val}))}
                                />
                            </div>
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
