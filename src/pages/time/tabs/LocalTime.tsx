import {type FormEvent, useEffect, useMemo, useState} from "react";
import {X} from "lucide-react";
import Button from "@/components/Button/Button.tsx";
import {pad2} from "../utils.ts";
import "./LocalTime.scss";

const STORE = "time:zones";
const DEFAULT_ZONES = ["UTC"]; // the rest is the reader's to add (Jerry)
const ALL_ZONES = ["UTC", ...Intl.supportedValuesOf("timeZone").filter((zone) => zone !== "UTC")];

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

// A zone's offset from UTC, in minutes.
const offsetOf = (time: Temporal.ZonedDateTime) => Math.round(time.offsetNanoseconds / 60e9);

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

export default function LocalTime() {
    const [now, setNow] = useState(() => Temporal.Now.zonedDateTimeISO());
    const [picked, setPicked] = useState(""); // HH:MM today, here; empty follows the clock
    const [zones, setZones] = useState(loadZones);
    const [adding, setAdding] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const id = window.setInterval(() => setNow(Temporal.Now.zonedDateTimeISO()), 1000);
        return () => window.clearInterval(id);
    }, []);

    // The moment the clocks show: now, or the time picked, today, here.
    const at = useMemo(() => {
        try {
            return picked ? now.withPlainTime(picked) : now;
        } catch {
            return now;
        }
    }, [picked, now]);

    const here = now.timeZoneId;
    const ownOffset = offsetOf(now);
    // Daylight saving: this year's offsets in January and July differ where it's used.
    const jan = offsetOf(now.with({month: 1, day: 1}));
    const jul = offsetOf(now.with({month: 7, day: 1}));
    // The next time the clocks change here: the moment it happens, already on the new offset.
    const next = jan === jul ? null : now.getTimeZoneTransition("next");
    const change = next && {date: next.toPlainDate(), minutes: offsetOf(next) - ownOffset};
    const changeIn = change && now.toPlainDate().until(change.date).days;

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
                        {change.date.toLocaleString([], {weekday: "long", month: "long", day: "numeric"})}
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
                            value={picked || now.toPlainTime().toString({smallestUnit: "minute"})}
                            onChange={(e) => setPicked(e.target.value)}
                        />
                        {picked && <Button onClick={() => setPicked("")}>Now</Button>}
                    </div>
                </div>

                <ul className="localtime_list">
                    {zones.map((zone) => {
                        const clock = at.withTimeZone(zone);
                        const dayShift = at.toPlainDate().until(clock.toPlainDate()).days;
                        return (
                            <li key={zone} className="localtime_row">
                                <div className="localtime_place">
                                    <span className="localtime_city">{zone === "UTC" ? "UTC" : cityOf(zone)}</span>
                                    <span className="localtime_meta">
                                        {zone === "UTC" ? "Coordinated Universal Time" : `${utcText(offsetOf(clock))} · ${gapText(offsetOf(clock) - offsetOf(at))}`}
                                    </span>
                                </div>
                                <div className="localtime_clock">
                                    <span className="time_num localtime_time">{clock.toPlainTime().toString({smallestUnit: "minute"})}</span>
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
                    <Button type="submit" disabled={!adding.trim()}>Add</Button>
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
