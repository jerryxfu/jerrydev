import {useEffect, useRef, useState} from "react";
import {copyText} from "@/utils.ts";
import {isoDay, pad2} from "../utils.ts";
import "./DiscordTimestamp.scss";

// Discord's timestamp styles, <t:unix:style>, each shown the way Discord draws it for the reader: in their own time
// zone, language and 12 or 24-hour clock (here, this browser's). Relative is close to Discord's, not word for word.
const STYLES: { style: string; format: (date: Date, now: number) => string }[] = [
    {style: "t", format: (date) => date.toLocaleTimeString([], {hour: "numeric", minute: "2-digit"})},
    {style: "T", format: (date) => date.toLocaleTimeString([], {hour: "numeric", minute: "2-digit", second: "2-digit"})},
    {style: "d", format: (date) => date.toLocaleDateString([], {year: "numeric", month: "2-digit", day: "2-digit"})},
    {style: "D", format: (date) => date.toLocaleDateString([], {dateStyle: "long"})},
    {style: "f", format: (date) => date.toLocaleString([], {dateStyle: "long", timeStyle: "short"})},
    {style: "F", format: (date) => date.toLocaleString([], {dateStyle: "full", timeStyle: "short"})},
    {style: "R", format: (date, now) => relative(date.getTime() - now)},
];

// The field's value for a moment, to the minute: 2026-10-23T16:20.
const fieldValue = (date: Date) => `${isoDay(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

export default function DiscordTimestamp() {
    const [value, setValue] = useState(() => fieldValue(new Date()));
    const [now, setNow] = useState(() => Date.now()); // for Relative, which moves on its own
    const [copied, setCopied] = useState<string | null>(null);
    const copiedTimer = useRef(0);

    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => {
            window.clearInterval(id);
            window.clearTimeout(copiedTimer.current);
        };
    }, []);

    const date = value ? new Date(value) : null; // a datetime-local value reads as local time
    const unix = date && !isNaN(date.getTime()) ? Math.floor(date.getTime() / 1000) : null;

    const copy = async (code: string) => {
        if (!(await copyText(code))) return;
        setCopied(code);
        window.clearTimeout(copiedTimer.current);
        copiedTimer.current = window.setTimeout(() => setCopied(null), 1200);
    };

    return (
        <div className="time_card">
            <label className="time_label" htmlFor="discord-date">Discord timestamp</label>
            <div className="discord_pick">
                <input
                    id="discord-date"
                    className="time_input"
                    type="datetime-local"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                />
                <button className="time_btn" onClick={() => setValue(fieldValue(new Date()))}>Now</button>
            </div>
            <p className="discord_note">Discord shows it in each reader's own time zone and language. Click a line to copy it.</p>

            {date && unix !== null && (
                <div className="discord_list">
                    {STYLES.map(({style, format}) => {
                        const code = `<t:${unix}:${style}>`;
                        return (
                            <button key={style} className="discord_row" title="Copy" onClick={() => void copy(code)}>
                                <span className="discord_preview">{format(date, now)}</span>
                                <span className={`time_code discord_code ${copied === code ? "is-copied" : ""}`}>
                                    {copied === code ? "Copied" : code}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// "in 3 hours", "2 months ago": the largest unit, with about the steps Discord takes (a minute from 45 seconds, an
// hour from 45 minutes, a day from 22 hours, a month from 26 days, a year from 11 months).
function relative(ms: number): string {
    const format = new Intl.RelativeTimeFormat([], {numeric: "always"});
    const s = Math.abs(ms) / 1000;
    const sign = Math.sign(ms) || 1;
    const [n, unit]: [number, Intl.RelativeTimeFormatUnit] =
        s < 45 ? [s, "second"]
            : s < 45 * 60 ? [s / 60, "minute"]
                : s < 22 * 3600 ? [s / 3600, "hour"]
                    : s < 26 * 86400 ? [s / 86400, "day"]
                        : s < 320 * 86400 ? [s / (30.44 * 86400), "month"]
                            : [s / (365.25 * 86400), "year"];
    return format.format(sign * Math.max(1, Math.round(n)), unit);
}
