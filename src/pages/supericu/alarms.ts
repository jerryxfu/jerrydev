import type {AlertItem, AlarmLevel, Vitals} from "./sim";
import {randomId} from "./helpers";

export type AlarmCounters = {
    hrHigh: number;
    hrLow: number;
    hrWarn: number;      // latch for hr advisory band
    spo2Low: number;
    spo2Warn: number;    // latch for spo2 advisory band
    bpLow: number;   // hypotension
    bpHigh: number;  // hypertension
};

export const defaultCounters: AlarmCounters = {
    hrHigh: 0,
    hrLow: 0,
    hrWarn: 0,
    spo2Low: 0,
    spo2Warn: 0,
    bpLow: 0,
    bpHigh: 0,
};

// thresholds and grace periods
export const thresholds = {
    hr: {high: 130, low: 50, warnHigh: 120, warnLow: 55, persistence: 2},
    spo2: {low: 89, warn: 92, persistence: 2},
    bp: {lowSys: 80, lowDia: 50, highSys: 160, highDia: 100, persistence: 2},
} as const;

// Coerce a vital that may be "-?-" to a number (NaN if unavailable)
function toNum(x: number | "-?-"): number {
    return typeof x === "number" ? x : Number.NaN;
}

export function checkAlarms(v: Vitals, counters: AlarmCounters): { alerts: AlertItem[]; counters: AlarmCounters } {
    const now = new Date().toLocaleTimeString();
    const next: AlarmCounters = {...counters};
    const alerts: AlertItem[] = [];

    const hr = toNum(v.hr);
    const spo2 = toNum(v.spo2);
    const sys = toNum(v.bp.sys);
    const dia = toNum(v.bp.dia);

    // HR critical
    if (hr > thresholds.hr.high) next.hrHigh++; else next.hrHigh = 0;
    if (hr < thresholds.hr.low) next.hrLow++; else next.hrLow = 0;
    if (next.hrHigh === thresholds.hr.persistence) alerts.push(mkAlert("critical", now, `Tachycardia HR ${hr} bpm`));
    if (next.hrLow === thresholds.hr.persistence) alerts.push(mkAlert("critical", now, `Bradycardia HR ${hr} bpm`));

    // HR warning band (one-shot on entry)
    const inHrWarn = (!Number.isNaN(hr)) && ((hr >= thresholds.hr.warnHigh && hr < thresholds.hr.high) || (hr <= thresholds.hr.warnLow && hr > thresholds.hr.low));
    if (inHrWarn) {
        if (next.hrWarn === 0) alerts.push(mkAlert("warning", now, `HR warning ${hr} bpm`));
        next.hrWarn = 1; // latch while in band
    } else {
        next.hrWarn = 0; // re-arm when leaving
    }

    // SpO2
    if (spo2 < thresholds.spo2.low) {
        // Critical low path
        next.spo2Low++;
        next.spo2Warn = 0; // reset warn latch when in critical
    } else if (spo2 < thresholds.spo2.warn) {
        // Warning band: fire once on entry
        next.spo2Low = Math.max(next.spo2Low - 1, 0);
        if (next.spo2Warn === 0 && !Number.isNaN(spo2)) {
            alerts.push(mkAlert("warning", now, `SpO₂ warning ${spo2}%`));
        }
        next.spo2Warn = 1; // latch while in warn band
    } else {
        // Normal
        next.spo2Low = 0;
        next.spo2Warn = 0; // re-arm warn when leaving band
    }
    if (next.spo2Low === thresholds.spo2.persistence) alerts.push(mkAlert("critical", now, `Hypoxemia SpO₂ ${spo2}%`));

    // NIBP
    if (sys < thresholds.bp.lowSys || dia < thresholds.bp.lowDia) {
        next.bpLow++;
    } else {
        next.bpLow = 0;
    }
    if (sys > thresholds.bp.highSys || dia > thresholds.bp.highDia) {
        next.bpHigh++;
    } else {
        next.bpHigh = 0;
    }
    if (next.bpLow === thresholds.bp.persistence) alerts.push(mkAlert("critical", now, `Hypotension NIBP ${sys}/${dia} mmHg`));
    if (next.bpHigh === thresholds.bp.persistence) alerts.push(mkAlert("warning", now, `Hypertension NIBP ${sys}/${dia} mmHg`));

    return {alerts, counters: next};
}

function mkAlert(level: AlarmLevel, time: string, msg: string): AlertItem {
    return {id: randomId(), level, time, msg};
}

export function computeActiveAlarmLevels(counters: AlarmCounters): { hr: AlarmLevel | null; spo2: AlarmLevel | null; bp: AlarmLevel | null } {
    // Critical conditions (must meet persistence count)
    const hrCritical = counters.hrHigh >= thresholds.hr.persistence || counters.hrLow >= thresholds.hr.persistence;
    const spo2Critical = counters.spo2Low >= thresholds.spo2.persistence;
    const bpCritical = counters.bpLow >= thresholds.bp.persistence;

    // Warning conditions (only if not already critical)
    const hrWarning = !hrCritical && counters.hrWarn > 0; // hrWarn is a latch while in advisory band
    const spo2Warning = !spo2Critical && counters.spo2Warn > 0; // spo2Warn latch
    const bpWarning = !bpCritical && counters.bpHigh >= thresholds.bp.persistence; // hypertension persistence

    return {
        hr: hrCritical ? "critical" : (hrWarning ? "warning" : null),
        spo2: spo2Critical ? "critical" : (spo2Warning ? "warning" : null),
        bp: bpCritical ? "critical" : (bpWarning ? "warning" : null),
    };
}
