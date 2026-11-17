import {useMemo, useState} from "react";
import "./DurationSum.scss";

const UNIT_SECONDS: Record<string, number> = {h: 3600, m: 60, s: 1};
// A number and its unit, in the usual ways of writing them: 2h, 15 min, 1.5 hours, 1,5 h, 30s, 1,000 min.
const PART = /(\d{1,3}(?:,\d{3})+|\d+(?:[.,]\d+)?)\s*(hours|hour|hrs|hr|h|minutes|minute|mins|min|m|seconds|second|secs|sec|s)(?![a-z])/g;

// One duration, in seconds: "2h 15m", "1:30" (hours and minutes), "1:30:15", "45 min", "1.5h". Null when it can't be
// read: a bare number has no unit, and 90 could be minutes or seconds.
function secondsOf(text: string): number | null {
    const item = text.trim().toLowerCase();
    const clock = /^(\d+):([0-5]\d)(?::([0-5]\d))?$/.exec(item);
    if (clock) return Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3] ?? 0);
    // Hours, then minutes with no unit of their own: 1h30, 2h 15.
    const short = /^(\d+)\s*h\s*([0-5]?\d)$/.exec(item);
    if (short) return Number(short[1]) * 3600 + Number(short[2]) * 60;
    let total = 0;
    const rest = item.replace(PART, (_, n: string, unit: string) => {
        // A comma before three digits groups thousands (1,000 min); any other is a decimal (1,5 h).
        total += Number(/,\d{3}/.test(n) ? n.replaceAll(",", "") : n.replace(",", ".")) * (UNIT_SECONDS[unit[0] ?? ""] ?? 0);
        return "";
    });
    return rest !== item && rest.trim() === "" ? Math.round(total) : null;
}

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;

// A timesheet's sum (Raph's ask, #73): durations one per line, or with + between them, added up.
export default function DurationSum() {
    const [text, setText] = useState("");

    const sum = useMemo(() => {
        // A comma followed by a space separates, as in a list; one inside a number is a decimal (1,5h).
        const items = text.split(/\n|\+|;|,\s/).map((item) => item.trim()).filter(Boolean);
        const read = items.map(secondsOf);
        const seconds = read.reduce<number>((total, s) => total + (s ?? 0), 0);
        // By hand, not with Temporal.Duration: it throws past its range, and a number typed here can be any size.
        const [hours, minutes, rest] = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60];
        return {
            count: items.length,
            unread: items.filter((_, i) => read[i] === null),
            total: [hours && plural(hours, "hour"), minutes && plural(minutes, "minute"), rest && plural(rest, "second")]
                .filter(Boolean).join(", ") || "0 minutes",
            minutes: Math.round((seconds / 60) * 100) / 100,
            hours: Math.round((seconds / 3600) * 100) / 100,
        };
    }, [text]);

    return (
        <div className="time_card">
            <label className="time_label" htmlFor="sum-list">Add up durations</label>
            <textarea
                id="sum-list"
                className="time_input sum_list"
                rows={4}
                placeholder={"2h 15m\n45 min\n1:30"}
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false}
            />
            <p className="sum_note">One per line, or with + between them. 2h 15m, 45 min, 1.5h, 1h30 and 1:30 all work.</p>

            {sum.count > 0 && (
                <div className="sum_out">
                    <Row label="Total" value={sum.total} />
                    <Row label="In minutes" value={plural(sum.minutes, "minute")} />
                    <Row label="In hours" value={plural(sum.hours, "hour")} />
                    {sum.unread.length > 0 && <p className="sum_unread">Not counted, no unit: {sum.unread.join(", ")}</p>}
                </div>
            )}
        </div>
    );
}

function Row({label, value}: { label: string; value: string }) {
    return (
        <div className="sum_row">
            <span className="sum_row-label">{label}</span>
            <span className="time_num sum_row-value">{value}</span>
        </div>
    );
}
