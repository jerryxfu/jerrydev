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
    samples: number[] | Float32Array; // normalized to roughly [-1, 1]
    sampleHz: number;
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
};

// Sets up and runs the canvas sweep renderers for a dynamic set of channels
export function useSweepRenderer(opts: SweepRendererOptions) {
    const {channels, showSeconds, initialized, vitalsRef, heartbeatRef} = opts;

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

        const timer = setInterval(() => {
            const now = performance.now();
            const elapsedSec = Math.max(0, (now - lastTs) / 1000);
            lastTs = now;

            // Clear screens if not initialized
            if (!initialized) {
                sweeps.forEach(s => s && s.clearAll());
                return;
            }

            const v = vitalsRef.current;
            if (!v) return;

            // Iterate each channel and render
            channels.forEach((ch, idx) => {
                const s = sweeps[idx];
                if (!s) return;

                const dxTotal = Math.max(0.5, s.width * (elapsedSec / showSeconds));

                if (ch.source.kind === "template") {
                    const {template, pace, connected, heartbeat} = ch.source;
                    if (pace === "hr" && connected === false) {
                        s.clearAll();
                        drawLeadOff(s, "LEAD OFF");
                        return;
                    }

                    const rate = pace === "hr" ? Math.max(1, Number(v.hr)) : Math.max(1, Number(v.rr));
                    const hz = rate / 60;
                    const desiredPhaseStep = 1 / RENDER_CFG.MIN_SAMPLES_PER_BEAT;
                    const step = hz * elapsedSec;
                    const sub = Math.max(1, Math.ceil(step / desiredPhaseStep));
                    let phase = templatePhase.get(idx) ?? 0;

                    const subDt = elapsedSec / sub;
                    for (let i = 0; i < sub; i++) {
                        const prevPhase = phase;
                        phase += (hz * elapsedSec) / sub;
                        if (phase >= 1) phase -= 1;
                        const raw = sampleTemplate(template, phase, 1);
                        const val = modifyDemoSample(pace === "hr" ? "ecg" : "resp", raw, tSec, v);
                        drawSweep(s, val, dxTotal / sub);
                        tSec += subDt;
                        if (heartbeatRef.current && heartbeat && pace === "hr" && phase < prevPhase) {
                            alertSound.playHeartbeat();
                        }
                    }
                    templatePhase.set(idx, phase);
                } else {
                    // CSV source
                    const {samples, sampleHz} = ch.source;
                    const totalAdvance = sampleHz * elapsedSec; // samples advanced this frame
                    const sub = Math.max(1, Math.ceil(totalAdvance));
                    const subDt = elapsedSec / sub;
                    const prevIdx = csvIndex.get(idx) ?? 0;
                    const n = samples.length;
                    if (n === 0) return;
                    let pos = prevIdx;
                    for (let i = 0; i < sub; i++) {
                        pos += totalAdvance / sub;
                        // Wrap
                        if (pos >= n) pos -= n;
                        const val = sampleAt(samples, pos);
                        drawSweep(s, val, dxTotal / sub);
                        tSec += subDt;
                    }
                    csvIndex.set(idx, pos);
                }
            });
        }, tickMs);

        return () => {
            clearInterval(timer);
            resizeObservers.forEach(r => r.disconnect());
            resizeObservers.length = 0;
        };
    }, [channels, showSeconds, initialized, vitalsRef, heartbeatRef]);
}

const resizeObservers: ResizeObserver[] = [];

const OVERWRITE_BAND_PX = 8;

function drawSweep(s: { ctx: CanvasRenderingContext2D; width: number; height: number; x: number; lastX: number | null; lastY: number | null; color: string; lineWidth: number }, val: number, dx: number) {
    const ctx = s.ctx;
    const mid = s.height / 2;
    const amp = s.height * RENDER_CFG.AMP_FRAC;
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
    if (n === 0) return 0;
    const i0 = Math.floor(idx) % n;
    const i1 = (i0 + 1) % n;
    const frac = idx - Math.floor(idx);
    const v0 = arr[i0] ?? 0;
    const v1 = arr[i1] ?? v0;
    return v0 + (v1 - v0) * frac;
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
