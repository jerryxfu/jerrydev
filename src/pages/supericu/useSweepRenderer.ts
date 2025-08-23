import {RefObject, useEffect} from "react";
import {Vitals, modifyDemoSample, sampleTemplate} from "./sim";
import {alertSound} from "./sound";

// Rendering-specific constants
const RENDER_CFG = {
    TICK_MS: 20,
    LINE_WIDTH: 2,
    CLEAR_WIDTH: 2,
    AMP_FRAC: 0.4,
    VAL_CLAMP: 1.2,
    MIN_SAMPLES_PER_BEAT: 300,
} as const;

export type TemplateSource = {
    kind: "template";
    template: number[];
    pace: "hr" | "rr"; // advance rate source
    connected?: boolean; // for ECG lead-off rendering
    heartbeat?: boolean; // emit heartbeat on wrap
};

export type CsvSource = {
    kind: "csv";
    samples: number[] | Float32Array; // raw samples (unmodified)
    sampleHz: number;
    yMin?: number; // optional render scaling domain
    yMax?: number;
};

export type DynamicChannel = {
    key: string;
    ref: RefObject<HTMLCanvasElement | null>;
    color: string;
    source: TemplateSource | CsvSource;
};

export type SweepRendererOptions = {
    channels: DynamicChannel[];
    showSeconds: number;
    initialized: boolean;
    vitalsRef: RefObject<Vitals>;
    heartbeatRef: RefObject<boolean>;
    externalTimeSec?: number; // optional shared playhead for CSV channels
    // New: optional callback to receive latest value per channel (val used for draw, and raw if available)
    onValue?: (key: string, val: number | null, raw?: number | null) => void;
};

