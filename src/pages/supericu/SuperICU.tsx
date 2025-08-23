import React, {useEffect, useMemo, useRef, useState} from "react";
import "./SuperICU.scss";
import {useWaveTemplates, useDemoVitals} from "./sim";
import type {AlertItem} from "./sim";
import {checkAlarms, defaultCounters, thresholds} from "./alarms";
import type {AlarmCounters} from "./alarms";
import {alertSound} from "./sound";
import {useSweepRenderer, TemplateSource, CsvSource} from "./useSweepRenderer";

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

type RowDef = {
    key: string;
    label: string;
    color: string;
    className?: string; // for styling hooks like ecg/pleth/resp
    source: TemplateSource | CsvSource;
    showVital?: "hr" | "spo2" | "rr"; // which vital to show on the right, if any
    showLeadToggle?: boolean; // show connected/disconnected toggle for ECG-like rows
};

export default function SuperIcu({paletteOverrides}: {
    paletteOverrides?: Partial<Palette>;
} = {}) {
    const palette: Palette = useMemo(() => ({...DEFAULT_PALETTE, ...(paletteOverrides || {})}), [paletteOverrides]);

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

    // CSV upload state
    const [mode, setMode] = useState<"demo" | "csv">("demo");
    const [csvData, setCsvData] = useState<null | { sampleHz: number; columns: { name: string; samples: Float32Array }[] }>(null);
    const [csvConfig, setCsvConfig] = useState<{ firstColIsTime: boolean; hasHeader: boolean; sampleHz: number }>({
        firstColIsTime: true,
        hasHeader: true,
        sampleHz: 250,
    });
    // Vitals CSV state
    const [vitalsCsv, setVitalsCsv] = useState<null | ParsedVitalsCsv>(null);
    const [vitalsCsvConfig, setVitalsCsvConfig] = useState<{ firstColIsTime: boolean; hasHeader: boolean }>({
        firstColIsTime: true,
        hasHeader: true,
    });
    // Clock for CSV time alignment
    const [csvStartMs, setCsvStartMs] = useState<number | null>(null);
    useEffect(() => {
        if (mode === "csv" && (csvData || vitalsCsv)) {
            if (csvStartMs == null) setCsvStartMs(performance.now());
        } else {
            setCsvStartMs(null);
        }
    }, [mode, csvData, vitalsCsv, csvStartMs]);
    const csvElapsedSec = useMemo(() => {
        if (csvStartMs == null) return 0;
        return (performance.now() - csvStartMs) / 1000;
    }, [csvStartMs]);
    // tick to refresh elapsed time dep
    const [, setTick] = useState(0);
    useEffect(() => {
        if (csvStartMs == null) return;
        const t = setInterval(() => setTick(x => (x + 1) % 1000), 200);
        return () => clearInterval(t);
    }, [csvStartMs]);

    // Canvas refs keyed by row key to keep stable across renders
    const canvasRefs = useRef(new Map<string, React.RefObject<HTMLCanvasElement | null>>());
    const getCanvasRef = (key: string) => {
        const m = canvasRefs.current;
        const existing = m.get(key);
        if (existing) return existing;
        const created = React.createRef<HTMLCanvasElement | null>();
        m.set(key, created);
        return created;
    };

    // Build dynamic rows either from demo templates or from uploaded CSV
    const rows: RowDef[] = useMemo(() => {
        if (mode === "csv" && csvData) {
            return csvData.columns.map(col => {
                const mapped = mapLeadName(col.name, palette);
                const src: CsvSource = {kind: "csv", samples: col.samples, sampleHz: csvData.sampleHz};
                // if lead is ecg/pleth/resp, assign matching vital on the right
                let showVital: RowDef["showVital"] | undefined;
                if (mapped.className === "ecg") showVital = "hr";
                else if (mapped.className === "pleth") showVital = "spo2";
                else if (mapped.className === "resp") showVital = "rr";
                return {
                    key: `csv:${col.name}`,
                    label: mapped.label,
                    color: mapped.color,
                    className: mapped.className,
                    source: src,
                    showVital,
                } as RowDef;
            });
        }
        // demo rows
        const rowsDemo: RowDef[] = [
            {
                key: "ECG",
                label: "Lead II",
                color: palette.ecg,
                className: "ecg",
                source: {kind: "template", template: ecgTemplate, pace: "hr", connected: ecgConnected, heartbeat: true},
                showVital: "hr",
                showLeadToggle: true,
            },
            {
                key: "Pleth",
                label: "Pleth",
                color: palette.pleth,
                className: "pleth",
                source: {kind: "template", template: plethTemplate, pace: "hr"},
                showVital: "spo2",
            },
            {
                key: "RESP",
                label: "RESP",
                color: palette.resp,
                className: "resp",
                source: {kind: "template", template: respTemplate, pace: "rr"},
                showVital: "rr",
            },
        ];
        return rowsDemo;
    }, [mode, csvData, palette, ecgTemplate, plethTemplate, respTemplate, ecgConnected]);

    // Main sweep renderer hook with dynamic channels
    const channels = useMemo(() => rows.map(r => ({key: r.key, ref: getCanvasRef(r.key), color: r.color, source: r.source})), [rows]);
    useSweepRenderer({channels, showSeconds, initialized, vitalsRef, heartbeatRef});

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
    const disp = useMemo(() => {
        if (mode === "csv" && vitalsCsv) {
            const cur = pickVitalsAtTime(vitalsCsv, csvElapsedSec);
            const fmt = (x: number | null | undefined, digits = 0) => (x == null || !Number.isFinite(x)) ? "-?-" : Number(x.toFixed(digits));
            return {
                hr: fmt(cur.hr),
                spo2: fmt(cur.spo2),
                rr: fmt(cur.rr),
                bpSys: fmt(cur.bpSys),
                bpDia: fmt(cur.bpDia),
            } as const;
        }
        return {
            hr: (!initialized || !ecgConnected) ? "-?-" : vitals.hr,
            spo2: (!initialized) ? "-?-" : vitals.spo2,
            rr: (!initialized) ? "-?-" : vitals.rr,
            bpSys: (!initialized) ? "-?-" : vitals.bp.sys,
            bpDia: (!initialized) ? "-?-" : vitals.bp.dia,
        } as const;
    }, [mode, vitalsCsv, csvElapsedSec, initialized, ecgConnected, vitals]);

    // Compute extra vitals to show in an "Other Vitals" row (CSV mode only)
    const otherVitals: Array<{ label: string; value: string }> = useMemo(() => {
        if (mode !== "csv" || !vitalsCsv) return [];
        const cur = pickVitalsAtTime(vitalsCsv, csvElapsedSec);
        const used = new Set<string>(["HR", "%SpO2", "SpO2", "RESP", "RR", "NBP SYS", "NBP DIAS", "NIBP SYS", "NIBP DIAS"]);
        const out: Array<{ label: string; value: string }> = [];
        for (const c of vitalsCsv.columns) {
            if (used.has(c.name)) continue;
            const v = cur.extra.get(c.name);
            if (v == null || !Number.isFinite(v)) continue;
            out.push({label: c.name, value: String(Number(v.toFixed(1)))});
        }
        return out.slice(0, 8);
    }, [mode, vitalsCsv, csvElapsedSec]);

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

                {/* Dynamic waveform rows */}
                {rows.map(r => (
                    <div key={r.key} className={`wave-row ${r.className ?? ""}`}>
                        <div className="lead-label" style={{color: r.color}}>
                            {r.label}
                            {r.showLeadToggle && r.source.kind === "template" && r.source.pace === "hr" && (
                                <span
                                    className="status-pill"
                                    style={{cursor: "pointer", fontSize: 10, marginLeft: 8}}
                                    onClick={() => setEcgConnected(s => !s)}
                                >
                                    {ecgConnected ? "Connected" : "Disconnected"}
                                </span>
                            )}
                        </div>
                        <div className="canvas-wrap">
                            <canvas ref={getCanvasRef(r.key)} />
                        </div>
                        {r.showVital && (
                            <div className="vitals">
                                <div className={`vital ${r.showVital}`}>
                                    <div className="label">{r.showVital.toUpperCase()}</div>
                                    <div
                                        className={`value ${vitalAlarmLevel[r.showVital] ? `alarm-${vitalAlarmLevel[r.showVital]}` : ""}`}
                                        style={withVar({color: colorForVital(r.showVital, palette)}, {"--vital-color": colorForVital(r.showVital, palette) as string})}
                                    >
                                        {(() => {
                                            return disp[r.showVital];
                                        })()}
                                        <span style={{fontSize: 14, marginLeft: r.showVital === "rr" ? 4 : 0}}>
                                            {disp[r.showVital] === "-?-" ? "" : unitForVital(r.showVital)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Non-waveform row for NIBP and CSV controls */}
                <div className="data-row">
                    <div className="vitals">
                        <div className="vital">
                            <div className="label" style={{color: palette.bp}}>NIBP</div>
                            <div className={`value ${vitalAlarmLevel.bp ? `alarm-${vitalAlarmLevel.bp}` : ""}`}
                                 style={withVar({color: palette.bp}, {"--vital-color": palette.bp as string})}>{disp.bpSys}/{disp.bpDia}</div>
                        </div>
                        {/* Manual vital corrections (demo mode) */}
                        {mode !== "csv" && (
                            <div className="vital">
                                <div className="label" style={{color: palette.defaultText}}>Set Values</div>
                                <div className="value"
                                     style={{color: palette.defaultText, display: "flex", alignItems: "center", gap: 6, fontSize: 14}}>
                                    <input type="number" placeholder="HR" min={20} max={240} style={inputStyle}
                                           onKeyDown={(e) => commitOnEnter(e, 20, 240, val => correctVital({hr: val}))} />
                                    <input type="number" placeholder="SpO2" min={0} max={100} style={inputStyle}
                                           onKeyDown={(e) => commitOnEnter(e, 0, 100, val => correctVital({spo2: val}))} />
                                    <input type="number" placeholder="RR" min={0} max={60} style={inputStyle}
                                           onKeyDown={(e) => commitOnEnter(e, 0, 60, val => correctVital({rr: val}))} />
                                    <input type="number" placeholder="SYS" min={40} max={300} style={inputStyle}
                                           onKeyDown={(e) => commitOnEnter(e, 40, 300, val => correctVital({bpSys: val}))} />
                                    <input type="number" placeholder="DIA" min={20} max={200} style={inputStyle}
                                           onKeyDown={(e) => commitOnEnter(e, 20, 200, val => correctVital({bpDia: val}))} />
                                </div>
                            </div>
                        )}
                        {/* CSV upload controls */}
                        <div className="vital">
                            <div className="label" style={{color: palette.defaultText}}>Waveform CSV</div>
                            <div className="value"
                                 style={{color: palette.defaultText, display: "flex", alignItems: "center", gap: 6, fontSize: 14, flexWrap: "wrap"}}>
                                <input type="file" accept=".csv,text/csv" style={inputStyle}
                                       onChange={e => {
                                           const f = e.target.files?.[0];
                                           if (f) handleCsvFile(f);
                                           e.currentTarget.value = "";
                                       }} />
                                <label style={{display: "flex", alignItems: "center", gap: 4}}>
                                    <input type="checkbox" checked={csvConfig.firstColIsTime}
                                           onChange={e => setCsvConfig(c => ({...c, firstColIsTime: e.target.checked}))} />
                                    <span>First column is time</span>
                                </label>
                                <label style={{display: "flex", alignItems: "center", gap: 4}}>
                                    <input type="checkbox" checked={csvConfig.hasHeader}
                                           onChange={e => setCsvConfig(c => ({...c, hasHeader: e.target.checked}))} />
                                    <span>Has header row</span>
                                </label>
                                <label style={{display: "flex", alignItems: "center", gap: 4}}>
                                    <span>Sample Hz</span>
                                    <input type="number" value={csvConfig.sampleHz} min={1} max={10000} step={1}
                                           style={{...inputStyle, width: 70}}
                                           onChange={e => setCsvConfig(c => ({...c, sampleHz: parseInt(e.target.value || "0", 10) || c.sampleHz}))} />
                                </label>
                                <button style={{...inputStyle, cursor: "pointer"}} onClick={() => {
                                    setMode("demo");
                                    setCsvData(null);
                                    setVitalsCsv(null);
                                }}>
                                    Use Demo
                                </button>
                                {mode === "csv" && csvData && (
                                    <span style={{opacity: 0.8}}>Loaded {csvData.columns.length} lead(s) @ {csvData.sampleHz} Hz</span>
                                )}
                            </div>
                        </div>
                        {/* Vitals CSV controls */}
                        <div className="vital">
                            <div className="label" style={{color: palette.defaultText}}>Vitals CSV</div>
                            <div className="value"
                                 style={{color: palette.defaultText, display: "flex", alignItems: "center", gap: 6, fontSize: 14, flexWrap: "wrap"}}>
                                <input type="file" accept=".csv,text/csv" style={inputStyle}
                                       onChange={e => {
                                           const f = e.target.files?.[0];
                                           if (f) handleVitalsCsvFile(f);
                                           e.currentTarget.value = "";
                                       }} />
                                <label style={{display: "flex", alignItems: "center", gap: 4}}>
                                    <input type="checkbox" checked={vitalsCsvConfig.firstColIsTime}
                                           onChange={e => setVitalsCsvConfig(c => ({...c, firstColIsTime: e.target.checked}))} />
                                    <span>First column is time</span>
                                </label>
                                <label style={{display: "flex", alignItems: "center", gap: 4}}>
                                    <input type="checkbox" checked={vitalsCsvConfig.hasHeader}
                                           onChange={e => setVitalsCsvConfig(c => ({...c, hasHeader: e.target.checked}))} />
                                    <span>Has header row</span>
                                </label>
                                {vitalsCsv && (
                                    <span style={{opacity: 0.8}}>Loaded {vitalsCsv.columns.length} vital(s)</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Other vitals (CSV) */}
                {mode === "csv" && otherVitals.length > 0 && (
                    <div className="data-row">
                        <div className="vitals">
                            {otherVitals.map((ov, i) => (
                                <div key={`${ov.label}-${i}`} className="vital">
                                    <div className="label" style={{color: palette.defaultText}}>{ov.label}</div>
                                    <div className="value" style={{color: palette.defaultText}}>{ov.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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

    // ---- helpers in component scope ----
    function handleCsvFile(file: File) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const text = String(reader.result || "");
                const parsed = parseCsv(text, csvConfig);
                setCsvData(parsed);
                setMode("csv");
                if (csvStartMs == null) setCsvStartMs(performance.now());
            } catch (e) {
                console.error("CSV parse error", e);
                alert("Failed to parse CSV. Check console for details.");
            }
        };
        reader.readAsText(file);
    }

    function handleVitalsCsvFile(file: File) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const text = String(reader.result || "");
                const parsed = parseVitalsCsv(text, vitalsCsvConfig);
                setVitalsCsv(parsed);
                setMode("csv");
                if (csvStartMs == null) setCsvStartMs(performance.now());
            } catch (e) {
                console.error("Vitals CSV parse error", e);
                alert("Failed to parse Vitals CSV. Check console for details.");
            }
        };
        reader.readAsText(file);
    }
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

// Lead name -> display mapping, with colors/classes from palette
function mapLeadName(raw: string, palette: Palette): { label: string; color: string; className?: string } {
    const norm = raw.trim();
    const lc = norm.toLowerCase().replace(/[^a-z0-9]/g, "");
    // Pleth/SpO2
    if (lc.includes("pleth") || lc.includes("spo2") || lc.includes("spo")) {
        return {label: "Pleth", color: palette.pleth, className: "pleth"};
    }
    // Resp
    if (lc.includes("resp") || lc.includes("respiration") || lc.includes("rr")) {
        return {label: "RESP", color: palette.resp, className: "resp"};
    }
    // ECG common names
    if (lc === "i" || lc === "ii" || lc === "iii" || lc.startsWith("lead") || lc.includes("ecg")) {
        const upper = norm.toUpperCase();
        return {label: upper.startsWith("LEAD") ? upper : `Lead ${upper}`, color: palette.ecg, className: "ecg"};
    }
    if (lc === "avr" || lc === "avl" || lc === "avf") {
        return {label: norm.toUpperCase(), color: palette.ecg, className: "ecg"};
    }
    if (/^v[1-6]$/.test(lc)) {
        return {label: norm.toUpperCase(), color: palette.ecg, className: "ecg"};
    }
    // default
    return {label: norm, color: palette.defaultText};
}

function colorForVital(v: "hr" | "spo2" | "rr", palette: Palette) {
    switch (v) {
        case "hr":
            return palette.ecg;
        case "spo2":
            return palette.spo2;
        case "rr":
            return palette.rr;
    }
}

function unitForVital(v: "hr" | "spo2" | "rr") {
    switch (v) {
        case "hr":
            return "bpm";
        case "spo2":
            return "%";
        case "rr":
            return "rpm";
    }
}

// Very small CSV parser for numeric timeseries
function parseCsv(text: string, cfg: { firstColIsTime: boolean; hasHeader: boolean; sampleHz: number }): {
    sampleHz: number;
    columns: { name: string; samples: Float32Array }[]
} {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) throw new Error("Empty CSV");
    const firstLine = lines[0] ?? "";
    const delim = detectDelim(firstLine);

    const startIdx = cfg.hasHeader ? 1 : 0;
    const headerCells = firstLine.split(delim).map(s => s.trim());

    const rows = lines.slice(startIdx).map(line => line.split(delim));
    const colCount = rows[0]?.length ?? headerCells.length;

    const names: string[] = cfg.hasHeader ? headerCells : Array.from({length: colCount}, (_, i) => `ch${i + 1}`);

    const cols: number[][] = Array.from({length: colCount}, () => []);
    for (const r of rows) {
        for (let i = 0; i < colCount; i++) {
            const cell = (r[i] ?? "").trim();
            const num = parseFloat(cell);
            const bucket = cols[i] ?? (cols[i] = []);
            bucket.push(Number.isFinite(num) ? num : 0);
        }
    }

    let sampleHz = cfg.sampleHz;
    let seriesStart = 0;
    if (cfg.firstColIsTime && colCount >= 2) {
        const time = cols[0] ?? [];
        const deltas: number[] = [];
        for (let i = 1; i < time.length; i++) {
            const t1 = time[i] ?? Number.NaN;
            const t0 = time[i - 1] ?? Number.NaN;
            const d = t1 - t0;
            if (Number.isFinite(d) && d > 0) deltas.push(d);
        }
        const median = deltas.sort((a, b) => a - b)[Math.floor(deltas.length / 2)] ?? 0;
        if (median > 0) {
            // crude unit guess: if median > 10 assume ms else seconds
            sampleHz = median > 10 ? Math.round(1000 / median) : Math.round(1 / median);
        }
        seriesStart = 1; // data columns start after time
    }

    const dataCols: { name: string; samples: Float32Array }[] = [];
    for (let i = seriesStart; i < colCount; i++) {
        const name = names[i] ?? `ch${i + 1}`;
        const values = cols[i] ?? [];
        // normalize to roughly [-1, 1]
        let min = Infinity, max = -Infinity;
        for (const v of values) {
            if (v < min) min = v;
            if (v > max) max = v;
        }
        let samples: Float32Array;
        if (min === Infinity || max === -Infinity || values.length === 0) {
            samples = new Float32Array();
        } else if (Math.abs(max - min) < 1e-12) {
            samples = new Float32Array(values.length); // all zeros
        } else {
            const range = max - min;
            samples = new Float32Array(values.length);
            for (let k = 0; k < values.length; k++) {
                const vk = values[k] ?? 0;
                const v = (vk - min) / range; // [0,1]
                samples[k] = v * 2 - 1; // [-1,1]
            }
        }
        dataCols.push({name, samples});
    }

    return {sampleHz, columns: dataCols};
}

function detectDelim(headerLine?: string): string {
    const h = headerLine ?? ",";
    if (h.includes(",")) return ",";
    if (h.includes("\t")) return "\t";
    if (h.includes(";")) return ";";
    return ",";
}

// Vitals CSV types and helpers
type ParsedVitalsCsv = {
    times?: number[]; // seconds, if present
    columns: { name: string; values: number[] }[];
};

function parseVitalsCsv(text: string, cfg: { firstColIsTime: boolean; hasHeader: boolean }): ParsedVitalsCsv {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) throw new Error("Empty CSV");
    const firstLine = lines[0] ?? "";
    const delim = detectDelim(firstLine);
    const startIdx = cfg.hasHeader ? 1 : 0;
    const headerCells = firstLine.split(delim).map(s => s.trim());
    const rows = lines.slice(startIdx).map(line => line.split(delim));
    const colCount = rows[0]?.length ?? headerCells.length;
    const names: string[] = cfg.hasHeader ? headerCells : Array.from({length: colCount}, (_, i) => `c${i + 1}`);

    const cols: number[][] = Array.from({length: colCount}, () => []);
    for (const r of rows) {
        for (let i = 0; i < colCount; i++) {
            const cell = (r[i] ?? "").trim();
            const num = parseFloat(cell);
            const bucket = cols[i] ?? (cols[i] = []);
            bucket.push(num);
        }
    }
    let times: number[] | undefined;
    let startCol = 0;
    if (cfg.firstColIsTime) {
        times = (cols[0] ?? []).map(v => Number.isFinite(v) ? Number(v) : 0);
        startCol = 1;
    }
    const columns = [] as { name: string; values: number[] }[];
    for (let i = startCol; i < colCount; i++) {
        columns.push({name: names[i] ?? `c${i + 1}`, values: cols[i] ?? []});
    }
    const result: ParsedVitalsCsv = {...(times ? {times} : {}), columns};
    return {...(times ? {times} : {}), columns};
}

function pickVitalsAtTime(v: ParsedVitalsCsv, elapsedSec: number): {
    hr: number | null;
    spo2: number | null;
    rr: number | null;
    bpSys: number | null;
    bpDia: number | null;
    extra: Map<string, number>
} {
    const idx = pickRowIndex(v.times, elapsedSec);
    const get = (label: string | RegExp): number | null => {
        const col = findCol(v.columns, label);
        const raw = col ? col.values[idx] : undefined;
        return Number.isFinite(raw as number) ? (raw as number) : null;
    };
    const hr = get(/^hr$/i) ?? get("HR") ?? get(/^pulse$/i) ?? get("PULSE");
    const spo2 = get(/%?s?po2/i) ?? get("%SpO2");
    const rr = get(/^resp$|^rr$/i) ?? get("RESP");
    const bpSys = get(/(n?ibp|nbp)?\s*sys/i) ?? get("NBP SYS") ?? get("NIBP SYS");
    const bpDia = get(/(n?ibp|nbp)?\s*(dia|dias)/i) ?? get("NBP DIAS") ?? get("NIBP DIAS");

    const extra = new Map<string, number>();
    for (const c of v.columns) {
        const val = c.values[idx];
        if (Number.isFinite(val)) extra.set(c.name, val);
    }
    return {hr, spo2, rr, bpSys, bpDia, extra};
}

function findCol(cols: { name: string; values: number[] }[], label: string | RegExp) {
    const f = (name: string) => typeof label === "string" ? name === label : label.test(name);
    return cols.find(c => f(c.name));
}

function pickRowIndex(times: number[] | undefined, elapsedSec: number) {
    if (!times || times.length === 0) return 0;
    const maxT = times[times.length - 1] ?? 0;
    if (maxT <= 0) return Math.min(Math.floor(elapsedSec) % times.length, times.length - 1);
    // wrap elapsed into [0, maxT]
    const t = ((elapsedSec % maxT) + maxT) % maxT;
    // find last index with time <= t
    let lo = 0, hi = times.length - 1;
    while (lo < hi) {
        const mid = Math.floor((lo + hi + 1) / 2);
        if ((times[mid] ?? 0) <= t) lo = mid; else hi = mid - 1;
    }
    return lo;
}
