import React, {useEffect, useRef, useState} from "react";
import Plot from "react-plotly.js";
import CircularBuffer from "./CircularBuffer";

const SAMPLE_RATE = 125; // samples per second
const WINDOW_SECONDS = 10; // rolling window size
const BUFFER_SIZE = SAMPLE_RATE * WINDOW_SECONDS;
const REFRESH_INTERVAL_MS = 50; // Set your desired refresh rate in ms

const SIGNALS = [
    {key: "II", name: "ECG II", color: "red", freq: 1},
    {key: "PLETH", name: "PLETH", color: "green", freq: 0.5},
    {key: "ABP", name: "ABP", color: "blue", freq: 0.25},
];

type SignalBuffers = Record<string, { x: CircularBuffer<number>; y: CircularBuffer<number> }>;

function generateFakeSignal(offset: number, length: number, frequencyHz: number) {
    const x = Array.from({length}, (_, i) => i / SAMPLE_RATE + offset);
    const y = x.map((t) => Math.sin(2 * Math.PI * frequencyHz * t) + 0.1 * Math.random());
    return {x, y};
}

export default function Waveform() {
    // Playback state
    const [playing, setPlaying] = useState(true);
    const [_, setRerender] = useState(0); // force rerender
    const offsetRef = useRef(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    // Buffers for each signal
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

    // Reset all buffers
    function resetBuffers() {
        for (const sig of SIGNALS) {
            buffersRef.current[sig.key]?.x.clear();
            buffersRef.current[sig.key]?.y.clear();
        }
        offsetRef.current = 0;
        setRerender((v) => v + 1);
    }

    // Streaming simulation
    useEffect(() => {
        if (!playing) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }
        timerRef.current = setInterval(() => {
            const chunkLength = SAMPLE_RATE / 2; // 0.5 seconds chunk
            const offset = offsetRef.current;
            for (const sig of SIGNALS) {
                const {x, y} = generateFakeSignal(offset, chunkLength, sig.freq);
                buffersRef.current[sig.key]?.x.pushMany(x);
                buffersRef.current[sig.key]?.y.pushMany(y);
            }
            offsetRef.current += chunkLength / SAMPLE_RATE;
            setRerender((v) => v + 1); // force rerender
        }, REFRESH_INTERVAL_MS);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [playing]);

    // Prepare data for plotting
    const plotData = SIGNALS.map((sig) => ({
        x: buffersRef.current[sig.key]?.x.toArray() ?? [],
        y: buffersRef.current[sig.key]?.y.toArray() ?? [],
        type: "scatter" as const,
        mode: "lines" as const,
        name: sig.name,
        line: {color: sig.color},
    }));
    const xMin = plotData[0]?.x[0] ?? 0;
    const xMax = plotData[0]?.x[plotData[0]?.x.length - 1] ?? WINDOW_SECONDS;
    const layout = {
        title: {text: "Waveform Previewer (Rolling 10s Window)"},
        xaxis: {title: {text: "Time (s)"}, range: [xMin, xMax]},
        yaxis: {title: {text: "Amplitude"}, autorange: true},
        height: 400,
        margin: {t: 30, r: 30, b: 40, l: 50},
        legend: {orientation: "h" as const, y: -0.2},
    };

    return (
        <div>
            <div style={{marginBottom: 8}}>
                <button onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Play"}</button>
                <button onClick={resetBuffers} style={{marginLeft: 8}}>Reset</button>
            </div>
            <Plot data={plotData} layout={layout} style={{width: "100%"}} />
        </div>
    );
}
