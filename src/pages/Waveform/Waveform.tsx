import React, {useCallback, useEffect, useRef, useState} from "react";
import Plot from "react-plotly.js";
import CircularBuffer from "./CircularBuffer";
import {generateDemoSignal} from "./DemoSignalGenerators";

const SAMPLE_RATE = 125; // Hz
const WINDOW_SECONDS = 5;
const BUFFER_SIZE = SAMPLE_RATE * WINDOW_SECONDS;
const REFRESH_INTERVAL_MS = 33;

type SignalConfig = {
    name: string;
    color: string;
    range: [number, number];
    unit: string;
};

const DEMO_SIGNALS: SignalConfig[] = [
    {name: "ECG II", color: "#e74c3c", range: [-2, 2], unit: "mV"},
    {name: "ABP", color: "#3498db", range: [0, 200], unit: "mmHg"},
    {name: "SpO2", color: "#2ecc71", range: [80, 100], unit: "%"},
    {name: "RESP", color: "#9b59b6", range: [-1, 1], unit: "V"}
];

export default function Waveform() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [, setForceUpdate] = useState(0);
    const [panOffset, setPanOffset] = useState(0);
    const [isPanning, setIsPanning] = useState(false);

    // Refs for animation and buffers
    const offsetRef = useRef(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const buffersRef = useRef<Record<string, { x: CircularBuffer<number>; y: CircularBuffer<number> }>>({});

    // Initialize buffers for each signal
    useEffect(() => {
        const newBuffers: Record<string, { x: CircularBuffer<number>; y: CircularBuffer<number> }> = {};

        DEMO_SIGNALS.forEach(signal => {
            newBuffers[signal.name] = {
                x: new CircularBuffer<number>(BUFFER_SIZE),
                y: new CircularBuffer<number>(BUFFER_SIZE)
            };
        });

        buffersRef.current = newBuffers;
    }, []);

    const togglePlayback = useCallback(() => {
        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    const resetData = useCallback(() => {
        Object.values(buffersRef.current).forEach(buffer => {
            buffer.x.clear();
            buffer.y.clear();
        });
        offsetRef.current = 0;
        setIsPlaying(false);
        setForceUpdate(v => v + 1);
    }, []);

    // Animation loop
    useEffect(() => {
        if (!isPlaying) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        timerRef.current = setInterval(() => {
            const chunkLength = Math.round((SAMPLE_RATE * REFRESH_INTERVAL_MS) / 1000);
            const offset = offsetRef.current;

            // Generate data for each signal
            DEMO_SIGNALS.forEach(signal => {
                const {x, y} = generateDemoSignal(offset, chunkLength, signal.name, SAMPLE_RATE);
                const buffer = buffersRef.current[signal.name];
                if (buffer) {
                    buffer.x.pushMany(x);
                    buffer.y.pushMany(y);
                }
            });

            offsetRef.current += chunkLength / SAMPLE_RATE;
            setForceUpdate(v => v + 1);
        }, REFRESH_INTERVAL_MS);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isPlaying]);

    // Prepare plot data
    const plotData = DEMO_SIGNALS.map((signal, index) => {
        const buffer = buffersRef.current[signal.name];
        return {
            x: buffer?.x.toArray() ?? [],
            y: buffer?.y.toArray() ?? [],
            type: "scatter" as const,
            mode: "lines" as const,
            name: `${signal.name} (${signal.unit})`,
            line: {color: signal.color, width: 2},
            yaxis: `y${index + 1}` as const,
            showlegend: true
        };
    });

    // Create subplot layout
    const numSignals = DEMO_SIGNALS.length;
    const currentTime = offsetRef.current + panOffset;

    // Start at 0 on the left, not centered
    const xAxisRange: [number, number] = [currentTime, currentTime + WINDOW_SECONDS];

    const layout: Partial<Plotly.Layout> = {
        title: {text: "Medical Waveform Viewer"},
        height: 600,
        showlegend: true,
        legend: {x: 1, y: 1},
        margin: {l: 80, r: 50, t: 50, b: 50},
        dragmode: "pan",
        xaxis: {
            title: {text: "Time (s)"},
            range: xAxisRange,
            fixedrange: false,
            type: "linear"
        }
    };

    // Create y-axes for each signal
    DEMO_SIGNALS.forEach((signal, index) => {
        const yAxisKey = index === 0 ? "yaxis" : `yaxis${index + 1}`;
        const domainStart = (numSignals - 1 - index) / numSignals;
        const domainEnd = (numSignals - index) / numSignals;

        (layout as Record<string, unknown>)[yAxisKey] = {
            title: `${signal.name} (${signal.unit})`,
            titlefont: {color: signal.color},
            range: signal.range,
            domain: [domainStart + 0.01, domainEnd - 0.01],
            fixedrange: true // Keep y-axes fixed, no vertical zoom
        };
    });

    // New panning functions
    const panLeft = useCallback(() => {
        setPanOffset(prev => prev - 1);
        setIsPanning(true);
        setTimeout(() => setIsPanning(false), 200);
    }, []);

    const panRight = useCallback(() => {
        setPanOffset(prev => prev + 1);
        setIsPanning(true);
        setTimeout(() => setIsPanning(false), 200);
    }, []);

    const jumpBackward = useCallback(() => {
        setPanOffset(prev => prev - 5);
        setIsPanning(true);
        setTimeout(() => setIsPanning(false), 200);
    }, []);

    const jumpForward = useCallback(() => {
        setPanOffset(prev => prev + 5);
        setIsPanning(true);
        setTimeout(() => setIsPanning(false), 200);
    }, []);

    const resetPan = useCallback(() => {
        setPanOffset(0);
        setIsPanning(false);
    }, []);

    // Keyboard controls
    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.target instanceof HTMLInputElement) return; // Don't interfere with input fields

            switch (event.key) {
                case "ArrowLeft":
                    event.preventDefault();
                    panLeft();
                    break;
                case "ArrowRight":
                    event.preventDefault();
                    panRight();
                    break;
                case "PageUp":
                    event.preventDefault();
                    jumpBackward();
                    break;
                case "PageDown":
                    event.preventDefault();
                    jumpForward();
                    break;
                case "Home":
                    event.preventDefault();
                    resetPan();
                    break;
                case " ":
                    event.preventDefault();
                    togglePlayback();
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyPress);
        return () => window.removeEventListener("keydown", handleKeyPress);
    }, [togglePlayback, panLeft, panRight, jumpBackward, jumpForward, resetPan]);

    return (
        <div style={{padding: "20px"}}>
            <h1>Waveform Viewer</h1>

            {/* Main Controls */}
            <div style={{marginBottom: "20px"}}>
                <button
                    onClick={togglePlayback}
                    style={{
                        marginRight: "10px",
                        padding: "10px 20px",
                        backgroundColor: isPlaying ? "#e74c3c" : "#27ae60",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "bold"
                    }}
                >
                    {isPlaying ? "⏸ Stop" : "▶ Start"}
                </button>

                <button
                    onClick={resetData}
                    style={{
                        padding: "10px 20px",
                        backgroundColor: "#34495e",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                        fontSize: "14px"
                    }}
                >
                    🔄 Reset
                </button>
            </div>

            {/* Horizontal Navigation Controls */}
            <div style={{
                marginBottom: "20px",
                padding: "15px",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                border: "1px solid #dee2e6"
            }}>
                <p style={{margin: "0 0 10px 0", fontWeight: "bold", color: "#495057"}}>
                    🎛️ Navigation Controls
                </p>

                <div style={{display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap"}}>
                    <button
                        onClick={jumpBackward}
                        style={{
                            padding: "8px 12px",
                            backgroundColor: "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px"
                        }}
                        title="Jump back 5 seconds (PageUp)"
                    >
                        ⏪ -5s
                    </button>

                    <button
                        onClick={panLeft}
                        style={{
                            padding: "8px 12px",
                            backgroundColor: "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px"
                        }}
                        title="Pan left 1 second (←)"
                    >
                        ← -1s
                    </button>

                    <button
                        onClick={resetPan}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "bold"
                        }}
                        title="Return to live view (Home)"
                    >
                        🏠 Live
                    </button>

                    <button
                        onClick={panRight}
                        style={{
                            padding: "8px 12px",
                            backgroundColor: "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px"
                        }}
                        title="Pan right 1 second (→)"
                    >
                        +1s →
                    </button>

                    <button
                        onClick={jumpForward}
                        style={{
                            padding: "8px 12px",
                            backgroundColor: "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px"
                        }}
                        title="Jump forward 5 seconds (PageDown)"
                    >
                        +5s ⏩
                    </button>

                    <span style={{
                        marginLeft: "15px",
                        padding: "6px 12px",
                        backgroundColor: "#e9ecef",
                        borderRadius: "4px",
                        fontSize: "12px",
                        color: "#495057"
                    }}>
                        Offset: {panOffset > 0 ? "+" : ""}{panOffset}s
                    </span>
                </div>

                <div style={{marginTop: "8px", fontSize: "11px", color: "#6c757d"}}>
                    💡 <strong>Keyboard shortcuts:</strong> ←/→ (pan), PageUp/PageDown (jump), Home (live), Space (play/pause)
                </div>
            </div>

            {/* Future API controls - currently disabled */}
            <div style={{
                marginBottom: "20px",
                padding: "10px",
                backgroundColor: "#f8f9fa",
                borderRadius: "5px",
                opacity: 0.5
            }}>
                <p><strong>API Integration (Coming Soon):</strong></p>
                <input
                    type="text"
                    placeholder="Record Name"
                    disabled
                    style={{marginRight: "10px", padding: "5px"}}
                />
                <button disabled style={{padding: "5px 10px"}}>
                    Load Record
                </button>
            </div>

            {/* Plot */}
            <Plot
                data={plotData}
                layout={layout}
                config={{
                    responsive: true,
                    displayModeBar: true,
                    modeBarButtonsToRemove: ["select2d", "lasso2d", "autoScale2d", "zoom2d"],
                    scrollZoom: true,
                    doubleClick: "reset+autosize"
                }}
                style={{width: "100%", height: "600px"}}
                onRelayout={(event) => {
                    // Handle user interactions
                    if (event["xaxis.range[0]"] !== undefined) {
                        const start = event["xaxis.range[0]"] as number;
                        const newOffset = start - offsetRef.current;
                        setPanOffset(newOffset);

                        setIsPanning(true);
                        setTimeout(() => setIsPanning(false), 100);
                    }
                }}
            />
        </div>
    );
}