// Sets up and runs the canvas sweep renderers for a dynamic set of channels
export function useSweepRenderer(opts: SweepRendererOptions) {
    const {channels, showSeconds, initialized, vitalsRef, heartbeatRef, externalTimeSec, onValue} = opts;

    useEffect(() => {
        // Build sweep objects for each channel that currently has a canvas element
        type Sweep = {
            canvas: HTMLCanvasElement;
            ctx: CanvasRenderingContext2D;
            width: number; height: number; dpr: number;
            x: number; lastX: number | null; lastY: number | null;
            color: string; lineWidth: number; clearW: number;
            resize: () => void; clearAll: () => void;
        };

        const sweeps: (Sweep | null)[] = channels.map(ch => {
            const el = ch.ref.current;
            if (!el) return null;
            const ctx = el.getContext("2d");
            if (!ctx) return null;
            const s: Sweep = {
                canvas: el, ctx,
                width: 0, height: 0, dpr: window.devicePixelRatio || 1,
                x: 0, lastX: null, lastY: null,
                color: ch.color, lineWidth: RENDER_CFG.LINE_WIDTH, clearW: RENDER_CFG.CLEAR_WIDTH,
                resize: () => {
                    const dpr = window.devicePixelRatio || 1;
                    s.dpr = dpr;
                    const w = Math.max(1, Math.floor(el.clientWidth * dpr));
                    const h = Math.max(1, Math.floor(el.clientHeight * dpr));
                    el.width = w;
                    el.height = h;
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    s.width = w / dpr;
                    s.height = h / dpr;
                    s.x = 0;
                    s.lastX = null;
                    s.lastY = null;
                    s.clearAll();
                },
                clearAll: () => {
                    ctx.save();
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.clearRect(0, 0, el.width, el.height);
                    ctx.restore();
                },
            };
            s.resize();
            const ro = new ResizeObserver(() => s.resize());
            ro.observe(el);
            resizeObservers.push(ro);
            return s;
        });

        // Track per-channel state (phase for templates, index for csv)
        const templatePhase = new Map<number, number>();
        const csvIndex = new Map<number, number>();

        const tickMs = RENDER_CFG.TICK_MS;
        let tSec = 0;
        let lastTs = performance.now();
        let lastExt: number | null = externalTimeSec ?? null;

        const timer = setInterval(() => {
            const now = performance.now();
            const elapsedSecWall = Math.max(0, (now - lastTs) / 1000);
            lastTs = now;

            // Derive CSV elapsed from external playhead if present
            let elapsedCsv = elapsedSecWall;
            if (typeof externalTimeSec === "number") {
                if (lastExt == null) lastExt = externalTimeSec;
                const d = externalTimeSec - lastExt;
                elapsedCsv = Math.max(0, isFinite(d) ? d : 0);
                lastExt = externalTimeSec;
            }

            // Clear screens if not initialized
            if (!initialized) {
                sweeps.forEach(s => s && s.clearAll());
                // Also publish nulls so UI can blank values while not initialized
                if (onValue) {
                    channels.forEach(ch => onValue(ch.key, null, null));
                }
                return;
            }

            const v = vitalsRef.current;
            if (!v) return;

            // Iterate each channel and render
            channels.forEach((ch, idx) => {
                const s = sweeps[idx];
                if (!s) return;

                const dxTotal = Math.max(0.5, s.width * (elapsedSecWall / showSeconds));

                if (ch.source.kind === "template") {
                    const {template, pace, connected, heartbeat} = ch.source;
                    if (pace === "hr" && connected === false) {
                        s.clearAll();
                        drawLeadOff(s, "LEAD OFF");
                        if (onValue) onValue(ch.key, null, null);
                        return;
                    }

                    const rate = pace === "hr" ? Math.max(1, Number(v.hr)) : Math.max(1, Number(v.rr));
                    const hz = rate / 60;
                    const desiredPhaseStep = 1 / RENDER_CFG.MIN_SAMPLES_PER_BEAT;
                    const step = hz * elapsedSecWall;
                    const sub = Math.max(1, Math.ceil(step / desiredPhaseStep));
                    let phase = templatePhase.get(idx) ?? 0;

                    let lastValDrawn: number | null = null;
                    const subDt = elapsedSecWall / sub;
                    for (let i = 0; i < sub; i++) {
                        const prevPhase = phase;
                        phase += (hz * elapsedSecWall) / sub;
                        if (phase >= 1) phase -= 1;
                        const raw = sampleTemplate(template, phase, 1);
                        const val = modifyDemoSample(pace === "hr" ? "ecg" : "resp", raw, tSec, v);
                        lastValDrawn = val;
                        drawSweep(s, val, dxTotal / sub);
                        tSec += subDt;
                        if (heartbeatRef.current && heartbeat && pace === "hr" && phase < prevPhase) {
                            alertSound.playHeartbeat();
                        }
                    }
                    if (onValue) onValue(ch.key, lastValDrawn, lastValDrawn); // for templates, raw-ish equals drawn val
                    templatePhase.set(idx, phase);
                } else {
                    // CSV source
                    const {samples, sampleHz, yMin, yMax} = ch.source;
                    const totalAdvance = sampleHz * elapsedCsv; // samples advanced this frame (synced if externalTimeSec set)
                    const sub = Math.max(1, Math.ceil(Math.max(0, totalAdvance)));
                    const subDt = (elapsedSecWall) / sub; // time axis for demo modifiers if needed
                    const prevIdx = csvIndex.get(idx) ?? 0;
                    const n = samples.length;
                    if (n === 0) {
                        if (onValue) onValue(ch.key, null, null);
                        return;
                    }
                    let pos = prevIdx;
                    let lastValDrawn: number | null = null;
                    let lastRaw: number | null = null;
                    for (let i = 0; i < sub; i++) {
                        pos += Math.max(0, totalAdvance) / sub;
                        // Wrap
                        if (pos >= n) pos -= n;
                        const raw = sampleAt(samples, pos);
                        lastRaw = Number.isFinite(raw) ? raw : null;
                        // Map to [-1,1] for rendering only (no data mutation)
                        let val: number;
                        const ymin = yMin;
                        const ymax = yMax;
                        if (Number.isFinite(raw) && typeof ymin === "number" && typeof ymax === "number" && ymax > ymin) {
                            const range = ymax - ymin;
                            val = ((raw - ymin) / range) * 2 - 1;
                        } else {
                            val = raw as number; // fallback
                        }
                        lastValDrawn = Number.isFinite(val) ? val : null;
                        drawSweep(s, val, dxTotal / sub);
                        tSec += subDt;
                    }
                    if (onValue) onValue(ch.key, lastValDrawn, lastRaw);
                    csvIndex.set(idx, pos);
                }
            });
        }, tickMs);

        return () => {
            clearInterval(timer);
            resizeObservers.forEach(r => r.disconnect());
            resizeObservers.length = 0;
        };
    }, [channels, showSeconds, initialized, vitalsRef, heartbeatRef, externalTimeSec, onValue]);
}

