import {useState} from "react";
import {ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight} from "lucide-react";
import {isoDay} from "../utils.ts";
import "./RangeCalendar.scss";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]; // Sunday first, as Rendezvous's calendar

// Six weeks from the Sunday on or before the 1st: every month takes the same room (the card doesn't jump), and the
// days around it can be picked too.
const monthGrid = (year: number, month: number): Date[] => {
    const offset = new Date(year, month, 1).getDay();
    return Array.from({length: 42}, (_, i) => new Date(year, month, 1 - offset + i));
};

type Props = {
    first: string | null;   // YYYY-MM-DD, the days as clicked (in any order)
    second: string | null;
    onPick: (day: string) => void;
};

// A month to pick two days on. With only the first one picked, the day under the pointer shows where the range would
// end. Dates are compared as YYYY-MM-DD strings, which sort as the days do.
export default function RangeCalendar({first, second, onPick}: Props) {
    const now = new Date();
    const today = isoDay(now);
    const [view, setView] = useState(() => ({year: now.getFullYear(), month: now.getMonth()}));
    const [hover, setHover] = useState<string | null>(null);

    const shift = (months: number) => setView(({year, month}) => {
        const date = new Date(year, month + months, 1);
        return {year: date.getFullYear(), month: date.getMonth()};
    });
    const away = view.year !== now.getFullYear() || view.month !== now.getMonth();

    const preview = Boolean(first && !second && hover);
    const end = second ?? (preview ? hover : first);
    const [lo, hi] = first && end ? (first <= end ? [first, end] : [end, first]) : [null, null];

    return (
        <div className="rangecal">
            <div className="rangecal_nav">
                <button aria-label="Previous year" onClick={() => shift(-12)}><ChevronsLeft size={16} /></button>
                <button aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft size={16} /></button>
                <span className="rangecal_month" aria-live="polite">
                    {new Date(view.year, view.month).toLocaleDateString([], {month: "long", year: "numeric"})}
                </span>
                {away && (
                    <button className="rangecal_today" onClick={() => setView({year: now.getFullYear(), month: now.getMonth()})}>
                        Today
                    </button>
                )}
                <button aria-label="Next month" onClick={() => shift(1)}><ChevronRight size={16} /></button>
                <button aria-label="Next year" onClick={() => shift(12)}><ChevronsRight size={16} /></button>
            </div>

            <div className={`rangecal_grid ${preview ? "is-preview" : ""}`} onMouseLeave={() => setHover(null)}>
                {WEEKDAYS.map((day) => <span key={day} className="rangecal_weekday" aria-hidden>{day}</span>)}
                {monthGrid(view.year, view.month).map((date) => {
                    const day = isoDay(date);
                    const inRange = lo !== null && hi !== null && day >= lo && day <= hi;
                    const classes = [
                        "rangecal_day",
                        date.getMonth() !== view.month && "is-outside",
                        day === today && "is-today",
                        inRange && "is-in",
                        day === lo && "is-lo",
                        day === hi && "is-hi",
                    ].filter(Boolean).join(" ");
                    return (
                        <button
                            key={day}
                            className={classes}
                            aria-pressed={day === first || day === second}
                            aria-label={date.toLocaleDateString([], {weekday: "long", month: "long", day: "numeric", year: "numeric"})}
                            onClick={() => onPick(day)}
                            onMouseEnter={() => setHover(day)}
                        >
                            <span>{date.getDate()}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
