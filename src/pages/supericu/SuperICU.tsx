import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import "./SuperICU.scss";
import type {AlertItem, Vitals} from "./sim";
import {useDemoVitals, useWaveTemplates} from "./sim";
import type {AlarmCounters} from "./alarms";
import {checkAlarms, defaultCounters, computeActiveAlarmLevels} from "./alarms";
import {alertSound} from "./sound";
import type {SweepRendererOptions} from "./useSweepRenderer";
import {useSweepRenderer} from "./useSweepRenderer";
import {
    randomId,
    colorForVital,
    unitForVital,
    parseCsv,
    parseVitalsCsv,
    type ParsedVitalsCsv,
    pickVitalsAtTime,
    formatWaveVal,
} from "./helpers";
import {hasPulseColumn, toAdditionalVitals, toDisplayVitals, toRows} from "./selectors";
import {CFG, DEFAULT_PALETTE} from "./types";
import type {AdditionalVital, AlarmLevelOrNull, CsvWaveData, DisplayVitals, FlashMode, Palette, RowDef} from "./types";

export type {Palette, FlashMode};

type Mode = "demo" | "csv";
type VitalAlarmLevel = {
    hr: AlarmLevelOrNull;
    spo2: AlarmLevelOrNull;
    rr: AlarmLevelOrNull;
    bp?: AlarmLevelOrNull;
};

const INPUT_STYLE: React.CSSProperties = {
    background: "#01060a",
    color: "inherit",
    border: "1px solid var(--ui-border)",
    borderRadius: 4,
    padding: "2px 4px",
    fontSize: 12,
};

const CONTROL_VALUE_STYLE: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 14,
    flexWrap: "wrap",
};

