import {useEffect, useMemo, useState} from "react";
import "./UnixConverter.scss";

type Unit = "s" | "ms";

function nowUnix(unit: Unit): number {
    return unit === "s" ? Math.floor(Date.now() / 1000) : Date.now();
}

function toDate(ts: number, unit: Unit): Date {
    return new Date(unit === "s" ? ts * 1000 : ts);
}

export default function UnixConverter() {
    const [unit, setUnit] = useState<Unit>("s");
    const [live, setLive] = useState(() => nowUnix("s"));
    const [tsInput, setTsInput] = useState("");
    const [dateInput, setDateInput] = useState("");

    // ticking current timestamp

    useEffect(() => {
        const id = setInterval(() => setLive(nowUnix(unit)), unit === "s" ? 1000 : 50);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLive(nowUnix(unit));
        return () => clearInterval(id);
    }, [unit]);

    // timestamp → date
    const parsed = useMemo(() => {
        const n = Number(tsInput.trim());
        if (!tsInput.trim() || !Number.isFinite(n)) return null;
        const d = toDate(n, unit);
        if (isNaN(d.getTime())) return null;
        return d;
    }, [tsInput, unit]);

    // date → timestamp
    const computedTs = useMemo(() => {
        if (!dateInput) return null;
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return null;
        return unit === "s" ? Math.floor(d.getTime() / 1000) : d.getTime();
    }, [dateInput, unit]);

    return (
        <div className="unix">
            <div className="unix_live">
                <span className="unix_live-label">Current Unix time</span>
                <span className="time_mono unix_live-value" onClick={() => navigator.clipboard.writeText(String(live))}>
                    {live}
                </span>
                <div className="unix_unit-toggle">
                    <button className={unit === "s" ? "active" : ""} onClick={() => setUnit("s")}>seconds</button>
                    <button className={unit === "ms" ? "active" : ""} onClick={() => setUnit("ms")}>ms</button>
                </div>
            </div>

            <div className="unix_grid">
                <div className="unix_card">
                    <label className="unix_card-label">Timestamp → date</label>
                    <input
                        className="time_mono unix_input"
                        placeholder={String(nowUnix(unit))}
                        value={tsInput}
                        onChange={(e) => setTsInput(e.target.value.replace(/[^\d-]/g, ""))}
                        inputMode="numeric"
                    />
                    {parsed && (
                        <div className="unix_out">
                            <Row label="Local" value={parsed.toLocaleString()} />
                            <Row label="UTC" value={parsed.toUTCString()} />
                            <Row label="ISO 8601" value={parsed.toISOString()} mono />
                            <Row label="Relative" value={relative(parsed)} />
                        </div>
                    )}
                </div>

                <div className="unix_card">
                    <label className="unix_card-label">Date → timestamp</label>
                    <input
                        className="unix_input"
                        type="datetime-local"
                        value={dateInput}
                        onChange={(e) => setDateInput(e.target.value)}
                    />
                    {computedTs !== null && (
                        <div className="unix_out">
                            <Row label={unit === "s" ? "Unix (s)" : "Unix (ms)"} value={String(computedTs)} mono copy />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Row({label, value, mono, copy}: { label: string; value: string; mono?: boolean; copy?: boolean }) {
    return (
        <div className="unix_row">
            <span className="unix_row-label">{label}</span>
            <span
                className={`unix_row-value ${mono ? "time_mono" : ""} ${copy ? "is-copy" : ""}`}
                onClick={copy ? () => navigator.clipboard.writeText(value) : undefined}
            >
                {value}
            </span>
        </div>
    );
}

function relative(d: Date): string {
    const diff = d.getTime() - Date.now();
    const abs = Math.abs(diff);
    const units: [number, string][] = [
        [31536000000, "year"], [2592000000, "month"], [86400000, "day"],
        [3600000, "hour"], [60000, "minute"], [1000, "second"]
    ];
    for (const [ms, name] of units) {
        if (abs >= ms) {
            const n = Math.round(abs / ms);
            const label = `${n} ${name}${n !== 1 ? "s" : ""}`;
            return diff < 0 ? `${label} ago` : `in ${label}`;
        }
    }
    return "just now";
}