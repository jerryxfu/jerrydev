import {type FormEvent, useEffect, useMemo, useState} from "react";
import {X} from "lucide-react";
import {daysBetween, pad2} from "../utils.ts";
import "./LocalTime.scss";

const STORE = "time:zones";
const DEFAULT_ZONES = ["UTC"]; // the rest is the reader's to add (Jerry)
const ALL_ZONES = ["UTC", ...Intl.supportedValuesOf("timeZone").filter((zone) => zone !== "UTC")];

const here = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Whether the browser knows a zone by that name. Its own list keeps some old names (Asia/Calcutta, Europe/Kiev) and
// leaves the current ones out (Asia/Kolkata, Europe/Kyiv), which it still accepts: asking it is the only full check.
const isZone = (zone: string) => {
    try {
        new Intl.DateTimeFormat("en-US", {timeZone: zone});
        return true;
    } catch {
        return false;
    }
};

const REGIONS = ["America", "Europe", "Asia", "Africa", "Australia", "Pacific", "Atlantic", "Indian", "Antarctica"];

// A full name (Asia/Tokyo) or a city (tokyo, new york), in any case: from the list first, then any name the browser
// knows, written the usual way (Asia/Kolkata).
function findZone(input: string): string | null {
    const wanted = input.trim().replace(/\s+/g, "_").toLowerCase();
    if (!wanted) return null;
    const listed = ALL_ZONES.find((z) => z.toLowerCase() === wanted) ?? ALL_ZONES.find((z) => z.toLowerCase().endsWith(`/${wanted}`));
    if (listed) return listed;
    const name = wanted.replace(/(^|[_/-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase());
    return (name.includes("/") ? [name] : REGIONS.map((region) => `${region}/${name}`)).find(isZone) ?? null;
}

// Remembered per browser. Storage can be refused altogether: the defaults then, and nothing remembered.
function loadZones(): string[] {
    try {
        const saved: unknown = JSON.parse(localStorage.getItem(STORE) ?? "null");
        if (Array.isArray(saved)) return saved.filter((zone): zone is string => typeof zone === "string" && isZone(zone));
    } catch {
        // fall through
    }
    return DEFAULT_ZONES;
}

function saveZones(zones: string[]) {
    try {
        localStorage.setItem(STORE, JSON.stringify(zones));
    } catch {
        // not remembered, that's all
    }
}

const cityOf = (zone: string) => zone.slice(zone.lastIndexOf("/") + 1).replace(/_/g, " ");

// A zone's wall clock at a moment, by its parts. One formatter per zone: making them is the slow part.
const formatters = new Map<string, Intl.DateTimeFormat>();
function wallClock(zone: string, at: Date) {
    let format = formatters.get(zone);
    if (!format) {
        format = new Intl.DateTimeFormat("en-US", {
            timeZone: zone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric",
        });
        formatters.set(zone, format);
    }
    const parts = Object.fromEntries(format.formatToParts(at).map((part) => [part.type, Number(part.value)]));
    const {year = 0, month = 1, day = 1, hour = 0, minute = 0} = parts;
    // Its offset from UTC, in minutes: the wall clock read as if it were UTC, against the real moment (seconds dropped).
    const offset = Math.round((Date.UTC(year, month - 1, day, hour, minute) - Math.floor(at.getTime() / 60_000) * 60_000) / 60_000);
    return {year, month, day, hour, minute, offset};
}

// UTC+9, UTC−4, UTC+5:30. A real minus sign, as clocks print it.
function utcText(minutes: number): string {
    if (minutes === 0) return "UTC";
    const sign = minutes > 0 ? "+" : "−";
    const abs = Math.abs(minutes);
    return `UTC${sign}${Math.floor(abs / 60)}${abs % 60 ? `:${pad2(abs % 60)}` : ""}`;
}

// A number of minutes as hours: 13 h, 3 h 30.
const hoursText = (minutes: number) => `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${pad2(minutes % 60)}` : ""}`;

// The gap from the reader's own clock: 13 h ahead, 3 h 30 behind, same time.
const gapText = (minutes: number) =>
    minutes === 0 ? "same time" : `${hoursText(Math.abs(minutes))} ${minutes > 0 ? "ahead" : "behind"}`;

// The next time the local clocks change, within a year: the first local midnight whose offset differs from today's
// means the change happened during the day before it.
function nextChange(now: Date): { date: Date; minutes: number } | null {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let day = 1; day <= 366; day++) {
        const midnight = new Date(start.getFullYear(), start.getMonth(), start.getDate() + day);
        const diff = start.getTimezoneOffset() - midnight.getTimezoneOffset();
        if (diff !== 0) {
            return {date: new Date(midnight.getFullYear(), midnight.getMonth(), midnight.getDate() - 1), minutes: diff};
        }
    }
    return null;
}

export default function LocalTime() {
    const [now, setNow] = useState(() => new Date());
    const [picked, setPicked] = useState(""); // HH:MM today, here; empty follows the clock
    const [zones, setZones] = useState(loadZones);
    const [adding, setAdding] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(id);
    }, []);

    const at = useMemo(() => {
        const [h, m] = picked.split(":").map(Number);
        if (h === undefined || m === undefined || isNaN(h) || isNaN(m)) return now;
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    }, [picked, now]);

    const ownOffset = -now.getTimezoneOffset();
    const jan = -new Date(now.getFullYear(), 0, 1).getTimezoneOffset();
    const jul = -new Date(now.getFullYear(), 6, 1).getTimezoneOffset();
    const change = jan === jul ? null : nextChange(now);
    const changeIn = change && daysBetween(new Date(now.getFullYear(), now.getMonth(), now.getDate()), change.date);
    const mine = wallClock(here, at);

    const update = (next: string[]) => {
        setZones(next);
        saveZones(next);
    };

    const add = (e: FormEvent) => {
        e.preventDefault();
        const zone = findZone(adding);
        if (!zone) {
            setError(`No time zone called "${adding.trim()}".`);
            return;
        }
        if (!zones.includes(zone)) update([...zones, zone]);
        setAdding("");
        setError("");
    };

    return (
        <div className="localtime">
            <div className="time_card">
                <p className="time_label">Your time zone</p>
                <p className="localtime_zone">{here}</p>
                <div className="localtime_out">
                    <Row label="Offset" value={utcText(ownOffset)} />
                    <Row
                        label="Daylight saving"
                        value={jan === jul ? "not used here" : ownOffset === Math.max(jan, jul) ? "on now" : "off now"}
                    />
                </div>
                {change && (
                    <p className="localtime_note">
                        Clocks go {change.minutes > 0 ? "forward" : "back"} {hoursText(Math.abs(change.minutes))} on{" "}
                        {change.date.toLocaleDateString([], {weekday: "long", month: "long", day: "numeric"})}
                        {changeIn === 0 ? ", today." : changeIn === 1 ? ", tomorrow." : `, in ${changeIn} days.`}
                    </p>
                )}
            </div>

            <div className="time_card">
                <div className="localtime_head">
                    <p className="time_label">World clocks</p>
                    <div className="localtime_at">
                        <label htmlFor="localtime-at">At</label>
                        <input
                            id="localtime-at"
                            className="time_num time_input"
                            type="time"
                            value={picked || `${pad2(now.getHours())}:${pad2(now.getMinutes())}`}
                            onChange={(e) => setPicked(e.target.value)}
                        />
                        {picked && <button className="time_btn" onClick={() => setPicked("")}>Now</button>}
                    </div>
                </div>

                <ul className="localtime_list">
                    {zones.map((zone) => {
                        const clock = wallClock(zone, at);
                        const dayShift = Math.round((Date.UTC(clock.year, clock.month - 1, clock.day) - Date.UTC(mine.year, mine.month - 1, mine.day)) / 86_400_000);
                        return (
                            <li key={zone} className="localtime_row">
                                <div className="localtime_place">
                                    <span className="localtime_city">{zone === "UTC" ? "UTC" : cityOf(zone)}</span>
                                    <span className="localtime_meta">
                                        {zone === "UTC" ? "Coordinated Universal Time" : `${utcText(clock.offset)} · ${gapText(clock.offset - ownOffset)}`}
                                    </span>
                                </div>
                                <div className="localtime_clock">
                                    <span className="time_num localtime_time">{pad2(clock.hour)}:{pad2(clock.minute)}</span>
                                    {dayShift !== 0 && <span className="localtime_day">{dayShift > 0 ? "tomorrow" : "yesterday"}</span>}
                                </div>
                                <button
                                    className="localtime_remove"
                                    aria-label={`Remove ${zone === "UTC" ? "UTC" : cityOf(zone)}`}
                                    onClick={() => update(zones.filter((z) => z !== zone))}
                                >
                                    <X size={15} />
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <form className="localtime_add" onSubmit={add}>
                    <input
                        className="time_input"
                        list="localtime-zones"
                        placeholder="Add a city or time zone"
                        aria-label="Add a city or time zone"
                        value={adding}
                        onChange={(e) => {
                            setAdding(e.target.value);
                            setError("");
                        }}
                    />
                    <datalist id="localtime-zones">
                        {ALL_ZONES.map((zone) => <option key={zone} value={zone} />)}
                    </datalist>
                    <button className="time_btn" type="submit" disabled={!adding.trim()}>Add</button>
                </form>
                {error && <p className="localtime_error">{error}</p>}
            </div>
        </div>
    );
}

function Row({label, value}: { label: string; value: string }) {
    return (
        <div className="localtime_row-info">
            <span className="localtime_row-label">{label}</span>
            <span className="localtime_row-value">{value}</span>
        </div>
    );
}