const resizeObservers: ResizeObserver[] = [];

const OVERWRITE_BAND_PX = 8;

function drawSweep(s: {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    x: number;
    lastX: number | null;
    lastY: number | null;
    color: string;
    lineWidth: number
}, val: number, dx: number) {
    const ctx = s.ctx;
    const mid = s.height / 2;
    const amp = s.height * RENDER_CFG.AMP_FRAC;
    if (!Number.isFinite(val)) {
        // advance without drawing, clear strip
        const clearW = Math.max(dx, OVERWRITE_BAND_PX);
        ctx.clearRect(s.x, 0, clearW, s.height);
        // move cursor
        const newX = s.x + dx;
        // @ts-ignore
        s.x = newX >= s.width ? 0 : newX;
        // @ts-ignore
        s.lastX = null;
        // @ts-ignore
        s.lastY = null;
        return;
    }
    const y = mid - Math.max(-RENDER_CFG.VAL_CLAMP, Math.min(RENDER_CFG.VAL_CLAMP, val)) * amp;

    ctx.save();
    const clearW = Math.max(dx, OVERWRITE_BAND_PX);
    ctx.clearRect(s.x, 0, clearW, s.height);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.lineWidth;
    ctx.beginPath();
    if (s.lastX == null || (s.x === 0 && s.lastX !== 0)) {
        ctx.moveTo(s.x, y);
    } else {
        ctx.moveTo(s.lastX, s.lastY ?? y);
    }
    const newX = s.x + dx;
    ctx.lineTo(newX, y);
    ctx.stroke();
    ctx.restore();

    s.lastX = newX;
    s.lastY = y;
    // @ts-ignore - mutate width/x on the sweep object
    s.x = newX;
    // @ts-ignore
    if (s.x >= s.width) {
        // @ts-ignore
        s.x = 0;
        // @ts-ignore
        s.lastX = null;
        // @ts-ignore
        s.lastY = null;
    }
}

function sampleAt(arr: number[] | Float32Array, idx: number) {
    const n = arr.length;
    if (n === 0) return NaN;
    const i0 = Math.floor(idx) % n;
    const i1 = (i0 + 1) % n;
    const frac = idx - Math.floor(idx);
    const v0 = (arr as any)[i0] as number | undefined;
    const v1 = (arr as any)[i1] as number | undefined;
    const a = Number.isFinite(v0 as number) ? (v0 as number) : NaN;
    const b = Number.isFinite(v1 as number) ? (v1 as number) : a;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return a;
    return a + (b - a) * frac;
}

function drawLeadOff(s: { ctx: CanvasRenderingContext2D; width: number; height: number }, text: string) {
    const ctx = s.ctx;
    ctx.save();
    ctx.fillStyle = "#0b0d10";
    ctx.fillRect(0, 0, s.width, s.height);
    ctx.fillStyle = "#9fb2c8";
    ctx.font = "12px monospace";
    const metrics = ctx.measureText(text);
    const x = (s.width - metrics.width) / 2;
    const y = s.height / 2;
    ctx.fillText(text, x, y);
    ctx.restore();
}
