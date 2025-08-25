import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import "./SuperICU.scss";
import type {AlertItem, Vitals} from "./sim";
import {useDemoVitals, useWaveTemplates} from "./sim";
import type {AlarmCounters} from "./alarms";
import {checkAlarms, defaultCounters, thresholds} from "./alarms";
import {alertSound} from "./sound";
import type {SweepRendererOptions} from "./useSweepRenderer";
import {CsvSource, TemplateSource, useSweepRenderer} from "./useSweepRenderer";

// New: import shared helpers
import {
    randomId,
    mapLeadName,
    inferVitalFromMsg,
    colorForVital,
    unitForVital,
    parseCsv,
    parseVitalsCsv,
    type ParsedVitalsCsv,
    pickVitalsAtTime,
    minOf,
    maxOf,
    fmt9,
    formatWaveVal,
} from "./helpers";

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
    // New: optional raw value range for display/debug
    yMin?: number;
    yMax?: number;
    sampleHz?: number; // CSV only (for display)
};

// Vitals CSV types
// Removed local ParsedVitalsCsv type (now imported)

export default function SuperIcu({paletteOverrides}: {
    paletteOverrides?: Partial<Palette>;
} = {}) {
    const palette: Palette = useMemo(() => ({...DEFAULT_PALETTE, ...(paletteOverrides || {})}), [paletteOverrides]);

    // Helper to attach CSS variables
    const withVar = (base: React.CSSProperties, vars: Record<string, string | number>): React.CSSProperties => ({...base, ...vars});

    // Shared input style
    const inputStyle: React.CSSProperties = {
        background: "#01060a",
        color: "inherit",
        border: "1px solid var(--ui-border)",
        borderRadius: 4,
        padding: "2px 4px",
        fontSize: 12,
    };

    // Commit numeric input on Enter
    const commitOnEnter = (e: React.KeyboardEvent<HTMLInputElement>, min: number, max: number, apply: (val: number) => void) => {
        if (e.key !== "Enter") return;
        const val = parseInt((e.currentTarget.value || "").trim(), 10);
        if (Number.isFinite(val) && val >= min && val <= max) {
            apply(val);
            e.currentTarget.value = "";
        }
    };

    // Sound toggles
    const [soundOn, setSoundOn] = useState(false);
    const [silenced, setSilenced] = useState(false);
    const [heartbeatSound, setHeartbeatSound] = useState(false);
    const heartbeatRef = useRef(heartbeatSound);
    useEffect(() => {
        heartbeatRef.current = heartbeatSound;
    }, [heartbeatSound]);
    useEffect(() => {
        alertSound.setEnabled(soundOn || heartbeatSound);
        if (!soundOn) alertSound.stopLooping();
    }, [soundOn, heartbeatSound]);

    // Demo vitals
    const {vitals, correctVital} = useDemoVitals();
    const vitalsRef = useRef(vitals);
    useEffect(() => {
        vitalsRef.current = vitals;
    }, [vitals]);

    const [initialized, setInitialized] = useState<boolean>(false);

    // Alerts list
    const [alerts, setAlerts] = useState<AlertItem[]>([
        {id: randomId(), time: new Date().toLocaleTimeString(), level: "low", msg: "Monitoring started"}
    ]);

    // Looping alarm state
    const loopingRef = useRef<{ active: boolean; level: "low" | "advisory" | "critical" | null }>({active: false, level: null});

    // Per-vital flashing state
    const [vitalAlarmLevel, setVitalAlarmLevel] = useState<{
        hr: "low" | "advisory" | "critical" | null;
        spo2: "low" | "advisory" | "critical" | null;
        rr: "low" | "advisory" | "critical" | null;
        bp?: "low" | "advisory" | "critical" | null;
    }>({hr: null, spo2: null, rr: null});

    // Top bar
    const [timeStr, setTimeStr] = useState<string>(new Date().toLocaleTimeString());
    const [showSeconds, setShowSeconds] = useState<number>(CFG.DEFAULT_SHOW_SECONDS);
    useEffect(() => {
        const t = setInterval(() => setTimeStr(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(t);
    }, []);

    // Waveform templates
    const {ecgTemplate, plethTemplate, respTemplate} = useWaveTemplates();

    // CSV state
    const [mode, setMode] = useState<"demo" | "csv">("demo");
    const [csvData, setCsvData] = useState<null | {
        sampleHz: number;
        columns: { name: string; values: Float32Array; yMin: number; yMax: number }[]
    }>(null);
    const [vitalsCsv, setVitalsCsv] = useState<null | ParsedVitalsCsv>(null);
    const [csvStartMs, setCsvStartMs] = useState<number | null>(null);
    useEffect(() => {
        if (mode !== "csv") {
            setCsvStartMs(null);
            return;
        }
        if (csvData || vitalsCsv) {
            if (csvStartMs == null) setCsvStartMs(performance.now());
        }
    }, [mode, csvData, vitalsCsv, csvStartMs]);
    const [, setTick] = useState(0);
    const csvElapsedSec = csvStartMs == null ? 0 : (performance.now() - csvStartMs) / 1000;
    useEffect(() => {
        if (csvStartMs == null) return;
        const t = setInterval(() => setTick(x => (x + 1) % 1000), 200);
        return () => clearInterval(t);
    }, [csvStartMs]);

    // Canvas refs per row
    const canvasRefs = useRef(new Map<string, React.RefObject<HTMLCanvasElement | null>>());
    const getCanvasRef = (key: string) => {
        const m = canvasRefs.current;
        const e = m.get(key);
        if (e) return e;
        const c = React.createRef<HTMLCanvasElement | null>();
        m.set(key, c);
        return c;
    };

    // Live waveform values under lead name (renderer callback -> throttled state)
    const waveformValsRef = useRef(new Map<string, { val: number | null; raw: number | null }>());
    const [waveformVals, setWaveformVals] = useState<Map<string, { val: number | null; raw: number | null }>>(new Map());
    const onValueCb = useCallback((key: string, val: number | null, raw?: number | null) => {
        waveformValsRef.current.set(key, {val, raw: typeof raw === "number" || raw === null ? raw : val});
    }, []);
    useEffect(() => {
        const t = setInterval(() => setWaveformVals(new Map(waveformValsRef.current)), 200); // refresh rate
        return () => clearInterval(t);
    }, []);

    // Detect if CSV vitals include a Pulse/PR column
    const hasCsvPulse = useMemo(() => {
        if (!vitalsCsv) return false;
        const pats = [/^pulse$/i, /^pr$/i, /pulse\s*rate/i];
        return vitalsCsv.columns.some(c => pats.some(p => p.test(c.name)));
    }, [vitalsCsv]);

    // Build rows
    const rows: RowDef[] = useMemo(() => {
        if (mode === "csv") {
            if (csvData) {
                return csvData.columns.map(col => {
                    const mapped = mapLeadName(col.name, palette);
                    const src: CsvSource = {kind: "csv", samples: col.values, sampleHz: csvData.sampleHz, yMin: col.yMin, yMax: col.yMax};
                    let showVital: RowDef["showVital"] | undefined;
                    if (mapped.className === "ecg") showVital = "hr"; else if (mapped.className === "pleth") showVital = "spo2"; else if (mapped.className === "resp") showVital = "rr";
                    return {
                        key: `csv:${col.name}`,
                        label: mapped.label,
                        color: mapped.color,
                        className: mapped.className,
                        source: src,
                        showVital,
                        yMin: col.yMin,
                        yMax: col.yMax,
                        sampleHz: csvData.sampleHz
                    } as RowDef;
                });
            }
            return [];
        }
        return [
            {
                key: "ECG",
                label: "Lead II",
                color: palette.ecg,
                className: "ecg",
                source: {kind: "template", template: ecgTemplate, pace: "hr", heartbeat: true},
                showVital: "hr",
                yMin: minOf(ecgTemplate),
                yMax: maxOf(ecgTemplate)
            },
            {
                key: "Pleth",
                label: "Pleth",
                color: palette.pleth,
                className: "pleth",
                source: {kind: "template", template: plethTemplate, pace: "hr"},
                showVital: "spo2",
                yMin: minOf(plethTemplate),
                yMax: maxOf(plethTemplate)
            },
            {
                key: "RESP",
                label: "RESP",
                color: palette.resp,
                className: "resp",
                source: {kind: "template", template: respTemplate, pace: "rr"},
                showVital: "rr",
                yMin: minOf(respTemplate),
                yMax: maxOf(respTemplate)
            },
        ] as RowDef[];
    }, [mode, csvData, palette, ecgTemplate, plethTemplate, respTemplate]);

    // Sweep renderer
    const channels = useMemo(() => rows.map(r => ({key: r.key, ref: getCanvasRef(r.key), color: r.color, source: r.source})), [rows]);
    const rendererOpts: SweepRendererOptions = useMemo(() => ({
        channels,
        showSeconds,
        initialized,
        vitalsRef,
        heartbeatRef, ...(mode === "csv" ? {externalTimeSec: csvElapsedSec} : {}),
        onValue: onValueCb,
        timeEpochMs: csvStartMs
    }), [channels, showSeconds, initialized, vitalsRef, heartbeatRef, mode, csvElapsedSec, onValueCb, csvStartMs]);
    useSweepRenderer(rendererOpts);

    // Alarm loop
    useEffect(() => {
        const countersRef: { current: AlarmCounters } = {current: defaultCounters};
        const check = setInterval(() => {
            // Select vitals source
            let vForAlarms: Vitals;
            if (mode === "csv") {
                if (vitalsCsv) {
                    const elapsed = csvStartMs == null ? 0 : (performance.now() - csvStartMs) / 1000;
                    const cur = pickVitalsAtTime(vitalsCsv, elapsed);
                    const asNumOrUnknown = (x: number | null | undefined): number | "-?-" => (x == null || !Number.isFinite(x)) ? "-?-" : x;
                    vForAlarms = {
                        hr: asNumOrUnknown(cur.hr),
                        spo2: asNumOrUnknown(cur.spo2),
                        rr: asNumOrUnknown(cur.rr),
                        bp: {sys: asNumOrUnknown(cur.bpSys), dia: asNumOrUnknown(cur.bpDia)}
                    };
                } else {
                    vForAlarms = {hr: "-?-", spo2: "-?-", rr: "-?-", bp: {sys: "-?-", dia: "-?-"}};
                }
            } else {
                vForAlarms = vitalsRef.current as Vitals;
            }

            const evald = checkAlarms(vForAlarms, countersRef.current);
            countersRef.current = evald.counters;

            // Announce alerts (advisory/low play once)
            if (evald.alerts.length) {
                if (soundOn && !silenced) {
                    for (const a of evald.alerts) {
                        if (a.level === "low") alertSound.playAlert("low");
                        if (a.level === "advisory") alertSound.playAlert("advisory");
                    }
                }
                setAlerts(prev => [...evald.alerts, ...prev].slice(0, 50));
            }

            // Persistent critical states
            const c = countersRef.current;
            const active = {
                hrHigh: c.hrHigh >= thresholds.hr.persistence,
                hrLow: c.hrLow >= thresholds.hr.persistence,
                spo2Low: c.spo2Low >= thresholds.spo2.persistence,
                bpLow: c.bpLow >= thresholds.bp.persistence,
            } as const;
            const hrLevel: "critical" | null = (active.hrHigh || active.hrLow) ? "critical" : null;
            const spo2Level: "critical" | null = active.spo2Low ? "critical" : null;
            const bpLevel: "critical" | null = active.bpLow ? "critical" : null;

            setVitalAlarmLevel(prev => ({
                hr: prev.hr === "advisory" ? "advisory" : hrLevel,
                spo2: prev.spo2 === "advisory" ? "advisory" : spo2Level,
                rr: null,
                bp: prev.bp === "advisory" ? "advisory" : bpLevel,
            }));

            // One-shot advisory flash
            if (evald.alerts.length) {
                for (const a of evald.alerts) {
                    if (a.level !== "advisory") continue;
                    const vital = inferVitalFromMsg(a.msg);
                    if (!vital) continue;
                    setVitalAlarmLevel(prev => {
                        if (vital === "bp") {
                            return prev.bp === "critical" ? prev : {...prev, bp: "advisory"};
                        } else {
                            const cur = prev[vital];
                            return cur === "critical" ? prev : ({...prev, [vital]: "advisory"} as typeof prev);
                        }
                    });
                    window.setTimeout(() => {
                        setVitalAlarmLevel(prev => {
                            if (vital === "bp") {
                                return prev.bp === "advisory" ? {...prev, bp: null} : prev;
                            } else {
                                return prev[vital] === "advisory" ? ({...prev, [vital]: null} as typeof prev) : prev;
                            }
                        });
                    }, 1200);
                }
            }

            // Looping tone control (critical only)
            const anyCritical = (hrLevel === "critical" || spo2Level === "critical" || bpLevel === "critical");
            if (!anyCritical && silenced) setSilenced(false);
            if (soundOn && anyCritical && !silenced) {
                if (!loopingRef.current.active || loopingRef.current.level !== "critical") {
                    alertSound.startLooping("critical");
                    loopingRef.current = {active: true, level: "critical"};
                }
            } else {
                if (loopingRef.current.active) {
                    alertSound.stopLooping();
                    loopingRef.current = {active: false, level: null};
                }
            }
        }, 1000);
        return () => clearInterval(check);
    }, [soundOn, silenced, mode, vitalsCsv, csvStartMs]);

    // Init delay
    useEffect(() => {
        const ready = setTimeout(() => setInitialized(true), 1000);
        return () => clearTimeout(ready);
    }, []);

    // Displayed numerics
    const disp = useMemo(() => {
        if (mode === "csv") {
            if (vitalsCsv) {
                const cur = pickVitalsAtTime(vitalsCsv, csvElapsedSec);
                const fmt = (x: number | null | undefined, digits = 0) => (x == null || !Number.isFinite(x)) ? "-?-" : Number(x.toFixed(digits));
                return {
                    hr: fmt(cur.hr),
                    spo2: fmt(cur.spo2),
                    rr: fmt(cur.rr),
                    bpSys: fmt(cur.bpSys),
                    bpDia: fmt(cur.bpDia),
                    pulse: fmt(cur.pulse)
                } as const;
            }
            return {hr: "-?-", spo2: "-?-", rr: "-?-", bpSys: "-?-", bpDia: "-?-", pulse: "-?-"} as const;
        }
        return {
            hr: (!initialized) ? "-?-" : vitals.hr,
            spo2: (!initialized) ? "-?-" : vitals.spo2,
            rr: (!initialized) ? "-?-" : vitals.rr,
            bpSys: (!initialized) ? "-?-" : vitals.bp.sys,
            bpDia: (!initialized) ? "-?-" : vitals.bp.dia,
            pulse: "-?-" // demo: do not display pulse
        } as const;
    }, [mode, vitalsCsv, csvElapsedSec, initialized, vitals]);

    // Dynamic additional vitals (including NIBP and others)
    const additionalVitals: Array<{
        key: string;
        label: string;
        value: string;
        color: string;
        alarmLevel?: "low" | "advisory" | "critical" | null
    }> = useMemo(() => {
        const vitals: Array<{ key: string; label: string; value: string; color: string; alarmLevel?: "low" | "advisory" | "critical" | null }> = [];

        // Always include NIBP if we have bp data
        if (disp.bpSys !== "-?-" && disp.bpDia !== "-?-") {
            vitals.push({
                key: "nibp",
                label: "NIBP",
                value: `${disp.bpSys}/${disp.bpDia}`,
                color: palette.bp,
                alarmLevel: vitalAlarmLevel.bp || null
            });
        }

        // Add other CSV vitals if in CSV mode
        if (mode === "csv" && vitalsCsv) {
            const cur = pickVitalsAtTime(vitalsCsv, csvElapsedSec);
            const used = new Set<string>(["HR", "%SpO2", "SpO2", "RESP", "RR", "NBP SYS", "NBP DIAS", "NIBP SYS", "NIBP DIAS", "PULSE", "PR", "Pulse Rate"]);
            for (const c of vitalsCsv.columns) {
                if (used.has(c.name)) continue;
                const v = cur.extra.get(c.name);
                if (v == null || !Number.isFinite(v)) continue;
                vitals.push({
                    key: c.name.toLowerCase().replace(/\s+/g, "_"),
                    label: c.name,
                    value: String(Number(v.toFixed(1))),
                    color: palette.defaultText
                });
            }
        }

        return vitals.slice(0, 8); // Limit total additional vitals
    }, [mode, vitalsCsv, csvElapsedSec, disp, palette, vitalAlarmLevel.bp]);

    return (
        <div className="super-icu">
            <div className="super-icu-core">
                {/* TOP BAR */}
                <div className="top-bar">
                    SuperICU DEMO
                    <span className="status-pill">{timeStr}</span>
                    <span className="status-pill">Alarms: {silenced ? "Silenced" : "On"}</span>
                    <span className="status-pill" style={{cursor: "pointer"}}
                          onClick={async () => {
                              if (!soundOn) await alertSound.kickstart();
                              setSoundOn(v => !v);
                          }}>
                        Sound: {soundOn ? "On" : "Off"}
                    </span>
                    <span className="status-pill" style={{cursor: "pointer"}} onClick={async () => {
                        if (!heartbeatSound) await alertSound.kickstart();
                        setHeartbeatSound(v => !v);
                    }}>
                        HR sound: {heartbeatSound ? "On" : "Off"}
                    </span>
                    <span className="status-pill" style={{cursor: "pointer"}} onClick={() => {
                        setAlerts([]);
                        setSilenced(true);
                        alertSound.stopLooping();
                    }}>
                        Clear Alerts
                    </span>
                    <div className="window-ctl" style={{marginLeft: "auto"}}>
                        <span className="muted">Window</span>
                        <select className="window-select" value={showSeconds} onChange={(e) =>
                            setShowSeconds(parseInt(e.target.value, 10))}>
                            {CFG.WINDOW_CHOICES.map(s => <option key={s} value={s}>{s}s</option>)}
                        </select>
                    </div>
                </div>

                {/* ROWS */}
                {rows.map((r) => (
                    <div key={r.key} className={`wave-row ${r.className ?? ""}`}>
                        {/* LABEL */}
                        <div className="lead-label" style={{color: r.color}}>
                            {r.label}
                            <div style={{fontSize: 12, opacity: 0.9, color: r.color, lineHeight: 1.2}}>
                                {formatWaveVal(waveformVals, r.key, mode)}
                            </div>
                            <div style={{fontSize: 10, opacity: 0.8, color: "#9fb2c8", lineHeight: 1.2}}>
                                <div>min {fmt9(r.yMin)}</div>
                                <div>max {fmt9(r.yMax)}</div>
                            </div>
                        </div>
                        <div className="canvas-wrap">
                            <canvas ref={getCanvasRef(r.key)} />
                        </div>

                        {/* WAVEFORM */}
                        {r.showVital && (<div className="vitals">
                            <div className={`vital ${r.showVital}`}>
                                <div className="label">{r.showVital.toUpperCase()}</div>
                                <div className={`value ${vitalAlarmLevel[r.showVital] ? `alarm-${vitalAlarmLevel[r.showVital]}` : ""}`}
                                     style={withVar({color: colorForVital(r.showVital, palette)}, {"--vital-color": colorForVital(r.showVital, palette) as string})}>
                                    {disp[r.showVital]}
                                    <span style={{fontSize: 14, marginLeft: r.showVital === "rr" ? 4 : 0}}>
                                            {disp[r.showVital] === "-?-" ? "" : unitForVital(r.showVital)}
                                        </span>
                                </div>
                            </div>

                            {/* VITALS */}
                            {r.showVital === "hr" && mode === "csv" && hasCsvPulse && (<div className="vital pulse">
                                <div className="label">PULSE</div>
                                <div className="value"
                                     style={withVar({color: colorForVital("pulse", palette)}, {"--vital-color": colorForVital("pulse", palette) as string})}>
                                    {disp.pulse}
                                    <span style={{fontSize: 14}}> {disp.pulse === "-?-" ? "" : unitForVital("pulse")}</span>
                                </div>
                            </div>)}
                        </div>)}
                    </div>
                ))}

                {/* ROWS VITALS */}
                {additionalVitals.length > 0 && (<div className="data-row">
                    <div className="vitals">
                        {additionalVitals.map(vital => (
                            <div key={vital.key} className="vital">
                                <div className="label" style={{color: vital.color}}>{vital.label}</div>
                                <div className={`value ${vital.alarmLevel ? `alarm-${vital.alarmLevel}` : ""}`}
                                     style={withVar({color: vital.color}, {"--vital-color": vital.color as string})}>
                                    {vital.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>)}

                <div className="data-row">
                    <div className="vitals">
                        {mode !== "csv" && (<div className="vital">
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
                        </div>)}

                        <div className="vital">
                            <div className="label" style={{color: palette.defaultText}}>Waveform CSV</div>
                            <div className="value"
                                 style={{color: palette.defaultText, display: "flex", alignItems: "center", gap: 6, fontSize: 14, flexWrap: "wrap"}}>
                                <input type="file" accept=".csv,text/csv" style={inputStyle} onChange={e => {
                                    const f = e.target.files?.[0];
                                    if (f) handleCsvFile(f);
                                    e.currentTarget.value = "";
                                }} />
                                <button style={{...inputStyle, cursor: "pointer"}} onClick={() => {
                                    setMode("demo");
                                    setCsvData(null);
                                    setVitalsCsv(null);
                                    setCsvStartMs(null);
                                }}>Use Demo
                                </button>
                                {mode === "csv" && csvData && (
                                    <span style={{opacity: 0.8}}>Loaded {csvData.columns.length} lead(s) @ {csvData.sampleHz} Hz</span>)}
                            </div>
                        </div>

                        <div className="vital">
                            <div className="label" style={{color: palette.defaultText}}>Vitals CSV</div>
                            <div className="value"
                                 style={{color: palette.defaultText, display: "flex", alignItems: "center", gap: 6, fontSize: 14, flexWrap: "wrap"}}>
                                <input type="file" accept=".csv,text/csv" style={inputStyle} onChange={e => {
                                    const f = e.target.files?.[0];
                                    if (f) handleVitalsCsvFile(f);
                                    e.currentTarget.value = "";
                                }} />
                                {vitalsCsv && (<span style={{opacity: 0.8}}>Loaded {vitalsCsv.columns.length} vital(s)</span>)}
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

    // helpers inside component (file APIs need state setters)
    function handleCsvFile(file: File) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const text = String(reader.result || "");
                const parsed = parseCsv(text);
                setCsvData(parsed);
                setMode("csv");
                setCsvStartMs(performance.now());
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
                const parsed = parseVitalsCsv(text);
                setVitalsCsv(parsed);
                setMode("csv");
                setCsvStartMs(performance.now());
            } catch (e) {
                console.error("Vitals CSV parse error", e);
                alert("Failed to parse Vitals CSV. Check console for details.");
            }
        };
        reader.readAsText(file);
    }
}
