import {useEffect, useRef, useState} from "react";
import {ArrowDown, ArrowUp} from "lucide-react";
import {type PartState, type UploadSnapshot} from "../types.ts";
import {formatBytes, formatEta, formatSpeed} from "../utils.ts";
import "./UploadProgress.scss";

interface Props {
    snapshot: UploadSnapshot;
}

const SPEED_WINDOW_MS = 3000;

type Sample = { t: number; loaded: number };
type Dir = "up" | "down" | "flat";

const STATE_LETTER: Record<PartState, string> = {
    queued: "Q", uploading: "U", done: "D", retrying: "R", failed: "F"
};

function speedFrom(samples: Sample[], now: number): number {
    const cut = now - SPEED_WINDOW_MS;
    const win = samples.filter((s) => s.t >= cut);
    if (win.length < 2) return 0;
    const first = win[0], last = win[win.length - 1];
    const dt = (last.t - first.t) / 1000;
    if (dt <= 0) return 0;
    return Math.max(0, (last.loaded - first.loaded) / dt);
}

export default function UploadProgress({snapshot}: Props) {
    // refs survive renders without retriggering effects
    const snapRef = useRef<UploadSnapshot>(snapshot);
    const overallSamples = useRef<Sample[]>([]);
    const partSamples = useRef<Map<number, Sample[]>>(new Map());
    const prevStates = useRef<Map<number, PartState>>(new Map());
    const prevSpeeds = useRef<Map<number, number>>(new Map());
    const tickRef = useRef(0);

    const [flashing, setFlashing] = useState<Set<number>>(new Set());
    const [stats, setStats] = useState<{
        overallSpeed: number; eta: number; tick: number;
        parts: Map<number, { speed: number; dir: Dir }>;
    }>({overallSpeed: 0, eta: Infinity, tick: 0, parts: new Map()});

    // record samples + detect status changes for flashing
    useEffect(() => {
        snapRef.current = snapshot;
        const t = Date.now();
        overallSamples.current.push({t, loaded: snapshot.uploadedBytes});

        for (const p of snapshot.parts) {
            let arr = partSamples.current.get(p.partNumber);
            if (!arr) {
                arr = [];
                partSamples.current.set(p.partNumber, arr);
            }
            arr.push({t, loaded: p.loaded});

            const prev = prevStates.current.get(p.partNumber);
            if (prev && prev !== p.state) {
                setFlashing((s) => new Set(s).add(p.partNumber));
                window.setTimeout(() => {
                    setFlashing((s) => {
                        const next = new Set(s);
                        next.delete(p.partNumber);
                        return next;
                    });
                }, 600);
            }
            prevStates.current.set(p.partNumber, p.state);
        }
    }, [snapshot]);

    // recompute displayed speeds (ticker cadence, readable flashes)
    useEffect(() => {
        const id = window.setInterval(() => {
            const snap = snapRef.current;
            const now = Date.now();
            const overallSpeed = speedFrom(overallSamples.current, now);
            const remaining = snap.totalBytes - snap.uploadedBytes;
            const eta = overallSpeed > 0 ? remaining / overallSpeed : Infinity;

            const parts = new Map<number, { speed: number; dir: Dir }>();
            for (const p of snap.parts) {
                const speed = speedFrom(partSamples.current.get(p.partNumber) ?? [], now);
                const prev = prevSpeeds.current.get(p.partNumber) ?? 0;
                const dir: Dir = speed > prev * 1.03 ? "up" : speed < prev * 0.97 ? "down" : "flat";
                prevSpeeds.current.set(p.partNumber, speed);
                parts.set(p.partNumber, {speed, dir});
            }
            tickRef.current += 1;
            setStats({overallSpeed, eta, parts, tick: tickRef.current});
        }, 500); // refresh rate
        return () => window.clearInterval(id);
    }, []);

    const pct = snapshot.totalBytes > 0 ? (snapshot.uploadedBytes / snapshot.totalBytes) * 100 : 0;

    // active parts (with a bar); sorted most-complete first
    const activeParts = snapshot.parts
        .filter((p) => p.state === "uploading" || p.state === "retrying")
        .sort((a, b) => (b.loaded / b.total) - (a.loaded / a.total));

    return (
        <div className="expedite_progress">
            <div className="expedite_progress-head">
                <p className="expedite_progress-title">Uploading your file…</p>
            </div>

            {/* Global progress */}
            <div className="expedite_progress-overall">
                <div className="expedite_progress-bar">
                    <div className="expedite_progress-fill" style={{width: `${pct}%`}} />
                </div>
                <div className="expedite_progress-meta">
                    <span>{pct.toFixed(1)}%</span>
                    <span>{formatBytes(snapshot.uploadedBytes)} / {formatBytes(snapshot.totalBytes)}</span>
                    <span>{formatSpeed(stats.overallSpeed)}</span>
                    <span>ETA {formatEta(stats.eta)}</span>
                </div>
            </div>

            {/* Grid — stable order, nothing shifts */}
            {snapshot.mode === "multipart" && (
                <>
                    <div className="expedite_progress-grid">
                        {snapshot.parts.map((p) => (
                            <span
                                key={p.partNumber}
                                className={`expedite_grid-cell state-${p.state}${flashing.has(p.partNumber) ? " flash" : ""}`}
                            >
                                {STATE_LETTER[p.state]}
                            </span>
                        ))}
                    </div>
                    <p className="expedite_progress-legend">
                        Q queued · U uploading · D done · R retrying · F failed
                    </p>
                </>
            )}

            {/* Active-part cards */}
            <div className="expedite_progress-cards">
                {activeParts.map((p) => {
                    const st = stats.parts.get(p.partNumber);
                    const dir = st?.dir ?? "flat";
                    const ppct = p.total > 0 ? (p.loaded / p.total) * 100 : 0;
                    return (
                        <div
                            key={p.partNumber}
                            className={`expedite_progress-card${flashing.has(p.partNumber) ? " flash" : ""}`}
                        >
                            <div className="expedite_card-row">
                                <span className="expedite_card-name">Part {p.partNumber}</span>
                                <span className="expedite_card-status">
                                    {p.state === "retrying" ? "retrying…" : "uploading"}
                                </span>
                                <span
                                    key={`${p.partNumber}-${stats.tick}`}
                                    className={`expedite_card-speed tick-${dir}`}
                                >
                                    {dir === "up" && <ArrowUp size={11} className="arrow-up" />}
                                    {dir === "down" && <ArrowDown size={11} className="arrow-down" />}
                                    {formatSpeed(st?.speed ?? 0)}
                                </span>
                            </div>
                            <div className="expedite_card-bar">
                                <div className="expedite_card-fill" style={{width: `${ppct}%`}} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}