import {useEffect, useMemo, useState} from "react";

export type AlarmLevel = "low" | "advisory" | "critical";
export type AlertItem = { id: string; time: string; level: AlarmLevel; msg: string };
export type Vitals = { hr: number | "-?-"; spo2: number | "-?-"; rr: number | "-?-"; bp: { sys: number | "-?-"; dia: number | "-?-" } };

// Demo settings for vitals generation
export type RangeStep = { init: number; min: number; max: number; step: number };
export type DemoSettings = {
    tickMs: number;       // update interval for random walk
    warmupMs: number;     // time until first values are considered ready
    hr: RangeStep;
    rr: RangeStep;
    spo2: RangeStep;
    bp: { sys: RangeStep; dia: RangeStep };
};
export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export const DEFAULT_DEMO_SETTINGS: DemoSettings = {
    tickMs: 1000,
    warmupMs: 1000,
    hr: {init: Math.round(Math.random() * 100 + 60), min: 40, max: 200, step: 3},
    rr: {init: 16, min: 10, max: 28, step: 1.11},
    spo2: {init: Math.round(Math.random() * 15 + 85), min: 85, max: 100, step: 1.25},
    bp: {
        sys: {init: 115, min: 75, max: 185, step: 1.5},
        dia: {init: 76, min: 40, max: 110, step: 1.25},
    },
};

function mergeDemoSettings(base: DemoSettings, overrides?: DeepPartial<DemoSettings>): DemoSettings {
    if (!overrides) return base;
    return {
        tickMs: overrides.tickMs ?? base.tickMs,
        warmupMs: overrides.warmupMs ?? base.warmupMs,
        hr: {...base.hr, ...(overrides.hr ?? {})},
        rr: {...base.rr, ...(overrides.rr ?? {})},
        spo2: {...base.spo2, ...(overrides.spo2 ?? {})},
        bp: {
            sys: {...base.bp.sys, ...(overrides.bp?.sys ?? {})},
            dia: {...base.bp.dia, ...(overrides.bp?.dia ?? {})},
        },
    };
}

// Waveform templates isolated here
export function useWaveTemplates() {
    const ecgTemplate = useMemo(() => {
        const samples = 300;
        const arr = new Array<number>(samples);
        for (let i = 0; i < samples; i++) {
            const x = i / samples;
            const p = 0.15 * Math.exp(-Math.pow((x - 0.22) / 0.03, 2));
            const q = -0.15 * Math.exp(-Math.pow((x - 0.34) / 0.008, 2));
            const r = 1.2 * Math.exp(-Math.pow((x - 0.36) / 0.006, 2));
            const s = -0.25 * Math.exp(-Math.pow((x - 0.39) / 0.01, 2));
            const t = 0.35 * Math.exp(-Math.pow((x - 0.62) / 0.06, 2));
            arr[i] = p + q + r + s + t + (Math.random() - 0.5) * 0.02;
        }
        return arr;
    }, []);

    const plethTemplate = useMemo(() => {
        const samples = 300;
        const arr = new Array<number>(samples);
        for (let i = 0; i < samples; i++) {
            const x = i / samples;
            const upstroke = Math.exp(-8 * Math.pow(x - 0.2, 2));
            const decay = Math.exp(-3 * Math.max(0, x - 0.25));
            const notch = -0.15 * Math.exp(-Math.pow((x - 0.45) / 0.02, 2));
            arr[i] = 0.4 * upstroke + 0.6 * decay + notch + 0.02 * Math.sin(20 * x * Math.PI);
        }
        const min = Math.min(...arr), max = Math.max(...arr);
        return arr.map(v => (v - min) / (max - min));
    }, []);

    const respTemplate = useMemo(() => {
        const samples = 600;
        const arr = new Array<number>(samples);
        for (let i = 0; i < samples; i++) {
            const x = i / samples;
            arr[i] = Math.sin(2 * Math.PI * x) * 0.8 + 0.1 * Math.sin(6 * Math.PI * x);
        }
        return arr;
    }, []);

    return {ecgTemplate, plethTemplate, respTemplate} as const;
}

// Linear-interpolation sampler. phaseIdx can be fractional when spb=1.
export function sampleTemplate(tpl: number[], phaseIdx: number, spb: number) {
    if (tpl.length === 0 || spb <= 0) return 0;
    const pos = (phaseIdx / spb) * tpl.length; // fractional index into template
    const i0 = Math.floor(pos) % tpl.length;
    const i1 = (i0 + 1) % tpl.length;
    const frac = pos - Math.floor(pos);
    const v0 = tpl[i0] ?? 0;
    const v1 = tpl[i1] ?? v0;
    return v0 + (v1 - v0) * frac;
}

// Map sample rate to horizontal advance so the sweep fills the window in `showSeconds`.
export function computeDxPerSample(canvasWidthPx: number, showSeconds: number, sampleHz: number) {
    if (sampleHz <= 0 || showSeconds <= 0) return 0;
    return canvasWidthPx / (showSeconds * sampleHz);
}

