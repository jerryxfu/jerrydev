import {useEffect, useMemo, useState} from "react";
import {copyText} from "@/utils.ts";
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
            <div className="time_card unix_live">
                <p className="time_label">Current Unix time</p>
                <button className="time_num unix_live-value" title="Copy" onClick={() => void copyText(String(live))}>
                    {live}
                </button>
                <div className="time_toggle" role="group" aria-label="Unit">
                    <button className={unit === "s" ? "active" : ""} aria-pressed={unit === "s"} onClick={() => setUnit("s")}>seconds</button>
                    <button className={unit === "ms" ? "active" : ""} aria-pressed={unit === "ms"} onClick={() => setUnit("ms")}>ms</button>
                </div>
            </div>

            <div className="unix_grid">
                <div className="time_card">
                    <label className="time_label" htmlFor="unix-ts">Timestamp → date</label>
                    <input
                        id="unix-ts"
                        className="time_num time_input"
                        placeholder={String(nowUnix(unit))}
                        value={tsInput}
                        onChange={(e) => setTsInput(e.target.value.replace(/[^\d-]/g, ""))}
                        inputMode="numeric"
                    />
                    {parsed && (
                        <div className="unix_out">
                            <Row label="Local" value={parsed.toLocaleString()} />
                            <Row label="UTC" value={parsed.toUTCString()} />
                            <Row label="ISO 8601" value={parsed.toISOString()} code />
                            <Row label="Relative" value={relative(parsed)} />
                        </div>
                    )}
                </div>

                <div className="time_card">
                    <label className="time_label" htmlFor="unix-date">Date → timestamp</label>
                    <input
                        id="unix-date"
                        className="time_input"
                        type="datetime-local"
                        value={dateInput}
                        onChange={(e) => setDateInput(e.target.value)}
                    />
                    {computedTs !== null && (
                        <div className="unix_out">
                            <Row label={unit === "s" ? "Unix (s)" : "Unix (ms)"} value={String(computedTs)} copy />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// A timestamp to copy is a button; ISO 8601 shows in the code font.
function Row({label, value, code, copy}: { label: string; value: string; code?: boolean; copy?: boolean }) {
    return (
        <div className="unix_row">
            <span className="unix_row-label">{label}</span>
            {copy ? (
                <button className="time_num unix_row-value is-copy" title="Copy" onClick={() => void copyText(value)}>
                    {value}
                </button>
            ) : (
                <span className={`unix_row-value ${code ? "time_code" : ""}`}>{value}</span>
            )}
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