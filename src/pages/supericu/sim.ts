import {useEffect, useMemo, useState} from "react";

export type AlarmLevel = "low" | "medium" | "high";
export type AlertItem = { id: string; time: string; level: AlarmLevel; msg: string };
export type Vitals = { hr: number | "-?-"; spo2: number | "-?-"; rr: number | "-?-"; bp: { sys: number | "-?-"; dia: number | "-?-" } };

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
export function useDemoVitals() {
    const [vitals, setVitals] = useState<Vitals>({hr: 78, spo2: 98, rr: 16, bp: {sys: 120, dia: 76}});
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
        const t = setInterval(() => {
            setVitals(prev => {
                const prevHr = Number(prev.hr);
                const prevRr = Number(prev.rr);
                const prevSp = Number(prev.spo2);
                const prevSys = Number(prev.bp.sys);
                const prevDia = Number(prev.bp.dia);
                const heartRate = clamp(prevHr + (Math.random() - 0.5) * 2, 55, 130);
                const respirationRate = clamp(prevRr + (Math.random() - 0.5) * 0.4, 10, 24);
                const spo2Val = clamp(prevSp + (Math.random() - 0.5) * 0.3, 94, 100);
                const bpSys = Math.round(clamp(prevSys + (Math.random() - 0.5) * 1.2, 100, 150));
                const bpDia = Math.round(clamp(prevDia + (Math.random() - 0.5) * 0.8, 60, 95));
                return {hr: Math.round(heartRate), rr: Math.round(respirationRate), spo2: Math.round(spo2Val), bp: {sys: bpSys, dia: bpDia}};
            });
        }, 1000);
        const readyTimer = setTimeout(() => setReady(true), 1000);
        return () => {
            clearInterval(t);
            clearTimeout(readyTimer);
        };
    }, []);

    return {vitals, ready} as const;
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

// Optional: export some demo log presets that could be scheduled by the UI
export const demoFutureLogs: Array<{ inMs: number; level: AlarmLevel; msg: string }> = [
    {inMs: 5000, level: "low", msg: "PVC detected"},
    {inMs: 12000, level: "medium", msg: "RR trending up"},
    {inMs: 20000, level: "high", msg: "HR > 120 bpm"},
];