// ---------------- DEMO-ONLY SECTION ----------------
// Bounded random walk vitals generator for demos
export function useDemoVitals(overrides?: DeepPartial<DemoSettings>) {
    const s = mergeDemoSettings(DEFAULT_DEMO_SETTINGS, overrides);
    const [vitals, setVitals] = useState<Vitals>({
        hr: s.hr.init,
        spo2: s.spo2.init,
        rr: s.rr.init,
        bp: {sys: s.bp.sys.init, dia: s.bp.dia.init}
    });
    const [ready, setReady] = useState(false);

    // Destructure settings to stable scalars for effect deps
    const tickMs = s.tickMs;
    const warmupMs = s.warmupMs;
    const hrInit = s.hr.init, hrMin = s.hr.min, hrMax = s.hr.max, hrStep = s.hr.step;
    const rrInit = s.rr.init, rrMin = s.rr.min, rrMax = s.rr.max, rrStep = s.rr.step;
    const spo2Init = s.spo2.init, spo2Min = s.spo2.min, spo2Max = s.spo2.max, spo2Step = s.spo2.step;
    const bpSysInit = s.bp.sys.init, bpSysMin = s.bp.sys.min, bpSysMax = s.bp.sys.max, bpSysStep = s.bp.sys.step;
    const bpDiaInit = s.bp.dia.init, bpDiaMin = s.bp.dia.min, bpDiaMax = s.bp.dia.max, bpDiaStep = s.bp.dia.step;

    useEffect(() => {
        const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
        const t = setInterval(() => {
            setVitals(prev => {
                const heartRate = clamp(Number(prev.hr) + (Math.random() - 0.5) * hrStep, hrMin, hrMax);
                const respirationRate = clamp(Number(prev.rr) + (Math.random() - 0.5) * rrStep, rrMin, rrMax);
                const spo2Val = clamp(Number(prev.spo2) + (Math.random() - 0.5) * spo2Step, spo2Min, spo2Max);
                const bpSys = Math.round(clamp(Number(prev.bp.sys) + (Math.random() - 0.5) * bpSysStep, bpSysMin, bpSysMax));
                const bpDia = Math.round(clamp(Number(prev.bp.dia) + (Math.random() - 0.5) * bpDiaStep, bpDiaMin, bpDiaMax));
                return {
                    hr: Math.round(heartRate),
                    rr: Math.round(respirationRate),
                    spo2: Math.round(spo2Val),
                    bp: {sys: bpSys, dia: bpDia}
                } as Vitals;
            });
        }, tickMs);
        const readyTimer = setTimeout(() => setReady(true), warmupMs);
        return () => {
            clearInterval(t);
            clearTimeout(readyTimer);
        };
    }, [tickMs, warmupMs, hrInit, hrMin, hrMax, hrStep, rrInit, rrMin, rrMax, rrStep, spo2Init, spo2Min, spo2Max, spo2Step, bpSysInit, bpSysMin, bpSysMax, bpSysStep, bpDiaInit, bpDiaMin, bpDiaMax, bpDiaStep]);

    // one time override function to correct vitals
    const correctVital = (patch: Partial<{ hr: number; spo2: number; rr: number; bpSys: number; bpDia: number }>) => {
        setVitals(prev => ({
            ...prev,
            hr: patch.hr ?? prev.hr,
            spo2: patch.spo2 ?? prev.spo2,
            rr: patch.rr ?? prev.rr,
            bp: {
                sys: patch.bpSys ?? prev.bp.sys,
                dia: patch.bpDia ?? prev.bp.dia,
            }
        }));
    };

    return {vitals, ready, correctVital} as const;
}

// Natural-looking modifiers for demo waveforms
export function modifyDemoSample(channel: "ecg" | "pleth" | "resp", raw: number, tSec: number, vitals: Vitals): number {
    const hr = Number(vitals.hr) || 60;
    const rr = Number(vitals.rr) || 12;
    if (channel === "ecg") {
        // ECG amplitude gently decreases with HR above 60 bpm
        const gainBase = 1.0;
        const gainPerBpm = -0.0025;
        const gain = clamp(gainBase * (1 + (hr - 60) * gainPerBpm), 0.7, 1.15);
        const wander = 0.02 * Math.sin(2 * Math.PI * 0.12 * tSec);
        const noise = (Math.random() - 0.5) * 0.01;
        return raw * gain + wander + noise;
    }
    if (channel === "pleth") {
        const sys = Number(vitals.bp.sys) || 120;
        const dia = Number(vitals.bp.dia) || 76;
        const pp = Math.max(10, sys - dia);
        const norm = (pp - 40) / 40; // normalize around 40 mmHg
        const perfGain = clamp(1 + 0.25 * norm, 0.7, 1.2);
        const respMod = 1 + 0.06 * Math.sin(2 * Math.PI * (rr / 60) * tSec);
        const noise = (Math.random() - 0.5) * 0.01;
        return raw * perfGain * respMod + noise;
    }
    // resp
    return raw + (Math.random() - 0.5) * 0.005;
}

function clamp(x: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, x));
}
