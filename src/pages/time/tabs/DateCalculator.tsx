import {useMemo, useState} from "react";
import {Minus, Plus} from "lucide-react";
import Morph from "@/components/Morph/Morph.tsx";
import {daysBetween, daysInMonth, isoDay, parseDay} from "../utils.ts";
import RangeCalendar from "./RangeCalendar.tsx";
import "./DateCalculator.scss";

const UNITS = ["days", "weeks", "months", "years"] as const;
type Unit = typeof UNITS[number];

const longDate = (date: Date) => date.toLocaleDateString([], {weekday: "long", year: "numeric", month: "long", day: "numeric"});
const shortDate = (date: Date) => date.toLocaleDateString([], {weekday: "short", year: "numeric", month: "short", day: "numeric"});
const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;

const addDays = (date: Date, n: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);

// The days a range counts: up to its last day, or through it.
const countDays = ([from, to]: [string, string], withEnd: boolean) =>
    daysBetween(parseDay(from) ?? new Date(), parseDay(to) ?? new Date()) + (withEnd ? 1 : 0);

// The same day of the month, or the month's last day when it has fewer: Jan 31 + 1 month is Feb 28 (or 29).
function addMonths(date: Date, n: number): Date {
    const first = new Date(date.getFullYear(), date.getMonth() + n, 1);
    return new Date(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), daysInMonth(first.getFullYear(), first.getMonth())));
}

// Years, months and days from one date to a later one: whole months first, counted as addMonths counts them, then the
// days left. So Jan 31 to Mar 1 is 1 month and 1 day.
function calendarSpan(from: Date, to: Date): string {
    let months = (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();
    if (addMonths(from, months) > to) months -= 1;
    const days = daysBetween(addMonths(from, months), to);
    const years = Math.floor(months / 12);
    const parts = [years && plural(years, "year"), months % 12 && plural(months % 12, "month"), days && plural(days, "day")];
    return parts.filter(Boolean).join(", ") || "0 days";
}

// From today, in words: today, tomorrow, in 12 days, 3 days ago.
function fromToday(date: Date): string {
    const now = new Date();
    const days = daysBetween(new Date(now.getFullYear(), now.getMonth(), now.getDate()), date);
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
    // Which way the results roll when they change: up when the range grows, down when it shrinks (Morph, Jerry).
    const [direction, setDirection] = useState<"up" | "down">("up");

    // Add or subtract.
    const [start, setStart] = useState(() => isoDay(new Date()));
    const [sign, setSign] = useState<1 | -1>(1);
    const [amounts, setAmounts] = useState<Record<Unit, string>>({days: "", weeks: "", months: "", years: ""});

    // A first click starts a range, a second ends it, a third starts a new one.
    const pick = (day: string) => {
        if (!first || second) {
            setFirst(day);
            setSecond(null);
        } else {
            const next: [string, string] = first <= day ? [first, day] : [day, first];
            setDirection(range && countDays(next, withEnd) < countDays(range, withEnd) ? "down" : "up");
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
        const [from, to] = range ? [parseDay(range[0]), parseDay(range[1])] : [null, null];
        if (!from || !to) return null;
        const until = withEnd ? addDays(to, 1) : to;
        const days = daysBetween(from, until);
        let weekdays = 0;
        for (let day = from; day < until; day = addDays(day, 1)) if (day.getDay() % 6 !== 0) weekdays++;
        return {
            from, to, days, weekdays,
            weeks: days >= 7 ? `${plural(Math.floor(days / 7), "week")}${days % 7 ? `, ${plural(days % 7, "day")}` : ""}` : "less than a week",
            months: calendarSpan(from, until),
        };
    }, [range, withEnd]);
    const picking = Boolean(first && !second);

    // Months and years first, then weeks and days, as calendars usually do: Jan 31 + 1 month + 1 day is Mar 1.
    const result = useMemo(() => {
        const date = parseDay(start);
        const n = (unit: Unit) => Number(amounts[unit]) || 0;
        const months = n("years") * 12 + n("months");
        const days = n("weeks") * 7 + n("days");
        if (!date || (months === 0 && days === 0)) return null;
        return addDays(addMonths(date, sign * months), sign * days);
    }, [start, sign, amounts]);

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
                        onChange={(e) => {
                            setWithEnd(e.target.checked);
                            setDirection(e.target.checked ? "up" : "down");
                        }}
                    />
                    Count the end day too
                </label>

                <div className={`datecalc_out ${picking ? "is-stale" : ""}`}>
                    <Row label="Total" value={span ? plural(span.days, "day") : ""} direction={direction} />
                    <Row label="In weeks" value={span?.weeks ?? ""} direction={direction} />
                    <Row label="In months" value={span?.months ?? ""} direction={direction} />
                    <Row label="Weekdays" value={span ? plural(span.weekdays, "day") : ""} suffix=", Monday to Friday" direction={direction} />
                </div>
            </div>

            <div className="time_card">
                <p className="time_label">Add or subtract</p>
                <label className="datecalc_field">
                    <span>Date</span>
                    <input className="time_input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                </label>

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
                        <Row label="Result" value={longDate(result)} />
                        <Row label="From today" value={fromToday(result)} />
                    </div>
                )}
            </div>
        </div>
    );
}

// With a direction, the value morphs when it changes (the range's results); the suffix stays put.
function Row({label, value, suffix, direction}: { label: string; value: string; suffix?: string; direction?: "up" | "down" }) {
    return (
        <div className="datecalc_row">
            <span className="datecalc_row-label">{label}</span>
            <span className="time_num datecalc_row-value">
                {direction ? <Morph text={value} direction={direction} /> : value}
                {value && suffix}
            </span>
        </div>
    );
}
