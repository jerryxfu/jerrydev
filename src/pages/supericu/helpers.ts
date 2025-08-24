// Shared helper utilities for SuperICU

// Minimal palette type required by helpers to avoid circular deps
export type PaletteLike = {
    ecg: string;
    pleth: string;
    resp: string;
    spo2: string;
    defaultText: string;
};

export function randomId() {
    try {
        // @ts-ignore
        const b = (crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(8)) : null;
        if (b) return Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("");
    } catch {
    }
    return Math.random().toString(36).slice(2);
}

export function mapLeadName(raw: string, palette: PaletteLike): { label: string; color: string; className?: string } {
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

export function inferVitalFromMsg(msg: string): "hr" | "spo2" | "bp" | null {
    const m = msg.toLowerCase();
    if (m.includes("spo2") || m.includes("spo")) return "spo2";
    if (m.includes("nibp") || m.includes("bp ") || m.includes("blood pressure")) return "bp";
    if (m.includes("hr") || m.includes("tachy") || m.includes("brady")) return "hr";
    return null;
}

export function colorForVital(v: "hr" | "spo2" | "rr", palette: PaletteLike) {
    switch (v) {
        case "hr":
            return palette.ecg;
        case "spo2":
            return palette.spo2; // numeric color for SpO2
        case "rr":
            return palette.resp;
    }
}

export function unitForVital(v: "hr" | "spo2" | "rr") {
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
export function parseCsv(text: string): { sampleHz: number; columns: { name: string; values: Float32Array; yMin: number; yMax: number }[] } {
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

export function detectDelim(headerLine?: string): string {
    const h = headerLine ?? ",";
    if (h.includes(",")) return ",";
    if (h.includes("\t")) return "\t";
    if (h.includes(";")) return ";";
    return ",";
}

// Vitals CSV types and helpers
export type ParsedVitalsCsv = { times?: number[]; columns: { name: string; values: number[] }[] };

export function parseVitalsCsv(text: string): ParsedVitalsCsv {
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

export function pickVitalsAtTime(v: ParsedVitalsCsv, elapsedSec: number): {
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
        return (typeof raw === "number" && Number.isFinite(raw)) ? raw : null;
    };
    const hr = get(/^hr$/i) ?? get("HR") ?? get(/^pulse$/i) ?? get("PULSE");
    const spo2 = get(/%?s?po2/i) ?? get("%SpO2");
    const rr = get(/^resp$|^rr$/i) ?? get("RESP");
    const bpSys = get(/(n?ibp|nbp)?\s*sys/i) ?? get("NBP SYS") ?? get("NIBP SYS");
    const bpDia = get(/(n?ibp|nbp)?\s*(dia|dias)/i) ?? get("NBP DIAS") ?? get("NIBP DIAS");
    const extra = new Map<string, number>();
    for (const c of v.columns) {
        const valNum = Number(c.values[idx]);
        if (Number.isFinite(valNum)) extra.set(c.name, valNum);
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

export function minOf(arr: ArrayLike<number>) {
    let m = Infinity;
    for (let i = 0; i < arr.length; i++) {
        const v = arr[i] as number;
        if (Number.isFinite(v) && v < m) m = v;
    }
    return m === Infinity ? NaN : m;
}

export function maxOf(arr: ArrayLike<number>) {
    let m = -Infinity;
    for (let i = 0; i < arr.length; i++) {
        const v = arr[i] as number;
        if (Number.isFinite(v) && v > m) m = v;
    }
    return m === -Infinity ? NaN : m;
}

export function fmt9(value?: number) {
    return (typeof value === "number" && Number.isFinite(value)) ? value.toFixed(9) : "–";
}

export function fmt3(value?: number | null) {
    if (value == null || !Number.isFinite(value)) return "–";
    const ax = Math.abs(value);
    if (ax >= 1000) return value.toFixed(0);
    if (ax >= 100) return value.toFixed(1);
    if (ax >= 10) return value.toFixed(2);
    return value.toFixed(3);
}

export function formatWaveVal(map: Map<string, { val: number | null; raw: number | null }>, key: string, mode: "demo" | "csv") {
    const rec = map.get(key);
    if (!rec) return "–-";
    const value = mode === "csv" ? (rec.raw ?? rec.val) : rec.val;
    return fmt3(value);
}
