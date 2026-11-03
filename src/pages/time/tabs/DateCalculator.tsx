import {useMemo, useState} from "react";
import {Minus, Plus} from "lucide-react";
import Roll from "@/components/Roll/Roll.tsx";
import RangeCalendar from "./RangeCalendar.tsx";
import "./DateCalculator.scss";

const UNITS = ["days", "weeks", "months", "years", "hours", "minutes"] as const;
type Unit = typeof UNITS[number];

const longDate = (date: Temporal.PlainDate) => date.toLocaleString([], {weekday: "long", year: "numeric", month: "long", day: "numeric"});
const shortDate = (date: Temporal.PlainDate) => date.toLocaleString([], {weekday: "short", year: "numeric", month: "short", day: "numeric"});
const longDateTime = (moment: Temporal.PlainDateTime) =>
    moment.toLocaleString([], {weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit"});
const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;

// A field's YYYY-MM-DD as a day, or null for anything else (an empty or half-typed date field).
function dayOf(iso: string): Temporal.PlainDate | null {
    try {
        return Temporal.PlainDate.from(iso);
    } catch {
        return null;
    }
}

// A time field's HH:MM as a time, or null for anything else (an empty or half-typed field).
function timeOf(value: string): Temporal.PlainTime | null {
    try {
        return Temporal.PlainTime.from(value);
    } catch {
        return null;
    }
}

// Hours and minutes in words: 8 hours, 15 minutes.
const hoursText = (minutes: number) =>
    [Math.floor(minutes / 60) && plural(Math.floor(minutes / 60), "hour"), minutes % 60 && plural(minutes % 60, "minute")]
        .filter(Boolean).join(", ") || "0 minutes";

// Years, months and days from one date to a later one: whole months first, then the days left. A month added to the
// 31st lands on the month's last day when it has fewer (Jan 31 + 1 month is Feb 28), so Jan 31 to Mar 1 is 1 month and
// 1 day.
function calendarSpan(from: Temporal.PlainDate, to: Temporal.PlainDate): string {
    const {years, months, days} = from.until(to, {largestUnit: "years"});
    const parts = [years && plural(years, "year"), months && plural(months, "month"), days && plural(days, "day")];
    return parts.filter(Boolean).join(", ") || "0 days";
}

// From today, in words: today, tomorrow, in 12 days, 3 days ago.
function fromToday(date: Temporal.PlainDate): string {
    const days = Temporal.Now.plainDateISO().until(date).days;
    if (days === 0) return "today";
    if (days === 1) return "tomorrow";
    if (days === -1) return "yesterday";
    return days > 0 ? `in ${plural(days, "day")}` : `${plural(-days, "day")} ago`;
}

export default function DateCalculator() {
    // Between two dates: the days as clicked, the last range completed, and whether its end day counts. The results
    // show the last range until a new one is complete (faded meanwhile), so the card keeps its height and the page
    // doesn't jump while a new range is picked (Jerry).
    const [first, setFirst] = useState<string | null>(null);
    const [second, setSecond] = useState<string | null>(null);
    const [range, setRange] = useState<[string, string] | null>(null);
    const [withEnd, setWithEnd] = useState(false);

    // Add or subtract, from a date and, if given, a time.
    const [start, setStart] = useState(() => Temporal.Now.plainDateISO().toString());
    const [time, setTime] = useState("");
    const [sign, setSign] = useState<1 | -1>(1);
    const [amounts, setAmounts] = useState<Record<Unit, string>>({days: "", weeks: "", months: "", years: "", hours: "", minutes: ""});

    // Between two times.
    const [from, setFrom] = useState("09:00");
    const [to, setTo] = useState("17:00");

    // A first click starts a range, a second ends it, a third starts a new one.
    const pick = (day: string) => {
        if (!first || second) {
            setFirst(day);
            setSecond(null);
        } else {
            const next: [string, string] = first <= day ? [first, day] : [day, first];
            setSecond(day);
            setRange(next);
        }
    };
    const clear = () => {
        setFirst(null);
        setSecond(null);
        setRange(null);
    };

    // The counted days run from the earlier date up to the later one, or through it when the end day counts:
    // Oct 12 to Oct 14 is 2 days, or 3 with the end day.
    const span = useMemo(() => {
        const [from, to] = range ? [dayOf(range[0]), dayOf(range[1])] : [null, null];
        if (!from || !to) return null;
        const until = withEnd ? to.add({days: 1}) : to;
        const days = from.until(until).days;
        let weekdays = 0;
        for (let day = from; Temporal.PlainDate.compare(day, until) < 0; day = day.add({days: 1})) if (day.dayOfWeek <= 5) weekdays++;
        return {
            from, to, days, weekdays,
            weeks: days >= 7 ? `${plural(Math.floor(days / 7), "week")}${days % 7 ? `, ${plural(days % 7, "day")}` : ""}` : "less than a week",
            months: calendarSpan(from, until),
        };
    }, [range, withEnd]);
    const picking = Boolean(first && !second);

    // Years and months first, then weeks and days, then hours and minutes, as calendars usually do (and Temporal's add):
    // Jan 31 + 1 month + 1 day is Mar 1. On the clock's face, as a wall clock reads: 17:45 + 2 hours 30 is 20:15, the next
    // day past midnight. With a time or hours, the result has its time.
    const result = useMemo(() => {
        const date = dayOf(start);
        const at = timeOf(time);
        const n = (unit: Unit) => sign * (Number(amounts[unit]) || 0);
        if (!date || (time && !at) || UNITS.every((unit) => n(unit) === 0)) return null;
        const moment = date.toPlainDateTime(at ?? undefined).add({
            years: n("years"), months: n("months"), weeks: n("weeks"), days: n("days"), hours: n("hours"), minutes: n("minutes"),
        });
        return {moment, withTime: Boolean(at) || n("hours") !== 0 || n("minutes") !== 0};
    }, [start, time, sign, amounts]);

    // From one time to the next on a clock: an end before the start is the next day (22:00 to 06:00 is 8 hours).
    const between = useMemo(() => {
        const a = timeOf(from);
        const b = timeOf(to);
        if (!a || !b) return null;
        const span = a.until(b);
        return {minutes: span.total("minutes") + (span.sign < 0 ? 24 * 60 : 0), nextDay: span.sign < 0};
    }, [from, to]);

    return (
        <div className="datecalc">
            <div className="time_card">
                <p className="time_label">Between two dates</p>
                <RangeCalendar first={first} second={second} onPick={pick} />

                <div className="datecalc_status">
                    <span>
                        {!first ? "Click a first day, then a second." : picking || !span ? "Now the second day." : `${shortDate(span.from)} to ${shortDate(span.to)}`}
                    </span>
                    {first && (
                        <button className="datecalc_clear" onClick={clear}>Clear</button>
                    )}
                </div>

                <label className="datecalc_check">
                    <input
                        type="checkbox"
                        checked={withEnd}
                        onChange={(e) => setWithEnd(e.target.checked)}
                    />
                    Count the end day too
                </label>

                <div className={`datecalc_out ${picking ? "is-stale" : ""}`}>
                    <Row label="Total" value={span ? plural(span.days, "day") : ""} roll />
                    <Row label="In weeks" value={span?.weeks ?? ""} roll />
                    <Row label="In months" value={span?.months ?? ""} roll />
                    <Row label="Weekdays" value={span ? plural(span.weekdays, "day") : ""} suffix=", Monday to Friday" roll />
                </div>
            </div>

            <div className="time_stack">
                <div className="time_card">
                    <p className="time_label">Add or subtract</p>
                    <div className="datecalc_pair">
                        <label className="datecalc_field">
                            <span>Date</span>
                            <input className="time_input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                        </label>
                        <label className="datecalc_field">
                            <span>Time, if any</span>
                            <input className="time_input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                        </label>
                    </div>

                    <div className="datecalc_sign" role="group" aria-label="Add or subtract">
                        <button className={sign === 1 ? "active" : ""} aria-pressed={sign === 1} onClick={() => setSign(1)}>
                            <Plus size={16} aria-hidden /> Add
                        </button>
                        <button className={sign === -1 ? "active" : ""} aria-pressed={sign === -1} onClick={() => setSign(-1)}>
                            <Minus size={16} aria-hidden /> Subtract
                        </button>
                    </div>

                    <div className="datecalc_amounts">
                        {UNITS.map((unit) => (
                            <label key={unit} className="datecalc_amount">
                                <input
                                    className="time_num time_input"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={amounts[unit]}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, "").slice(0, 5);
                                        setAmounts((now) => ({...now, [unit]: value}));
                                    }}
                                />
                                <span>{unit}</span>
                            </label>
                        ))}
                    </div>

                    {result && (
                        <div className="datecalc_out">
                            <Row label="Result" value={result.withTime ? longDateTime(result.moment) : longDate(result.moment.toPlainDate())} />
                            <Row label="From today" value={fromToday(result.moment.toPlainDate())} />
                        </div>
                    )}
                </div>

                <div className="time_card">
                    <p className="time_label">Between two times</p>
                    <div className="datecalc_pair">
                        <label className="datecalc_field">
                            <span>From</span>
                            <input className="time_input" type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
                        </label>
                        <label className="datecalc_field">
                            <span>To</span>
                            <input className="time_input" type="time" value={to} onChange={(e) => setTo(e.target.value)} />
                        </label>
                    </div>
                    {between && (
                        <div className="datecalc_out">
                            <Row label="Duration" value={hoursText(between.minutes)} suffix={between.nextDay ? ", to the next day" : undefined} roll />
                            <Row label="In minutes" value={plural(between.minutes, "minute")} roll />
                            <Row label="In hours" value={plural(Math.round((between.minutes / 60) * 100) / 100, "hour")} roll />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// With roll, the value's numbers roll when they change (the range's results) and its words fade in (Roll); the suffix
// stays put.
function Row({label, value, suffix, roll}: { label: string; value: string; suffix?: string; roll?: boolean }) {
    return (
        <div className="datecalc_row">
            <span className="datecalc_row-label">{label}</span>
            <span className="time_num datecalc_row-value">
                {roll ? <Roll text={value} /> : value}
                {value && suffix}
            </span>
        </div>
    );
}
