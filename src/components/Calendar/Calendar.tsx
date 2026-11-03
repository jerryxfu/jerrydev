import {type ButtonHTMLAttributes, type HTMLAttributes, useState} from "react";
import {ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight} from "lucide-react";
import "./Calendar.scss";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]; // Sunday first

// Six weeks from the Sunday on or before the 1st: every month takes the same room (the card doesn't jump), and the
// days around it can be picked too. dayOfWeek counts Monday as 1 and Sunday as 7.
const monthGrid = (month: Temporal.PlainYearMonth): Temporal.PlainDate[] => {
    const first = month.toPlainDate({day: 1});
    const sunday = first.subtract({days: first.dayOfWeek % 7});
    return Array.from({length: 42}, (_, i) => sunday.add({days: i}));
};

export type DayProps = ButtonHTMLAttributes<HTMLButtonElement> & { [data: `data-${string}`]: string | undefined };

type Props = {
    // A day's button, YYYY-MM-DD: its classes beyond the calendar's own (is-outside, is-today) and what it does.
    dayProps: (day: string) => DayProps;
    // The grid's own: a class for its state, handlers that follow the pointer across days.
    gridProps?: HTMLAttributes<HTMLDivElement>;
    className?: string;
};

/** A month to pick days on, opened on this one: Time's two days (RangeCalendar), Rendezvous's days. */
export default function Calendar({dayProps, gridProps, className}: Props) {
    const now = Temporal.Now.plainDateISO();
    const today = now.toString();
    const [view, setView] = useState(() => now.toPlainYearMonth());

    const shift = (months: number) => setView((month) => month.add({months}));
    const away = !view.equals(now.toPlainYearMonth());

    return (
        <div className={["cal", className].filter(Boolean).join(" ")}>
            <div className="cal_nav">
                <button type="button" aria-label="Previous year" onClick={() => shift(-12)}><ChevronsLeft size={16} /></button>
                <button type="button" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft size={16} /></button>
                <span className="cal_month" aria-live="polite">
                    {view.toPlainDate({day: 1}).toLocaleString([], {month: "long", year: "numeric"})}
                </span>
                {away && (
                    <button type="button" className="cal_today" onClick={() => setView(now.toPlainYearMonth())}>
                        Today
                    </button>
                )}
                <button type="button" aria-label="Next month" onClick={() => shift(1)}><ChevronRight size={16} /></button>
                <button type="button" aria-label="Next year" onClick={() => shift(12)}><ChevronsRight size={16} /></button>
            </div>

            <div {...gridProps} className={["cal_grid", gridProps?.className].filter(Boolean).join(" ")}>
                {WEEKDAYS.map((day) => <span key={day} className="cal_weekday" aria-hidden>{day}</span>)}
                {monthGrid(view).map((date) => {
                    const day = date.toString();
                    const {className: dayClass, ...rest} = dayProps(day);
                    const classes = [
                        "cal_day",
                        date.month !== view.month && "is-outside",
                        day === today && "is-today",
                        dayClass,
                    ].filter(Boolean).join(" ");
                    return (
                        <button
                            key={day}
                            type="button"
                            className={classes}
                            aria-label={date.toLocaleString([], {weekday: "long", month: "long", day: "numeric", year: "numeric"})}
                            {...rest}
                        >
                            <span>{date.day}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
