import type {ParsedVitalsCsv} from "./helpers";
import {mapLeadName, minOf, maxOf, pickVitalsAtTime} from "./helpers";
import type {Vitals} from "./sim";
import type {AdditionalVital, AlarmLevelOrNull, CsvWaveData, DisplayVitals, Palette, RowDef} from "./types";

export function hasPulseColumn(vitalsCsv: ParsedVitalsCsv | null) {
    if (!vitalsCsv) return false;
    const patterns = [/^pulse$/i, /^pr$/i, /pulse\s*rate/i];
    return vitalsCsv.columns.some(c => patterns.some(p => p.test(c.name)));
}

export function toRows(params: {
    mode: "demo" | "csv";
    csvData: CsvWaveData | null;
    palette: Palette;
    ecgTemplate: number[];
    plethTemplate: number[];
    respTemplate: number[];
}): RowDef[] {
    const {mode, csvData, palette, ecgTemplate, plethTemplate, respTemplate} = params;
    if (mode === "csv") {
        if (!csvData) return [];
        return csvData.columns.map(col => {
            const mapped = mapLeadName(col.name, palette);
            let showVital: RowDef["showVital"];
            if (mapped.className === "ecg") showVital = "hr";
            if (mapped.className === "pleth") showVital = "spo2";
            if (mapped.className === "resp") showVital = "rr";
            return {
                key: `csv:${col.name}`,
                label: mapped.label,
                color: mapped.color,
                source: {kind: "csv", samples: col.values, sampleHz: csvData.sampleHz, yMin: col.yMin, yMax: col.yMax},
                yMin: col.yMin,
                yMax: col.yMax,
                sampleHz: csvData.sampleHz,
                ...(mapped.className ? {className: mapped.className} : {}),
                ...(showVital ? {showVital} : {}),
            };
        });
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
            yMax: maxOf(ecgTemplate),
        },
        {
            key: "Pleth",
            label: "Pleth",
            color: palette.pleth,
            className: "pleth",
            source: {kind: "template", template: plethTemplate, pace: "hr"},
            showVital: "spo2",
            yMin: minOf(plethTemplate),
            yMax: maxOf(plethTemplate),
        },
        {
            key: "RESP",
            label: "RESP",
            color: palette.resp,
            className: "resp",
            source: {kind: "template", template: respTemplate, pace: "rr"},
            showVital: "rr",
            yMin: minOf(respTemplate),
            yMax: maxOf(respTemplate),
        },
    ];
}

export function toDisplayVitals(params: {
    mode: "demo" | "csv";
    vitalsCsv: ParsedVitalsCsv | null;
    csvElapsedSec: number;
    initialized: boolean;
    vitals: Vitals;
}): DisplayVitals {
    const {mode, vitalsCsv, csvElapsedSec, initialized, vitals} = params;
    if (mode === "csv") {
        if (!vitalsCsv) return {hr: "-?-", spo2: "-?-", rr: "-?-", bpSys: "-?-", bpDia: "-?-", pulse: "-?-"};
        const cur = pickVitalsAtTime(vitalsCsv, csvElapsedSec);
        const fmt = (x: number | null | undefined, digits = 0): number | "-?-" =>
            (x == null || !Number.isFinite(x)) ? "-?-" : Number(x.toFixed(digits));
        return {
            hr: fmt(cur.hr),
            spo2: fmt(cur.spo2),
            rr: fmt(cur.rr),
            bpSys: fmt(cur.bpSys),
            bpDia: fmt(cur.bpDia),
            pulse: fmt(cur.pulse),
        };
    }

    return {
        hr: initialized ? vitals.hr : "-?-",
        spo2: initialized ? vitals.spo2 : "-?-",
        rr: initialized ? vitals.rr : "-?-",
        bpSys: initialized ? vitals.bp.sys : "-?-",
        bpDia: initialized ? vitals.bp.dia : "-?-",
        pulse: "-?-",
    };
}

export function toAdditionalVitals(params: {
    mode: "demo" | "csv";
    vitalsCsv: ParsedVitalsCsv | null;
    csvElapsedSec: number;
    disp: DisplayVitals;
    palette: Palette;
    bpLevel: AlarmLevelOrNull;
}): AdditionalVital[] {
    const {mode, vitalsCsv, csvElapsedSec, disp, palette, bpLevel} = params;
    const vitals: AdditionalVital[] = [];

    if (disp.bpSys !== "-?-" && disp.bpDia !== "-?-") {
        vitals.push({
            key: "nibp",
            label: "NIBP",
            value: `${disp.bpSys}/${disp.bpDia}`,
            color: palette.bp,
            alarmLevel: bpLevel,
        });
    }

    if (mode === "csv" && vitalsCsv) {
        const cur = pickVitalsAtTime(vitalsCsv, csvElapsedSec);
        const used = new Set(["HR", "%SpO2", "SpO2", "RESP", "RR", "NBP SYS", "NBP DIAS", "NIBP SYS", "NIBP DIAS", "PULSE", "PR", "Pulse Rate"]);
        for (const c of vitalsCsv.columns) {
            if (used.has(c.name)) continue;
            const v = cur.extra.get(c.name);
            if (v == null || !Number.isFinite(v)) continue;
            vitals.push({
                key: c.name.toLowerCase().replace(/\s+/g, "_"),
                label: c.name,
                value: String(Number(v.toFixed(1))),
                color: palette.defaultText,
            });
        }
    }

    return vitals.slice(0, 8);
}


