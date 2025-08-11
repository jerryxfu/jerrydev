import React, {useEffect, useRef, useState} from "react";
import Plot from "react-plotly.js";
import CircularBuffer from "./CircularBuffer";

const SAMPLE_RATE = 125; // Hz
const WINDOW_SECONDS = 5;
const BUFFER_SIZE = SAMPLE_RATE * WINDOW_SECONDS;
const REFRESH_INTERVAL_MS = 40;

const SIGNALS = [
    {key: "II", name: "ECG II", color: "red", range: [-2, 2], unit: "mV"},
    {key: "PLETH", name: "PLETH", color: "purple", range: [0, 100], unit: "%"},
    {key: "SPO2", name: "SpO2", color: "orange", range: [90, 100], unit: "%"},
    {key: "ABP", name: "ABP", color: "blue", range: [45, 200], unit: "mmHg"},
];

type SignalBuffers = Record<string, { x: CircularBuffer<number>; y: CircularBuffer<number> }>;

//region DUMMY DATA GENERATORS - REMOVE THIS SECTION FOR REAL DATA
function generateECGLeadII(offset: number, length: number): { x: number[], y: number[] } {
    const x = Array.from({length}, (_, i) => i / SAMPLE_RATE + offset);
    const y: number[] = [];
    const heartRate = 75;
    const rrInterval = 60 / heartRate;

    for (let i = 0; i < x.length; i++) {
        const t = x[i]!;
        let ecgValue = 0;
        const cyclePosition = (t % rrInterval) / rrInterval;

        if (cyclePosition < 0.1) {
            // P wave
            ecgValue = 0.15 * Math.sin(Math.PI * cyclePosition / 0.1);
        } else if (cyclePosition >= 0.15 && cyclePosition < 0.35) {
            // QRS complex
            const qrsPhase = (cyclePosition - 0.15) / 0.2;
            if (qrsPhase < 0.3) {
                ecgValue = -0.1 * Math.sin(Math.PI * qrsPhase / 0.3);
            } else if (qrsPhase < 0.7) {
                ecgValue = 1.2 * Math.sin(Math.PI * (qrsPhase - 0.3) / 0.4);
            } else {
                ecgValue = -0.3 * Math.sin(Math.PI * (qrsPhase - 0.7) / 0.3);
            }
        } else if (cyclePosition >= 0.45 && cyclePosition < 0.75) {
            // T wave
            ecgValue = 0.3 * Math.sin(Math.PI * (cyclePosition - 0.45) / 0.3);
        }

        const baselineDrift = 0.05 * Math.sin(0.1 * t);
        const noise = 0.02 * (Math.random() - 0.5);
        y.push(ecgValue + baselineDrift + noise);
    }

    return {x, y};
}

function generateBloodPressure(offset: number, length: number): { x: number[], y: number[] } {
    const x = Array.from({length}, (_, i) => i / SAMPLE_RATE + offset);
    const y: number[] = [];
    const heartRate = 75;
    const rrInterval = 60 / heartRate;
    const systolic = 120;
    const diastolic = 80;

    for (let i = 0; i < x.length; i++) {
        const t = x[i]!;
        const cyclePosition = (t % rrInterval) / rrInterval;
        let pressure = diastolic;

        if (cyclePosition < 0.3) {
            pressure = diastolic + (systolic - diastolic) * Math.sin(Math.PI * cyclePosition / 0.6);
        } else if (cyclePosition < 0.4) {
            pressure = systolic * (1 - 0.1 * (cyclePosition - 0.3) / 0.1);
        } else {
            const diastolicPhase = (cyclePosition - 0.4) / 0.6;
            if (diastolicPhase < 0.1) {
                pressure = systolic * 0.9 + 5 * Math.sin(Math.PI * diastolicPhase / 0.1);
            } else {
                pressure = diastolic + (systolic * 0.9 - diastolic) * Math.exp(-5 * (diastolicPhase - 0.1));
            }
        }

        const respInfluence = 2 * Math.sin(2 * Math.PI * 0.25 * t);
        const noise = 0.5 * (Math.random() - 0.5);
        y.push(pressure + respInfluence + noise);
    }

    return {x, y};
}

