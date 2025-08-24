import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import "./SuperICU.scss";
import type {AlertItem, Vitals} from "./sim";
import {useDemoVitals, useWaveTemplates} from "./sim";
import type {AlarmCounters} from "./alarms";
import {checkAlarms, defaultCounters, thresholds} from "./alarms";
import {alertSound} from "./sound";
import type {SweepRendererOptions} from "./useSweepRenderer";
import {CsvSource, TemplateSource, useSweepRenderer} from "./useSweepRenderer";

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
type ParsedVitalsCsv = { times?: number[]; columns: { name: string; values: number[] }[] };

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

    // Live waveform values (renderer callback -> throttled state)
    const waveformValsRef = useRef(new Map<string, { val: number | null; raw: number | null }>());
    const [waveformVals, setWaveformVals] = useState<Map<string, { val: number | null; raw: number | null }>>(new Map());
    const onValueCb = useCallback((key: string, val: number | null, raw?: number | null) => {
        waveformValsRef.current.set(key, {val, raw: typeof raw === "number" || raw === null ? raw : val});
    }, []);
    useEffect(() => {
        const t = setInterval(() => setWaveformVals(new Map(waveformValsRef.current)), 150);
        return () => clearInterval(t);
    }, []);

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
        onValue: onValueCb
    }), [channels, showSeconds, initialized, vitalsRef, heartbeatRef, mode, csvElapsedSec, onValueCb]);
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
                        const isCritical = (prev[vital] === "critical");
                        const next = {...prev} as any;
                        if (!isCritical) next[vital] = "advisory";
                        return next;
                    });
                    window.setTimeout(() => {
                        setVitalAlarmLevel(prev => {
                            if (prev[vital] === "advisory") {
                                const next = {...prev} as any;
                                next[vital] = null;
                                return next;
                            }
                            return prev;
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
                return {hr: fmt(cur.hr), spo2: fmt(cur.spo2), rr: fmt(cur.rr), bpSys: fmt(cur.bpSys), bpDia: fmt(cur.bpDia)} as const;
            }
            return {hr: "-?-", spo2: "-?-", rr: "-?-", bpSys: "-?-", bpDia: "-?-"} as const;
        }
        return {
            hr: (!initialized) ? "-?-" : vitals.hr,
            spo2: (!initialized) ? "-?-" : vitals.spo2,
            rr: (!initialized) ? "-?-" : vitals.rr,
            bpSys: (!initialized) ? "-?-" : vitals.bp.sys,
            bpDia: (!initialized) ? "-?-" : vitals.bp.dia
        } as const;
    }, [mode, vitalsCsv, csvElapsedSec, initialized, vitals]);

    // Other CSV vitals
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
                    <span className="status-pill" style={{cursor: "pointer"}} onClick={async () => {
                        if (!soundOn) await alertSound.kickstart();
                        setSoundOn(v => !v);
                    }}>Sound: {soundOn ? "On" : "Off"}</span>
                    <span className="status-pill" style={{cursor: "pointer"}} onClick={async () => {
                        if (!heartbeatSound) await alertSound.kickstart();
                        setHeartbeatSound(v => !v);
                    }}>Pulse sound: {heartbeatSound ? "On" : "Off"}</span>
                    <span className="status-pill" style={{cursor: "pointer"}} onClick={() => {
                        setAlerts([]);
                        setSilenced(true);
                        alertSound.stopLooping();
                    }}>Clear Alerts</span>
                    <div className="window-ctl" style={{marginLeft: "auto"}}>
                        <span className="muted">Window</span>
                        <select className="window-select" value={showSeconds}
                                onChange={e => setShowSeconds(parseInt(e.target.value, 10))}>{CFG.WINDOW_CHOICES.map(s => <option key={s}
                                                                                                                                  value={s}>{s}s</option>)}</select>
                    </div>
                </div>

                {rows.map(r => (
                    <div key={r.key} className={`wave-row ${r.className ?? ""}`}>
                        <div className="lead-label" style={{color: r.color}}>
                            {r.label}
                            <div
                                style={{fontSize: 12, opacity: 0.9, color: r.color, lineHeight: 1.2}}>{formatWaveVal(waveformVals, r.key, mode)}</div>
                            <div style={{fontSize: 10, opacity: 0.8, color: "#9fb2c8", lineHeight: 1.2}}>
                                <div>min {fmt9(r.yMin)}</div>
                                <div>max {fmt9(r.yMax)}</div>
                            </div>
                        </div>
                        <div className="canvas-wrap">
                            <canvas ref={getCanvasRef(r.key)} />
                        </div>
                        {r.showVital && (
                            <div className="vitals">
                                <div className={`vital ${r.showVital}`}>
                                    <div className="label">{r.showVital.toUpperCase()}</div>
                                    <div className={`value ${vitalAlarmLevel[r.showVital] ? `alarm-${vitalAlarmLevel[r.showVital]}` : ""}`}
                                         style={withVar({color: colorForVital(r.showVital, palette)}, {"--vital-color": colorForVital(r.showVital, palette) as string})}>
                                        {disp[r.showVital]}
                                        <span style={{
                                            fontSize: 14,
                                            marginLeft: r.showVital === "rr" ? 4 : 0
                                        }}>{disp[r.showVital] === "-?-" ? "" : unitForVital(r.showVital)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                <div className="data-row">
                    <div className="vitals">
                        <div className="vital">
                            <div className="label" style={{color: palette.bp}}>NIBP</div>
                            <div className={`value ${vitalAlarmLevel.bp ? `alarm-${vitalAlarmLevel.bp}` : ""}`}
                                 style={withVar({color: palette.bp}, {"--vital-color": palette.bp as string})}>{disp.bpSys}/{disp.bpDia}</div>
                        </div>
                    </div>
                </div>

                <div className="data-row">
                    <div className="vitals">
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

function randomId() {
    try {
        // @ts-ignore
        const b = (crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(8)) : null;
        if (b) return Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("");
    } catch {
    }
    return Math.random().toString(36).slice(2);
}

function mapLeadName(raw: string, palette: Palette): { label: string; color: string; className?: string } {
    const norm = raw.trim();
    const lc = norm.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (lc.includes("pleth") || lc.includes("spo2") || lc.includes("spo")) return {label: "Pleth", color: palette.pleth, className: "pleth"};
    if (lc.includes("resp") || lc.includes("respiration") || lc.includes("rr")) return {label: "RESP", color: palette.resp, className: "resp"};
    if (lc === "i" || lc === "ii" || lc === "iii" || lc.startsWith("lead") || lc.includes("ecg")) {
        const upper = norm.toUpperCase();
        return {label: upper.startsWith("LEAD") ? upper : `Lead ${upper}`, color: palette.ecg, className: "ecg"};
    }
    if (lc === "avr" || lc === "avl" || lc === "avf") return {label: norm.toUpperCase(), color: palette.ecg, className: "ecg"};
    if (/^v[1-6]$/.test(lc)) return {label: norm.toUpperCase(), color: palette.ecg, className: "ecg"};
    return {label: norm, color: palette.defaultText};
}

function inferVitalFromMsg(msg: string): "hr" | "spo2" | "bp" | null {
    const m = msg.toLowerCase();
    if (m.includes("spo2") || m.includes("spo")) return "spo2";
    if (m.includes("nibp") || m.includes("bp ") || m.includes("blood pressure")) return "bp";
    if (m.includes("hr") || m.includes("tachy") || m.includes("brady")) return "hr";
    return null;
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

// CSV waveform parser
function parseCsv(text: string): { sampleHz: number; columns: { name: string; values: Float32Array; yMin: number; yMax: number }[] } {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) throw new Error("Empty CSV");
    const delim = detectDelim(lines[0] ?? ",");
    const headerCells = (lines[0] ?? "").split(delim).map(s => s.trim());
    const rows = lines.slice(1).map(line => line.split(delim));
    const colCount = rows[0]?.length ?? headerCells.length;
    if (colCount < 2) throw new Error("Expected time + at least one data column");
    const time: number[] = rows.map(r => parseFloat((r[0] ?? "").trim()));
    const deltas: number[] = [];
    for (let i = 1; i < time.length; i++) {
        const d = (time[i] ?? NaN) - (time[i - 1] ?? NaN);
        if (Number.isFinite(d) && d > 0) deltas.push(d);
    }
    const median = deltas.sort((a, b) => a - b)[Math.floor(deltas.length / 2)] ?? 0;
    const sampleHz = median > 10 ? Math.max(1, Math.round(1000 / median)) : Math.max(1, Math.round(1 / median));
    const columns: { name: string; values: Float32Array; yMin: number; yMax: number }[] = [];
    for (let i = 1; i < (rows[0]?.length ?? headerCells.length); i++) {
        const name = headerCells[i] ?? `ch${i + 1}`;
        const vals = rows.map(r => {
            const n = parseFloat((r[i] ?? "").trim());
            return Number.isFinite(n) ? n : NaN;
        });
        let min = Infinity, max = -Infinity;
        for (const v of vals) if (Number.isFinite(v)) {
            if (v < min) min = v;
            if (v > max) max = v;
        }
        if (min === Infinity || max === -Infinity) {
            min = 0;
            max = 1;
        }
        columns.push({name, values: new Float32Array(vals), yMin: min, yMax: max});
    }
    return {sampleHz, columns};
}

function detectDelim(headerLine?: string): string {
    const h = headerLine ?? ",";
    if (h.includes(",")) return ",";
    if (h.includes("\t")) return "\t";
    if (h.includes(";")) return ";";
    return ",";
}

// Vitals CSV parser
function parseVitalsCsv(text: string): ParsedVitalsCsv {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) throw new Error("Empty CSV");
    const delim = detectDelim(lines[0] ?? ",");
    const headerCells = (lines[0] ?? "").split(delim).map(s => s.trim());
    const rows = lines.slice(1).map(line => line.split(delim));
    const colCount = rows[0]?.length ?? headerCells.length;
    const names: string[] = headerCells;
    const cols: number[][] = Array.from({length: colCount}, () => []);
    for (const r of rows) for (let i = 0; i < colCount; i++) {
        const num = parseFloat((r[i] ?? "").trim());
        (cols[i] ?? (cols[i] = [])).push(num);
    }
    const times = (cols[0] ?? []).map(v => Number.isFinite(v) ? Number(v) : 0);
    const columns: { name: string; values: number[] }[] = [];
    for (let i = 1; i < colCount; i++) columns.push({name: names[i] ?? `c${i + 1}`, values: cols[i] ?? []});
    return {times, columns};
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
        if (typeof val === "number" && Number.isFinite(val)) extra.set(c.name, val);
    }
    return {hr, spo2, rr, bpSys, bpDia, extra};
}

function findCol(cols: { name: string; values: number[] }[], label: string | RegExp) {
    const f = (name: string) => typeof label === "string" ? name === label : label.test(name);
    return cols.find(c => f(c.name));
}

function pickRowIndex(times: number[] | undefined, elapsedSec: number) {
    if (!times || times.length === 0) return 0;
    const t0 = times[0] ?? 0;
    const tLast = times[times.length - 1] ?? t0;
    const duration = Math.max(0, tLast - t0);
    if (duration <= 0) return Math.min(Math.floor(Math.max(0, elapsedSec)) % times.length, times.length - 1);
    const tAbs = t0 + (((elapsedSec % duration) + duration) % duration);
    let lo = 0, hi = times.length - 1;
    while (lo < hi) {
        const mid = Math.floor((lo + hi + 1) / 2);
        if ((times[mid] ?? 0) <= tAbs) lo = mid; else hi = mid - 1;
    }
    return lo;
}

function minOf(arr: ArrayLike<number>) {
    let m = Infinity;
    for (let i = 0; i < arr.length; i++) {
        const v = arr[i] as number;
        if (Number.isFinite(v) && v < m) m = v;
    }
    return m === Infinity ? NaN : m;
}

function maxOf(arr: ArrayLike<number>) {
    let m = -Infinity;
    for (let i = 0; i < arr.length; i++) {
        const v = arr[i] as number;
        if (Number.isFinite(v) && v > m) m = v;
    }
    return m === -Infinity ? NaN : m;
}

function fmt9(x?: number) {
    return (typeof x === "number" && Number.isFinite(x)) ? x.toFixed(9) : "–";
}

function fmt3(x?: number | null) {
    if (x == null || !Number.isFinite(x)) return "–";
    const ax = Math.abs(x);
    if (ax >= 1000) return x.toFixed(0);
    if (ax >= 100) return x.toFixed(1);
    if (ax >= 10) return x.toFixed(2);
    return x.toFixed(3);
}

function formatWaveVal(map: Map<string, { val: number | null; raw: number | null }>, key: string, mode: "demo" | "csv") {
    const rec = map.get(key);
    if (!rec) return "–-";
    const value = mode === "csv" ? (rec.raw ?? rec.val) : rec.val;
    return fmt3(value);
}
