import type {AlertItem, AlarmLevel, Vitals} from "./sim";

export type AlarmCounters = {
    hrHigh: number;
    hrLow: number;
    spo2Low: number;
    rrHigh: number;
    spo2Warn: number;
    bpLow: number;   // hypotension
    bpHigh: number;  // hypertension
};

export const defaultCounters: AlarmCounters = {
    hrHigh: 0,
    hrLow: 0,
    spo2Low: 0,
    rrHigh: 0,
    spo2Warn: 0,
    bpLow: 0,
    bpHigh: 0,
};

export const thresholds = {
    hr: {high: 120, low: 50, persistence: 3},
    spo2: {low: 90, warn: 93, persistence: 3},
    rr: {high: 24, persistence: 3},
    // New: NIBP thresholds (mmHg)
    bp: {lowSys: 90, lowDia: 50, highSys: 160, highDia: 100, persistence: 3},
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
    const rr = toNum(v.rr);
    const sys = toNum(v.bp.sys);
    const dia = toNum(v.bp.dia);

    // HR
    if (hr > thresholds.hr.high) next.hrHigh++; else next.hrHigh = 0;
    if (hr < thresholds.hr.low) next.hrLow++; else next.hrLow = 0;
    if (next.hrHigh === thresholds.hr.persistence) alerts.push(mkAlert("high", now, `Tachycardia HR ${hr} bpm`));
    if (next.hrLow === thresholds.hr.persistence) alerts.push(mkAlert("high", now, `Bradycardia HR ${hr} bpm`));

    // SpO2
    if (spo2 < thresholds.spo2.low) {
        // Critical low path
        next.spo2Low++;
        next.spo2Warn = 0; // reset warn latch when in critical
    } else if (spo2 < thresholds.spo2.warn) {
        // Warn band: fire once on entry
        next.spo2Low = Math.max(next.spo2Low - 1, 0);
        if (next.spo2Warn === 0 && !Number.isNaN(spo2)) {
            alerts.push(mkAlert("medium", now, `SpO₂ warning ${spo2}%`));
        }
        next.spo2Warn = 1; // latch while in warn band
    } else {
        // Normal
        next.spo2Low = 0;
        next.spo2Warn = 0; // re-arm warn when leaving band
    }
    if (next.spo2Low === thresholds.spo2.persistence) alerts.push(mkAlert("high", now, `Hypoxemia SpO₂ ${spo2}%`));

    // RR
    if (rr > thresholds.rr.high) next.rrHigh++; else next.rrHigh = 0;
    if (next.rrHigh === thresholds.rr.persistence) alerts.push(mkAlert("medium", now, `Tachypnea RR ${rr} rpm`));

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
    if (next.bpLow === thresholds.bp.persistence) alerts.push(mkAlert("high", now, `Hypotension NIBP ${sys}/${dia} mmHg`));
    if (next.bpHigh === thresholds.bp.persistence) alerts.push(mkAlert("medium", now, `Hypertension NIBP ${sys}/${dia} mmHg`));

    return {alerts, counters: next};
}

function mkAlert(level: AlarmLevel, time: string, msg: string): AlertItem {
    return {id: randId(), level, time, msg};
}

function randId() {
    try {
        // @ts-ignore
        const b = (crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(8)) : null;
        if (b) return Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("");
    } catch {
    }
    return Math.random().toString(36).slice(2);
}