function generatePlethysmography(offset: number, length: number): { x: number[], y: number[] } {
    const x = Array.from({length}, (_, i) => i / SAMPLE_RATE + offset);
    const y: number[] = [];
    const heartRate = 75;
    const rrInterval = 60 / heartRate;

    for (let i = 0; i < x.length; i++) {
        const t = x[i]!;
        const cyclePosition = (t % rrInterval) / rrInterval;
        let plethValue = 0;

        if (cyclePosition < 0.4) {
            plethValue = Math.sin(Math.PI * cyclePosition / 0.4) * 35;
        } else if (cyclePosition < 0.6) {
            plethValue = 35 * (1 - 0.3 * (cyclePosition - 0.4) / 0.2);
        } else {
            plethValue = 24.5 * Math.exp(-3 * (cyclePosition - 0.6) / 0.4);
        }

        const respModulation = 6 * Math.sin(1.57 * t);
        const baselineDrift = 2 * Math.sin(0.08 * t);
        const noise = 0.3 * (Math.random() - 0.5);
        const plethSignal = 50 + plethValue + respModulation + baselineDrift + noise;

        y.push(plethSignal);
    }

    return {x, y};
}

function generateSpO2(offset: number, length: number): { x: number[], y: number[] } {
    const x = Array.from({length}, (_, i) => i / SAMPLE_RATE + offset);
    const y: number[] = [];
    const heartRate = 75;
    const rrInterval = 60 / heartRate;
    const baseSpO2 = 97;

    for (let i = 0; i < x.length; i++) {
        const t = x[i]!;
        const cyclePosition = (t % rrInterval) / rrInterval;
        const cardiacVariation = 0.3 * Math.sin(2 * Math.PI * cyclePosition);
        const respModulation = 0.5 * Math.sin(2 * Math.PI * 0.25 * t);
        const slowDrift = 0.8 * Math.sin(0.02 * t);
        const noise = 0.2 * (Math.random() - 0.5);
        const spo2Value = baseSpO2 + cardiacVariation + respModulation + slowDrift + noise;

        y.push(Math.max(90, Math.min(100, spo2Value)));
    }

    return {x, y};
}

function generateFakeSignal(offset: number, length: number, signalKey: string) {
    switch (signalKey) {
        case "II":
            return generateECGLeadII(offset, length);
        case "PLETH":
            return generatePlethysmography(offset, length);
        case "SPO2":
            return generateSpO2(offset, length);
        case "ABP":
            return generateBloodPressure(offset, length);
        default:
            const x = Array.from({length}, (_, i) => i / SAMPLE_RATE + offset);
            const y = x.map((t) => Math.sin(2 * Math.PI * 0.5 * t) + 0.1 * Math.random());
            return {x, y};
    }
}

//endregion