export default function SuperIcu({paletteOverrides, flashMode = "auto"}: {
    paletteOverrides?: Partial<Palette>;
    flashMode?: FlashMode;
} = {}) {
    const palette = useMemo(() => ({...DEFAULT_PALETTE, ...(paletteOverrides || {})}), [paletteOverrides]);
    const flashClass = useCallback((level: AlarmLevelOrNull) => {
        if (!level) return "";
        if (flashMode === "auto") {
            if (level === "critical") return "flash-red-block-critical";
            if (level === "warning") return "flash-yellow-block-critical";
            return "flash-invert-advisory";
        }
        return `flash-${flashMode}-${level}`;
    }, [flashMode]);

    const [soundOn, setSoundOn] = useState(false);
    const [silenced, setSilenced] = useState(false);
    const [heartbeatSound, setHeartbeatSound] = useState(false);

    useEffect(() => {
        alertSound.setEnabled(soundOn || heartbeatSound);
        if (!soundOn) alertSound.stopLooping();
    }, [soundOn, heartbeatSound]);

    const {vitals, correctVital} = useDemoVitals();
    const vitalsRef = useLatestRef(vitals);
    const heartbeatRef = useLatestRef(heartbeatSound);

    const [initialized, setInitialized] = useState(false);
    useEffect(() => {
        const ready = setTimeout(() => setInitialized(true), 1000);
        return () => clearTimeout(ready);
    }, []);

    const [alerts, setAlerts] = useState<AlertItem[]>([
        {id: randomId(), time: new Date().toLocaleTimeString(), level: "advisory", msg: "Monitoring started"},
    ]);
    const [vitalAlarmLevel, setVitalAlarmLevel] = useState<VitalAlarmLevel>({hr: null, spo2: null, rr: null});

    const [timeStr, setTimeStr] = useState<string>(new Date().toLocaleTimeString());
    useEffect(() => {
        const timer = setInterval(() => setTimeStr(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(timer);
    }, []);

    const [showSeconds, setShowSeconds] = useState<number>(CFG.DEFAULT_SHOW_SECONDS);

    const [mode, setMode] = useState<Mode>("demo");
    const [csvData, setCsvData] = useState<CsvWaveData | null>(null);
    const [vitalsCsv, setVitalsCsv] = useState<ParsedVitalsCsv | null>(null);
    const [csvStartMs, setCsvStartMs] = useState<number | null>(null);

    useEffect(() => {
        if (mode !== "csv") {
            setCsvStartMs(null);
            return;
        }
        if ((csvData || vitalsCsv) && csvStartMs == null) {
            setCsvStartMs(performance.now());
        }
    }, [mode, csvData, vitalsCsv, csvStartMs]);

    const [, setTick] = useState(0);
    const csvElapsedSec = csvStartMs == null ? 0 : (performance.now() - csvStartMs) / 1000;
    useEffect(() => {
        if (csvStartMs == null) return;
        const timer = setInterval(() => setTick(x => (x + 1) % 1000), 200);
        return () => clearInterval(timer);
    }, [csvStartMs]);

    const [waveformVals, setWaveformVals] = useState<Map<string, { val: number | null; raw: number | null }>>(new Map());
    const waveformValsRef = useRef(new Map<string, { val: number | null; raw: number | null }>());
    const onValueCb = useCallback((key: string, val: number | null, raw?: number | null) => {
        waveformValsRef.current.set(key, {val, raw: typeof raw === "number" || raw === null ? raw : val});
    }, []);
    useEffect(() => {
        const timer = setInterval(() => setWaveformVals(new Map(waveformValsRef.current)), 200);
        return () => clearInterval(timer);
    }, []);

    const {ecgTemplate, plethTemplate, respTemplate} = useWaveTemplates();

    const rows: RowDef[] = useMemo(() => toRows({
        mode,
        csvData,
        palette,
        ecgTemplate,
        plethTemplate,
        respTemplate,
    }), [mode, csvData, palette, ecgTemplate, plethTemplate, respTemplate]);

    const hasCsvPulse = useMemo(() => hasPulseColumn(vitalsCsv), [vitalsCsv]);

    const disp: DisplayVitals = useMemo(() => toDisplayVitals({
        mode,
        vitalsCsv,
        csvElapsedSec,
        initialized,
        vitals,
    }), [mode, vitalsCsv, csvElapsedSec, initialized, vitals]);

    const additionalVitals: AdditionalVital[] = useMemo(() => toAdditionalVitals({
        mode,
        vitalsCsv,
        csvElapsedSec,
        disp,
        palette,
        bpLevel: vitalAlarmLevel.bp || null,
    }), [mode, vitalsCsv, csvElapsedSec, disp, palette, vitalAlarmLevel.bp]);

    const canvasRefs = useRef(new Map<string, React.RefObject<HTMLCanvasElement | null>>());
    const getCanvasRef = useCallback((key: string) => {
        const existing = canvasRefs.current.get(key);
        if (existing) return existing;
        const created = React.createRef<HTMLCanvasElement | null>();
        canvasRefs.current.set(key, created);
        return created;
    }, []);

    const channels = useMemo(() => rows.map(r => ({key: r.key, ref: getCanvasRef(r.key), color: r.color, source: r.source})), [rows, getCanvasRef]);
    const rendererOpts: SweepRendererOptions = useMemo(() => ({
        channels,
        showSeconds,
        initialized,
        vitalsRef,
        heartbeatRef,
        ...(mode === "csv" ? {externalTimeSec: csvElapsedSec} : {}),
        onValue: onValueCb,
        timeEpochMs: csvStartMs,
    }), [channels, showSeconds, initialized, vitalsRef, heartbeatRef, mode, csvElapsedSec, onValueCb, csvStartMs]);
    useSweepRenderer(rendererOpts);

    useEffect(() => {
        const countersRef: { current: AlarmCounters } = {current: defaultCounters};
        const loopingRef: { current: { active: boolean; level: AlarmLevelOrNull } } = {current: {active: false, level: null}};

        const check = setInterval(() => {
            let vForAlarms: Vitals;
            if (mode === "csv") {
                if (vitalsCsv) {
                    const elapsed = csvStartMs == null ? 0 : (performance.now() - csvStartMs) / 1000;
                    const cur = pickVitalsAtTime(vitalsCsv, elapsed);
                    vForAlarms = {
                        hr: asNumOrUnknown(cur.hr),
                        spo2: asNumOrUnknown(cur.spo2),
                        rr: asNumOrUnknown(cur.rr),
                        bp: {sys: asNumOrUnknown(cur.bpSys), dia: asNumOrUnknown(cur.bpDia)},
                    };
                } else {
                    vForAlarms = {hr: "-?-", spo2: "-?-", rr: "-?-", bp: {sys: "-?-", dia: "-?-"}};
                }
            } else {
                vForAlarms = vitalsRef.current;
            }

            const evald = checkAlarms(vForAlarms, countersRef.current);
            countersRef.current = evald.counters;

            if (evald.alerts.length) {
                if (soundOn && !silenced) {
                    for (const a of evald.alerts) {
                        if (a.level === "advisory") alertSound.playAlert("advisory");
                    }
                }
                setAlerts(prev => [...evald.alerts, ...prev].slice(0, 50));
            }

            const activeLevels = computeActiveAlarmLevels(countersRef.current);
            setVitalAlarmLevel({
                hr: activeLevels.hr,
                spo2: activeLevels.spo2,
                rr: null,
                bp: activeLevels.bp,
            });

            const highestLevel: AlarmLevelOrNull =
                (activeLevels.hr === "critical" || activeLevels.spo2 === "critical" || activeLevels.bp === "critical")
                    ? "critical"
                    : ((activeLevels.hr === "warning" || activeLevels.spo2 === "warning" || activeLevels.bp === "warning") ? "warning" : null);

            if (!highestLevel && silenced) setSilenced(false);

            if (soundOn && highestLevel && !silenced) {
                if (!loopingRef.current.active || loopingRef.current.level !== highestLevel) {
                    alertSound.startLooping(highestLevel);
                    loopingRef.current = {active: true, level: highestLevel};
                }
            } else if (loopingRef.current.active) {
                alertSound.stopLooping();
                loopingRef.current = {active: false, level: null};
            }
        }, 1000);

        return () => {
            clearInterval(check);
            if (loopingRef.current.active) alertSound.stopLooping();
        };
    }, [soundOn, silenced, mode, vitalsCsv, csvStartMs, vitalsRef]);

    const withVar = useCallback((base: React.CSSProperties, vars: Record<string, string | number>) => ({...base, ...vars}), []);

    const onClearAlerts = useCallback(() => {
        setAlerts([]);
        setSilenced(true);
        alertSound.stopLooping();
    }, []);

    const onToggleSound = useCallback(async () => {
        if (!soundOn) await alertSound.kickstart();
        setSoundOn(v => !v);
    }, [soundOn]);

    const onToggleHrSound = useCallback(async () => {
        if (!heartbeatSound) await alertSound.kickstart();
        setHeartbeatSound(v => !v);
    }, [heartbeatSound]);

    const onUseDemo = useCallback(() => {
        setMode("demo");
        setCsvData(null);
        setVitalsCsv(null);
        setCsvStartMs(null);
    }, []);

    const onLoadWaveCsv = useCallback(async (file: File) => {
        try {
            const text = await readTextFile(file);
            const parsed = parseCsv(text);
            setCsvData(parsed);
            setMode("csv");
            setCsvStartMs(performance.now());
        } catch (e) {
            console.error("CSV parse error", e);
            alert("Failed to parse CSV. Check console for details.");
        }
    }, []);

    const onLoadVitalsCsv = useCallback(async (file: File) => {
        try {
            const text = await readTextFile(file);
            const parsed = parseVitalsCsv(text);
            setVitalsCsv(parsed);
            setMode("csv");
            setCsvStartMs(performance.now());
        } catch (e) {
            console.error("Vitals CSV parse error", e);
            alert("Failed to parse Vitals CSV. Check console for details.");
        }
    }, []);

    return (
        <div className="super-icu">
            <div className="super-icu-core">
                <div className="top-bar">
                    SuperICU 🔮
                    <span className="status-pill">{timeStr}</span>
                    <span className="status-pill">Alarms: {silenced ? "Silenced" : "On"}</span>
                    <span className="status-pill" style={{cursor: "pointer"}} onClick={onToggleSound}>
                        Sound: {soundOn ? "On" : "Off"}
                    </span>
                    <span className="status-pill" style={{cursor: "pointer"}} onClick={onToggleHrSound}>
                        HR sound: {heartbeatSound ? "On" : "Off"}
                    </span>
                    <span className="status-pill" style={{cursor: "pointer"}} onClick={onClearAlerts}>
                        Clear Alerts
                    </span>
                    <div className="window-ctl" style={{marginLeft: "auto"}}>
                        <span className="muted">Window</span>
                        <select className="window-select" value={showSeconds} onChange={(e) => setShowSeconds(parseInt(e.target.value, 10))}>
                            {CFG.WINDOW_CHOICES.map(s => <option key={s} value={s}>{s}s</option>)}
                        </select>
                    </div>
                </div>

                {rows.map((r) => (
                    <div key={r.key} className={`wave-row ${r.className ?? ""}`}>
                        <div className="lead-label" style={{color: r.color}}>
                            {r.label}
                            <div style={{fontSize: 12, opacity: 0.9, color: r.color, lineHeight: 1.2}}>
                                {formatWaveVal(waveformVals, r.key, mode)}
                            </div>
                        </div>

                        <div className="canvas-wrap">
                            <canvas ref={getCanvasRef(r.key)} />
                        </div>

                        {r.showVital && (
                            <div className="vitals">
                                <div className={`vital ${r.showVital}`}>
                                    <div className="label">{r.showVital.toUpperCase()}</div>
                                    <div
                                        className={`value ${flashClass(vitalAlarmLevel[r.showVital])}`}
                                        style={withVar({color: colorForVital(r.showVital, palette)}, {"--vital-color": colorForVital(r.showVital, palette) as string})}
                                    >
                                        {disp[r.showVital]}
                                        <span style={{fontSize: 14, marginLeft: r.showVital === "rr" ? 4 : 0}}>
                                            {disp[r.showVital] === "-?-" ? "" : unitForVital(r.showVital)}
                                        </span>
                                    </div>
                                </div>

                                {r.showVital === "hr" && mode === "csv" && hasCsvPulse && (
                                    <div className="vital pulse">
                                        <div className="label">PULSE</div>
                                        <div
                                            className="value"
                                            style={withVar({color: colorForVital("pulse", palette)}, {"--vital-color": colorForVital("pulse", palette) as string})}
                                        >
                                            {disp.pulse}
                                            <span style={{fontSize: 14}}> {disp.pulse === "-?-" ? "" : unitForVital("pulse")}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {additionalVitals.length > 0 && (
                    <div className="data-row">
                        <div className="vitals">
                            {additionalVitals.map(vital => (
                                <div key={vital.key} className="vital">
                                    <div className="label" style={{color: vital.color}}>{vital.label}</div>
                                    <div className={`value ${flashClass(vital.alarmLevel ?? null)}`}
                                         style={withVar({color: vital.color}, {"--vital-color": vital.color})}>
                                        {vital.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="data-row">
                    <div className="vitals">
                        {mode !== "csv" && (
                            <div className="vital">
                                <div className="label" style={{color: palette.defaultText}}>Set Values</div>
                                <div className="value" style={{...CONTROL_VALUE_STYLE, color: palette.defaultText}}>
                                    <input type="number" placeholder="HR" min={0} max={360} style={INPUT_STYLE}
                                           onKeyDown={(e) => commitOnEnter(e, val => correctVital({hr: val}))} />
                                    <input type="number" placeholder="SpO2" min={0} max={100} style={INPUT_STYLE}
                                           onKeyDown={(e) => commitOnEnter(e, val => correctVital({spo2: val}))} />
                                    <input type="number" placeholder="RR" min={0} max={99} style={INPUT_STYLE}
                                           onKeyDown={(e) => commitOnEnter(e, val => correctVital({rr: val}))} />
                                    <input type="number" placeholder="SYS" min={50} max={210} style={INPUT_STYLE}
                                           onKeyDown={(e) => commitOnEnter(e, val => correctVital({bpSys: val}))} />
                                    <input type="number" placeholder="DIA" min={35} max={120} style={INPUT_STYLE}
                                           onKeyDown={(e) => commitOnEnter(e, val => correctVital({bpDia: val}))} />
                                </div>
                            </div>
                        )}

                        <div className="vital">
                            <div className="label" style={{color: palette.defaultText}}>Waveform CSV</div>
                            <div className="value" style={{...CONTROL_VALUE_STYLE, color: palette.defaultText}}>
                                <input
                                    type="file"
                                    accept=".csv,text/csv"
                                    style={INPUT_STYLE}
                                    onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (f) onLoadWaveCsv(f);
                                        e.currentTarget.value = "";
                                    }}
                                />
                                <button style={{...INPUT_STYLE, cursor: "pointer"}} onClick={onUseDemo}>Use Demo</button>
                                {mode === "csv" && csvData && (
                                    <span style={{opacity: 0.8}}>Loaded {csvData.columns.length} lead(s) @ {csvData.sampleHz} Hz</span>
                                )}
                            </div>
                        </div>

                        <div className="vital">
                            <div className="label" style={{color: palette.defaultText}}>Vitals CSV</div>
                            <div className="value" style={{...CONTROL_VALUE_STYLE, color: palette.defaultText}}>
                                <input
                                    type="file"
                                    accept=".csv,text/csv"
                                    style={INPUT_STYLE}
                                    onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (f) onLoadVitalsCsv(f);
                                        e.currentTarget.value = "";
                                    }}
                                />
                                {vitalsCsv && <span style={{opacity: 0.8}}>Loaded {vitalsCsv.columns.length} vital(s)</span>}
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

function useLatestRef<T>(value: T) {
    const ref = useRef(value);
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref;
}

function commitOnEnter(e: React.KeyboardEvent<HTMLInputElement>, apply: (val: number) => void) {
    if (e.key !== "Enter") return;
    const val = parseInt((e.currentTarget.value || "").trim(), 10);
    if (Number.isFinite(val) && Math.abs(val) < 10000) {
        apply(Math.abs(val));
        e.currentTarget.value = "";
    }
}

function asNumOrUnknown(x: number | null | undefined): number | "-?-" {
    return (x == null || !Number.isFinite(x)) ? "-?-" : x;
}

function readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
        reader.readAsText(file);
    });
}
