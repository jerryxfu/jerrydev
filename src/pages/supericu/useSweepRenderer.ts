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

export type SweepRendererOptions = {
    refs: {
        ecgRef: RefObject<HTMLCanvasElement | null>;
        plethRef: RefObject<HTMLCanvasElement | null>;
        respRef: RefObject<HTMLCanvasElement | null>;
    };
    colors: { ecg: string; pleth: string; resp: string };
    showSeconds: number;
    initialized: boolean;
    ecgConnected: boolean;
    templates: { ecgTemplate: number[]; plethTemplate: number[]; respTemplate: number[] };
    vitalsRef: RefObject<Vitals>;
    heartbeatRef: RefObject<boolean>;
};

// Sets up and runs the canvas sweep renderers for ECG, Pleth, and Respiration
export function useSweepRenderer(opts: SweepRendererOptions) {
    const {refs, colors, showSeconds, initialized, ecgConnected, templates, vitalsRef, heartbeatRef} = opts;

    useEffect(() => {
        const canvases = [
            {ref: refs.ecgRef, color: colors.ecg},
            {ref: refs.plethRef, color: colors.pleth},
            {ref: refs.respRef, color: colors.resp},
        ];

        type Sweep = {
            canvas: HTMLCanvasElement;
            ctx: CanvasRenderingContext2D;
            width: number; height: number; dpr: number;
            x: number; lastX: number | null; lastY: number | null;
            color: string; lineWidth: number; clearW: number;
            resize: () => void; clearAll: () => void;
        };

        const sweeps: Sweep[] = [];
        const ros: ResizeObserver[] = [];

        function makeSweep(canvas: HTMLCanvasElement, color: string): Sweep | null {
            const ctx = canvas.getContext("2d");
            if (!ctx) return null;
            const s: Sweep = {
                canvas, ctx,
                width: 0, height: 0, dpr: window.devicePixelRatio || 1,
                x: 0, lastX: null, lastY: null,
                color, lineWidth: RENDER_CFG.LINE_WIDTH, clearW: RENDER_CFG.CLEAR_WIDTH,
                resize: () => {
                    const dpr = window.devicePixelRatio || 1;
                    s.dpr = dpr;
                    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
                    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
                    canvas.width = w;
                    canvas.height = h;
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
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.restore();
                },
            };
            s.resize();
            const ro = new ResizeObserver(() => s.resize());
            ro.observe(canvas);
            ros.push(ro);
            return s;
        }

        for (const c of canvases) {
            const el = c.ref.current;
            if (!el) continue;
            const s = makeSweep(el, c.color);
            if (s) sweeps.push(s);
        }
        if (sweeps.length !== canvases.length) {
            return () => {
                ros.forEach(r => r.disconnect());
            };
        }
        const [ecg, pleth, resp] = sweeps as [Sweep, Sweep, Sweep];

        let ecgPhase = 0, plethPhase = 0, respPhase = 0;
        const tickMs = RENDER_CFG.TICK_MS;
        let tSec = 0;
        let lastTs = performance.now();

        const timer = setInterval(() => {
            const now = performance.now();
            const elapsedSec = Math.max(0, (now - lastTs) / 1000);
            lastTs = now;

            if (!initialized) {
                ecg.clearAll();
                pleth.clearAll();
                resp.clearAll();
                return;
            }
            const v = vitalsRef.current;
            if (!v) return;
            const hr = Math.max(1, Number(v.hr));
            const rr = Math.max(1, Number(v.rr));
            const hrHz = hr / 60;
            const rrHz = rr / 60;
            const stepEcg = hrHz * elapsedSec;
            const stepPleth = stepEcg;
            const stepResp = rrHz * elapsedSec;

            const dxEcgTotal = Math.max(0.5, ecg.width * (elapsedSec / showSeconds));
            const dxPlethTotal = Math.max(0.5, pleth.width * (elapsedSec / showSeconds));
            const dxRespTotal = Math.max(0.5, resp.width * (elapsedSec / showSeconds));

            const desiredPhaseStep = 1 / RENDER_CFG.MIN_SAMPLES_PER_BEAT;
            const subEcg = Math.max(1, Math.ceil(stepEcg / desiredPhaseStep));
            const subPleth = Math.max(1, Math.ceil(stepPleth / desiredPhaseStep));
            const subResp = Math.max(1, Math.ceil(stepResp / desiredPhaseStep));

            const advanceAndDraw = (s: Sweep, getVal: () => number, sub: number, dxTotal: number) => {
                const subDt = elapsedSec / sub;
                for (let i = 0; i < sub; i++) {
                    const v = getVal();
                    drawSweep(s, v, dxTotal / sub);
                    tSec += subDt;
                }
            };

            if (ecgConnected) {
                const prevPhase = ecgPhase;
                advanceAndDraw(
                    ecg,
                    () => {
                        ecgPhase += (hrHz * elapsedSec) / subEcg;
                        if (ecgPhase >= 1) ecgPhase -= 1;
                        const raw = sampleTemplate(templates.ecgTemplate, ecgPhase, 1);
                        return modifyDemoSample("ecg", raw, tSec, v);
                    },
                    subEcg,
                    dxEcgTotal
                );
                if (heartbeatRef.current && ecgPhase < prevPhase) {
                    alertSound.playHeartbeat();
                }
            } else {
                ecg.clearAll();
                drawLeadOff(ecg, "LEAD OFF");
            }

            advanceAndDraw(
                pleth,
                () => {
                    plethPhase += (hrHz * elapsedSec) / subPleth;
                    if (plethPhase >= 1) plethPhase -= 1;
                    const raw = sampleTemplate(templates.plethTemplate, plethPhase, 1) - 0.5;
                    return modifyDemoSample("pleth", raw, tSec, v);
                },
                subPleth,
                dxPlethTotal
            );

            advanceAndDraw(
                resp,
                () => {
                    respPhase += (rrHz * elapsedSec) / subResp;
                    if (respPhase >= 1) respPhase -= 1;
                    const raw = sampleTemplate(templates.respTemplate, respPhase, 1);
                    return modifyDemoSample("resp", raw, tSec, v);
                },
                subResp,
                dxRespTotal
            );
        }, tickMs);

        const OVERWRITE_BAND_PX = 8;

        function drawSweep(s: Sweep, val: number, dx: number) {
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
            s.x = newX;
            if (s.x >= s.width) {
                s.x = 0;
                s.lastX = null;
                s.lastY = null;
            }
        }

        return () => {
            clearInterval(timer);
            ros.forEach(r => r.disconnect());
        };
    }, [refs.ecgRef, refs.plethRef, refs.respRef, colors.ecg, colors.pleth, colors.resp, showSeconds, initialized, ecgConnected, templates.ecgTemplate, templates.plethTemplate, templates.respTemplate, vitalsRef, heartbeatRef]);
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