export default function Waveform() {
    const [playing, setPlaying] = useState(true);
    const [forceUpdate, setForceUpdate] = useState(0);
    const [isUserZoomed, setIsUserZoomed] = useState(false);
    const [zoomWindow, setZoomWindow] = useState(WINDOW_SECONDS);
    const offsetRef = useRef(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const plotRef = useRef<any>(null);

    const buffersRef = useRef<SignalBuffers>((() => {
        const obj: SignalBuffers = {};
        for (const sig of SIGNALS) {
            obj[sig.key] = {
                x: new CircularBuffer<number>(BUFFER_SIZE),
                y: new CircularBuffer<number>(BUFFER_SIZE),
            };
        }
        return obj;
    })());

    function resetBuffers() {
        SIGNALS.forEach(sig => {
            buffersRef.current[sig.key]?.x.clear();
            buffersRef.current[sig.key]?.y.clear();
        });
        offsetRef.current = 0;
        setIsUserZoomed(false);
        setZoomWindow(WINDOW_SECONDS);
        setForceUpdate((v) => v + 1);
    }

    const handleRelayout = (eventData: any) => {
        const start = eventData["xaxis.range[0]"];
        const end = eventData["xaxis.range[1]"];
        if (start !== undefined && end !== undefined) {
            const newZoomWindow = end - start;
            const diff = Math.abs(newZoomWindow - WINDOW_SECONDS);

            if (diff > 0.5) {
                setIsUserZoomed(true);
                setZoomWindow(newZoomWindow);
            } else if (diff < 0.1) {
                setIsUserZoomed(false);
                setZoomWindow(WINDOW_SECONDS);
            }
        }
    };

    useEffect(() => {
        if (!playing || !isUserZoomed) return;

        const autoScrollTimer = setInterval(() => {
            setForceUpdate(v => v + 1);
        }, REFRESH_INTERVAL_MS * 4);

        return () => clearInterval(autoScrollTimer);
    }, [playing, isUserZoomed]);

    useEffect(() => {
        if (!playing) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        timerRef.current = setInterval(() => {
            const chunkLength = Math.round((SAMPLE_RATE * REFRESH_INTERVAL_MS) / 1000);
            const offset = offsetRef.current;

            SIGNALS.forEach(sig => {
                const {x, y} = generateFakeSignal(offset, chunkLength, sig.key);
                buffersRef.current[sig.key]?.x.pushMany(x);
                buffersRef.current[sig.key]?.y.pushMany(y);
            });

            offsetRef.current += chunkLength / SAMPLE_RATE;
            setForceUpdate((v) => v + 1);
        }, REFRESH_INTERVAL_MS);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [playing]);

    const plotData = SIGNALS.map((sig, index) => ({
        x: buffersRef.current[sig.key]?.x.toArray() ?? [],
        y: buffersRef.current[sig.key]?.y.toArray() ?? [],
        type: "scatter" as const,
        mode: "lines" as const,
        name: `${sig.name} (${sig.unit})`,
        line: {color: sig.color},
        xaxis: index === SIGNALS.length - 1 ? "x" : `x${index + 1}` as const,
        yaxis: `y${index + 1}` as const,
        showlegend: true,
    }));

    const numSignals = SIGNALS.length;
    const subplotGap = 0.02;
    const subplotHeight = (1 - (numSignals - 1) * subplotGap) / numSignals;
    const dynamicAxes: any = {};

    SIGNALS.forEach((sig, index) => {
        const isLast = index === SIGNALS.length - 1;
        const axisKey = isLast ? "xaxis" : `xaxis${index + 1}`;

        dynamicAxes[axisKey] = {
            fixedrange: false,
            domain: [0, 1],
            anchor: `y${index + 1}` as const,
            matches: "x" as const,
            showticklabels: isLast,
            ...(isLast && {title: {text: "Time (s)"}}),
            ...(isUserZoomed && {range: [offsetRef.current - zoomWindow, offsetRef.current]}),
        };

        const yAxisKey = `yaxis${index === 0 ? "" : index + 1}`;
        const domainStart = (numSignals - 1 - index) * (subplotHeight + subplotGap);
        const domainEnd = index === 0 ? 1.0 : domainStart + subplotHeight;
        const adjustedDomainStart = index === 0 ? (1.0 - subplotHeight) : domainStart;

        dynamicAxes[yAxisKey] = {
            title: {text: `${sig.name} (${sig.unit})`, color: sig.color, font: {size: 11}},
            range: sig.range,
            fixedrange: true,
            domain: [adjustedDomainStart, domainEnd],
            anchor: isLast ? "x" : `x${index + 1}` as const,
            showgrid: true,
            gridcolor: "rgba(128,128,128,0.15)",
            zeroline: false,
            showline: true,
            linecolor: "rgba(128,128,128,0.3)",
        };
    });

    const layout = {
        title: {text: `Waveform Previewer - ${numSignals} channel${numSignals > 1 ? "s" : ""} (rolling ${WINDOW_SECONDS}s window)`},
        ...dynamicAxes,
        height: Math.max(600, numSignals * 200),
        margin: {t: 60, r: 100, b: 100, l: 100},
        legend: {orientation: "h" as const, y: -0.06},
        dragmode: "pan" as const,
        uirevision: "constant",
    };

    return (
        <div>
            <div style={{marginBottom: 8}}>
                <button onClick={() => setPlaying(p => !p)}>{playing ? "Pause" : "Play"}</button>
                <button onClick={resetBuffers} style={{marginLeft: 8}}>Reset</button>
            </div>
            <Plot
                data={plotData}
                layout={layout}
                style={{width: "100%"}}
                config={{
                    scrollZoom: true,
                    doubleClick: "reset",
                    displayModeBar: true,
                    modeBarButtonsToRemove: ["pan2d", "select2d", "lasso2d", "zoomIn2d", "zoomOut2d", "resetScale2d"],
                    modeBarButtonsToAdd: ["pan2d"],
                }}
                onRelayout={handleRelayout}
            />
        </div>
    );
}
