import {type RefObject, useEffect} from "react";
import {modifyDemoSample, sampleTemplate, type Vitals} from "./sim";
import {alertSound} from "./sound";

// --- Rendering constants ---
const RENDER_CFG = {
    LINE_WIDTH: 2,
    AMP_FRAC: 0.40,          // vertical usage of canvas height
    VAL_CLAMP: 1.2,          // clamp sample values to +/- 1.2
    MIN_SAMPLES_PER_BEAT: 60, // for template sources, minimum samples to draw per beat (for smoothness at low rates)
    ERASE_BAND_PX: 6,       // width of the gradient erase band ahead of the sweep

} as const;

// ---Types ---
export type TemplateSource = {
    kind: "template";
    template: number[];
    pace: "hr" | "rr";
    connected?: boolean;
    heartbeat?: boolean;
};

export type CsvSource = {
    kind: "csv";
    samples: number[] | Float32Array;
    sampleHz: number;
    yMin?: number;
    yMax?: number;
};

export type DynamicChannel = {
    key: string;
    color: string;
    source: TemplateSource | CsvSource;
};

export type SweepRendererOptions = {
    channels: DynamicChannel[];
    canvasRefs: RefObject<Map<string, { current: HTMLCanvasElement | null }>>;
    showSeconds: number;
    initialized: boolean;
    vitalsRef: RefObject<Vitals>;
    heartbeatRef: RefObject<boolean>;
    externalTimeSec?: number;
    onValue?: (key: string, val: number | null, raw?: number | null) => void;
    timeEpochMs?: number | null;
};

// --- Sweep state per canvas ---
type Sweep = {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    dpr: number;
    x: number;
    lastX: number | null;
    lastY: number | null;
    color: string;
    resize: () => void;
    clearAll: () => void;
};

// --- Hook ---
export function useSweepRenderer(opts: SweepRendererOptions) {
    const {channels, canvasRefs, showSeconds, initialized, vitalsRef, heartbeatRef, externalTimeSec, onValue, timeEpochMs} = opts;

    useEffect(() => {
        const localObservers: ResizeObserver[] = [];

        // Build sweep objects
        const sweeps: (Sweep | null)[] = channels.map(ch => {
            const el = canvasRefs.current.get(ch.key)?.current ?? null;
            if (!el) return null;
            const ctx = el.getContext("2d");
            if (!ctx) return null;

            const s: Sweep = {
                canvas: el,
                ctx,
                width: 0,
                height: 0,
                dpr: window.devicePixelRatio || 1,
                x: 0,
                lastX: null,
                lastY: null,
                color: ch.color,
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
            localObservers.push(ro);
            return s;
        });

        // Per-channel phase tracking (template sources)
        const templatePhase = new Map<number, number>();

        let tSec = 0;
        let lastTs = performance.now();
        const baseCsvSec = (typeof externalTimeSec === "number") ? externalTimeSec : 0;
        let wallAccumCsvSec = 0;
        let rafId: number;

        // --- Main render loop (rAF) ---
        const tick = (now: number) => {
            const elapsedSecWall = Math.max(0, Math.min(0.1, (now - lastTs) / 1000)); // cap at 100ms to handle tab-switch
            lastTs = now;
            wallAccumCsvSec += elapsedSecWall;
            const playCsvSec = baseCsvSec + wallAccumCsvSec;

            if (!initialized) {
                sweeps.forEach(s => s?.clearAll());
                if (onValue) channels.forEach(ch => onValue(ch.key, null, null));
                rafId = requestAnimationFrame(tick);
                return;
            }

            const v = vitalsRef.current;
            if (!v) {
                rafId = requestAnimationFrame(tick);
                return;
            }

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
                    if (onValue) onValue(ch.key, lastValDrawn, lastValDrawn);
                    templatePhase.set(idx, phase);
                } else {
                    // CSV source
                    const {samples, sampleHz, yMin, yMax} = ch.source;
                    const n = samples.length;
                    if (n === 0) {
                        if (onValue) onValue(ch.key, null, null);
                        return;
                    }
                    const prevPlayCsvSec = playCsvSec - elapsedSecWall;
                    const totalAdvance = sampleHz * elapsedSecWall;
                    const sub = Math.max(1, Math.ceil(Math.max(0, totalAdvance)));
                    const subDt = elapsedSecWall / sub;

                    let lastValDrawn: number | null = null;
                    let lastRaw: number | null = null;

                    for (let i = 0; i < sub; i++) {
                        const tStep = prevPlayCsvSec + ((i + 1) * subDt);
                        let pos = (tStep * sampleHz) % n;
                        if (pos < 0) pos += n;
                        const raw = sampleAt(samples, pos);
                        lastRaw = Number.isFinite(raw) ? raw : null;
                        let val: number;
                        if (Number.isFinite(raw) && typeof yMin === "number" && typeof yMax === "number" && yMax > yMin) {
                            val = ((raw - yMin) / (yMax - yMin)) * 2 - 1;
                        } else {
                            val = raw as number;
                        }
                        lastValDrawn = Number.isFinite(val) ? val : null;
                        drawSweep(s, val, dxTotal / sub);
                        tSec += subDt;
                    }
                    if (onValue) onValue(ch.key, lastValDrawn, lastRaw);
                }
            });

            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(rafId);
            localObservers.forEach(r => r.disconnect());
        };
        // do not include externalTimeSec in deps — we only capture its initial value
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channels, canvasRefs, showSeconds, initialized, vitalsRef, heartbeatRef, onValue, timeEpochMs]);
}

