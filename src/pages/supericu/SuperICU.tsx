import React, {useEffect, useMemo, useRef, useState} from "react";
import {SmoothieChart, TimeSeries} from "smoothie";
import "./SuperICU.scss";

export default function SuperIcu() {
    // Canvas refs
    const ecgRef = useRef<HTMLCanvasElement | null>(null);
    const plethRef = useRef<HTMLCanvasElement | null>(null);
    const respRef = useRef<HTMLCanvasElement | null>(null);

    // Vitals state (populated with test data)
    const [hr, setHr] = useState<number>(78);
    const [spo2, setSpo2] = useState<number>(98);
    const [rr, setRr] = useState<number>(16);
    const [bp, setBp] = useState<{ sys: number; dia: number }>({sys: 120, dia: 76});

    type AlertItem = { id: string; time: string; level: "low" | "medium" | "high"; msg: string };
    const [alerts, setAlerts] = useState<AlertItem[]>([{
        id: "a1", time: new Date().toLocaleTimeString(), level: "low", msg: "Monitoring started"
    }]);

    // Precompute an ECG template (1 beat) using sum of Gaussians (P, QRS, T)
    const ecgTemplate = useMemo(() => {
        const samples = 300; // base samples per beat at 60 bpm
        const arr = new Array<number>(samples);
        for (let i = 0; i < samples; i++) {
            const x = i / samples; // 0..1
            // P wave
            const p = 0.15 * Math.exp(-Math.pow((x - 0.22) / 0.03, 2));
            // QRS complex (Q small neg, R tall pos, S small neg)
            const q = -0.15 * Math.exp(-Math.pow((x - 0.34) / 0.008, 2));
            const r = 1.2 * Math.exp(-Math.pow((x - 0.36) / 0.006, 2));
            const s = -0.25 * Math.exp(-Math.pow((x - 0.39) / 0.01, 2));
            // T wave
            const t = 0.35 * Math.exp(-Math.pow((x - 0.62) / 0.06, 2));
            arr[i] = p + q + r + s + t + (Math.random() - 0.5) * 0.02; // add a little noise
        }
        return arr;
    }, []);

    // Pleth template (SpO2) smoother pulsatile waveform with dicrotic notch
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
        // normalize roughly to 0..1
        const min = Math.min(...arr), max = Math.max(...arr);
        return arr.map(v => (v - min) / (max - min));
    }, []);

    // Respiration template (slow sine-like)
    const respTemplate = useMemo(() => {
        const samples = 600;
        const arr = new Array<number>(samples);
        for (let i = 0; i < samples; i++) {
            const x = i / samples;
            arr[i] = Math.sin(2 * Math.PI * x) * 0.8 + 0.1 * Math.sin(6 * Math.PI * x);
        }
        return arr;
    }, []);

    useEffect(() => {
        if (!ecgRef.current || !plethRef.current || !respRef.current) return;

        // Create charts
        const commonGrid = {
            fillStyle: "#000000",
            strokeStyle: "rgba(0, 100, 0, 0.25)",
            lineWidth: 1,
            millisPerLine: 1000,
            verticalSections: 4,
            sharpLines: true,
            borderVisible: false,
        } as const;

        const ecgChart = new SmoothieChart({
            millisPerPixel: 2,
            maxValue: 1.6,
            minValue: -1.2,
            interpolation: "linear",
            grid: commonGrid,
            labels: {fillStyle: "#7fdc7f"},
        });
        const plethChart = new SmoothieChart({
            millisPerPixel: 2,
            maxValue: 1.2,
            minValue: -0.2,
            interpolation: "linear",
            grid: commonGrid,
            labels: {fillStyle: "#7fdc7f"},
        });
        const respChart = new SmoothieChart({
            millisPerPixel: 3,
            maxValue: 1.2,
            minValue: -1.2,
            interpolation: "linear",
            grid: commonGrid,
            labels: {fillStyle: "#7fdc7f"},
        });

        // Time series
        const ecgSeries = new TimeSeries();
        const plethSeries = new TimeSeries();
        const respSeries = new TimeSeries();

        ecgChart.addTimeSeries(ecgSeries, {strokeStyle: "#00ff00", lineWidth: 2});
        plethChart.addTimeSeries(plethSeries, {strokeStyle: "#00e5ff", lineWidth: 2});
        respChart.addTimeSeries(respSeries, {strokeStyle: "#ffffff", lineWidth: 2});

        ecgChart.streamTo(ecgRef.current, 250);
        plethChart.streamTo(plethRef.current, 250);
        respChart.streamTo(respRef.current, 250);

        // Simulation state
        let running = true;
        let ecgIdx = 0;
        let plethIdx = 0;
        let respIdx = 0;

        // start with test vitals; allow slight variability
        let heartRate = 78; // bpm
        let respirationRate = 16; // bpm
        let spo2Val = 98; // %
        let bpSys = 120, bpDia = 76; // mmHg

        const updateVitalsEvery = 1000; // ms

        // Drive sampling relative to HR/RR
        const tickMs = 20;

        const timer = setInterval(() => {
            if (!running) return;
            const now = Date.now();

            // Update indices according to current HR/RR
            const ecgSpb = Math.max(200, Math.round((60_000 / heartRate) / tickMs)); // samples per beat in ticks
            const plethSpb = ecgSpb;
            const respSpb = Math.max(500, Math.round((60_000 / respirationRate) / tickMs));

            // Map tick to template index
            ecgIdx = (ecgIdx + 1) % ecgSpb;
            plethIdx = (plethIdx + 1) % plethSpb;
            respIdx = (respIdx + 1) % respSpb;

            const ecgVal = ecgTemplate[Math.floor((ecgIdx / ecgSpb) * ecgTemplate.length)];
            const plethBase = plethTemplate[Math.floor((plethIdx / plethSpb) * plethTemplate.length)];
            const respVal = respTemplate[Math.floor((respIdx / respSpb) * respTemplate.length)];

            ecgSeries.append(now, ecgVal);
            plethSeries.append(now, (plethBase - 0.5) * 1.0); // center around 0
            respSeries.append(now, respVal);
        }, tickMs);

        // Slowly update vitals and randomly create alerts
        const vitalsTimer = setInterval(() => {
            // HR drift
            heartRate = Math.max(55, Math.min(130, heartRate + (Math.random() - 0.5) * 2));
            respirationRate = Math.max(8, Math.min(26, respirationRate + (Math.random() - 0.5) * 0.6));
            spo2Val = Math.max(92, Math.min(100, spo2Val + (Math.random() - 0.5) * 0.5));
            bpSys = Math.round(Math.max(90, Math.min(160, bpSys + (Math.random() - 0.5) * 2)));
            bpDia = Math.round(Math.max(55, Math.min(95, bpDia + (Math.random() - 0.5) * 1.5)));

            setHr(Math.round(heartRate));
            setRr(Math.round(respirationRate));
            setSpo2(Math.round(spo2Val));
            setBp({sys: bpSys, dia: bpDia});

            // Occasional alerts
            if (Math.random() < 0.12) {
                const t = new Date().toLocaleTimeString();
                const pick = Math.random();
                const a: AlertItem =
                    pick < 0.33 ? {id: cryptoRandomId(), time: t, level: "low", msg: "PVC detected"} :
                        pick < 0.66 ? {id: cryptoRandomId(), time: t, level: "medium", msg: "RR trending up"} :
                            {id: cryptoRandomId(), time: t, level: "high", msg: "HR > 120 bpm"};
                setAlerts(prev => [a, ...prev].slice(0, 25));
            }
        }, updateVitalsEvery);

        function cleanup() {
            running = false;
            clearInterval(timer);
            clearInterval(vitalsTimer);
            // Smoothie cleans up on GC. No explicit destroy.
        }

        return cleanup;
    }, [ecgTemplate, plethTemplate, respTemplate]);

    return (
        <div className="super-icu">
            <div className="main">
                {/* ECG row */}
                <div className="wave-row">
                    <div className="lead-label">ECG Lead II</div>
                    <div className="canvas-wrap">
                        <canvas ref={ecgRef} />
                    </div>
                    <div className="vitals">
                        <div className="vital hr">
                            <div className="label">HR</div>
                            <div className="value">{hr}<span style={{fontSize: 14, marginLeft: 4}}>bpm</span></div>
                        </div>
                        <div className="vital bp">
                            <div className="label">NIBP</div>
                            <div className="value">{bp.sys}/{bp.dia}</div>
                        </div>
                        <div className="vital">
                            <div className="label">PAIN</div>
                            <div className="value">0</div>
                        </div>
                    </div>
                </div>

                {/* SpO2 row */}
                <div className="wave-row">
                    <div className="lead-label">SpO₂ Pleth</div>
                    <div className="canvas-wrap">
                        <canvas ref={plethRef} />
                    </div>
                    <div className="vitals">
                        <div className="vital spo2">
                            <div className="label">SpO₂</div>
                            <div className="value">{spo2}<span style={{fontSize: 14}}>%</span></div>
                        </div>
                        <div className="vital">
                            <div className="label">Pi</div>
                            <div className="value">3.2</div>
                        </div>
                        <div className="vital">
                            <div className="label">Temp</div>
                            <div className="value">36.8</div>
                        </div>
                    </div>
                </div>

                {/* Resp row */}
                <div className="wave-row">
                    <div className="lead-label">RESP</div>
                    <div className="canvas-wrap">
                        <canvas ref={respRef} />
                    </div>
                    <div className="vitals">
                        <div className="vital rr">
                            <div className="label">RR</div>
                            <div className="value">{rr}<span style={{fontSize: 14, marginLeft: 4}}>rpm</span></div>
                        </div>
                        <div className="vital">
                            <div className="label">EtCO₂</div>
                            <div className="value">38</div>
                        </div>
                        <div className="vital">
                            <div className="label">FiO₂</div>
                            <div className="value">21</div>
                        </div>
                    </div>
                </div>

                {/* Status bar */}
                <div className="status-bar">
                    <span className="status-pill">Patient: TEST-001</span>
                    <span className="status-pill">Bed: ICU-7</span>
                    <span className="status-pill">Leads: II</span>
                    <span className="status-pill">Alarms: On</span>
                    <span className="status-pill">{new Date().toLocaleTimeString()}</span>
                </div>
            </div>

            {/* Right side panel */}
            <div className="side">
                <div className="side-header">Alerts</div>
                <div className="alerts">
                    {alerts.map(a => (
                        <div key={a.id} className={`alert ${a.level}`}>
                            <div className="time">{a.time}</div>
                            <div className="msg">{a.msg}</div>
                        </div>
                    ))}
                </div>
                <div className="ai-box">
                    <div style={{color: "#9cff9c", fontSize: 14}}>AI side panel (placeholder)</div>
                    <textarea placeholder="Type your analysis, instructions, or notes..." />
                    <div className="ai-actions">
                        <button onClick={() => setAlerts(prev => [{
                            id: cryptoRandomId(),
                            time: new Date().toLocaleTimeString(),
                            level: "low",
                            msg: "AI: Noted your input"
                        }, ...prev])}>Save Note
                        </button>
                        <button onClick={() => setAlerts(prev => [{
                            id: cryptoRandomId(),
                            time: new Date().toLocaleTimeString(),
                            level: "medium",
                            msg: "AI: Suggested increasing sampling"
                        }, ...prev])}>Run Check
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function cryptoRandomId() {
    try {
        // @ts-ignore
        const b = (crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(8)) : null;
        if (b) return Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("");
    } catch {
    }
    return Math.random().toString(36).slice(2);
}