// --- Drawing helpers ---

function drawSweep(
    s: Sweep,
    val: number,
    dx: number,
) {
    const {ctx, width, height, color} = s;
    const mid = height / 2;
    const amp = height * RENDER_CFG.AMP_FRAC;
    const eraseBand = RENDER_CFG.ERASE_BAND_PX;

    // Erase band ahead of the sweep cursor with a gradient fade
    eraseAhead(ctx, s.x, width, height, Math.max(dx, eraseBand));

    if (!Number.isFinite(val)) {
        const newX = s.x + dx;
        s.x = newX >= width ? 0 : newX;
        s.lastX = null;
        s.lastY = null;
        return;
    }

    const clamped = Math.max(-RENDER_CFG.VAL_CLAMP, Math.min(RENDER_CFG.VAL_CLAMP, val));
    const y = mid - clamped * amp;

    // Main trace
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = RENDER_CFG.LINE_WIDTH;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
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
    s.x = newX;
    if (s.x >= width) {
        s.x = 0;
        s.lastX = null;
        s.lastY = null;
    }
}

/**
 * Gradient erase band: fully transparent at the sweep cursor,
 * fading to opaque black ahead. Mimics a CRT phosphor decay.
 */
function eraseAhead(
    ctx: CanvasRenderingContext2D,
    x: number,
    canvasW: number,
    canvasH: number,
    bandW: number,
) {
    // Hard-clear the immediate area (where we're about to draw)
    ctx.clearRect(x, 0, bandW, canvasH);

    // Gradient fade from transparent → panel background ahead of the band
    const fadeStart = x + bandW;
    const fadeEnd = fadeStart + bandW;
    if (fadeStart < canvasW) {
        const grad = ctx.createLinearGradient(fadeStart, 0, Math.min(fadeEnd, canvasW), 0);
        grad.addColorStop(0, "rgba(11, 15, 20, 0.8)"); // match --ui-panel
        grad.addColorStop(1, "rgba(11, 15, 20, 0)");
        ctx.save();
        ctx.fillStyle = grad;
        ctx.fillRect(fadeStart, 0, Math.min(fadeEnd, canvasW) - fadeStart, canvasH);
        ctx.restore();
    }
}

function sampleAt(arr: number[] | Float32Array, idx: number) {
    const n = arr.length;
    if (n === 0) return NaN;
    const i0 = Math.floor(idx) % n;
    const i1 = (i0 + 1) % n;
    const frac = idx - Math.floor(idx);
    const v0 = (arr as ArrayLike<number>)[i0] as number | undefined;
    const v1 = (arr as ArrayLike<number>)[i1] as number | undefined;
    const a = Number.isFinite(v0 as number) ? (v0 as number) : NaN;
    const b = Number.isFinite(v1 as number) ? (v1 as number) : a;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return a;
    return a + (b - a) * frac;
}

function drawLeadOff(s: Pick<Sweep, "ctx" | "width" | "height">, text: string) {
    const {ctx, width, height} = s;
    ctx.save();
    ctx.fillStyle = "#0b0d10";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#9fb2c8";
    ctx.font = "12px monospace";
    const metrics = ctx.measureText(text);
    ctx.fillText(text, (width - metrics.width) / 2, height / 2);
    ctx.restore();
}