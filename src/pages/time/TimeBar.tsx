import {type CSSProperties, useEffect, useState} from "react";
import {ChevronDown} from "lucide-react";
import "./TimeBar.scss";

interface Progress {
    label: string;
    pct: number;
}

// Each from the first moment of its first day to that of the next one's, here, so a day of 23 or 25 hours (daylight
// saving) counts as it is. Weeks start on Monday (dayOfWeek 1).
function computeProgress(now: Temporal.ZonedDateTime): Progress[] {
    const today = now.toPlainDate();
    const startOf = (day: Temporal.PlainDate) => day.toZonedDateTime(now.timeZoneId).epochMilliseconds;
    const pct = (first: Temporal.PlainDate, next: Temporal.PlainDate) =>
        ((now.epochMilliseconds - startOf(first)) / (startOf(next) - startOf(first))) * 100;

    const year = today.with({month: 1, day: 1});
    const month = today.with({day: 1});
    const week = today.subtract({days: today.dayOfWeek - 1});
    return [
        {label: "Year", pct: pct(year, year.add({years: 1}))},
        {label: "Month", pct: pct(month, month.add({months: 1}))},
        {label: "Week", pct: pct(week, week.add({weeks: 1}))},
        {label: "Day", pct: pct(today, today.add({days: 1}))},
    ];
}

// The clock, and the year, month, week and day so far: folded or not, as the page says (Time.tsx), and by hand.
export default function TimeBar({open, onToggle}: { open: boolean; onToggle: () => void }) {
    const [now, setNow] = useState(() => Temporal.Now.zonedDateTimeISO());

    useEffect(() => {
        const id = setInterval(() => setNow(Temporal.Now.zonedDateTimeISO()), 1000);
        return () => clearInterval(id);
    }, []);

    const progress = computeProgress(now);
    const time = now.toPlainTime().toString({smallestUnit: "second"}); // 21:40:13, on 24 hours
    const date = now.toLocaleString([], {weekday: "long", month: "long", day: "numeric", year: "numeric"});
    const tz = now.timeZoneId;

    return (
        // A click anywhere on the card opens or folds the bars (Jerry). The chevron is the button for the keyboard and
        // screen readers; its own click reaches the card's, so it has none.
        <div className="time_card timebar" onClick={onToggle}>
            <div className="timebar_clock">
                <span className="time_num timebar_time">{time}</span>
                <div className="timebar_meta">
                    <span className="timebar_date">{date}</span>
                    <span className="timebar_tz">{tz}</span>
                </div>
                <button
                    className={`timebar_toggle ${open ? "is-open" : ""}`}
                    aria-expanded={open}
                    aria-controls="timebar-bars"
                    aria-label="Year, month, week and day"
                >
                    <ChevronDown size={18} aria-hidden />
                </button>
            </div>

            <div className={`timebar_fold ${open ? "is-open" : ""}`} id="timebar-bars" inert={!open}>
                <div>
                    <div className="timebar_bars">
                        {progress.map((p, i) => (
                            <div className="timebar_bar-row" key={p.label} style={{"--i": i} as CSSProperties}>
                                <span className="timebar_bar-label">{p.label}</span>
                                <div className="timebar_bar">
                                    <div className="timebar_bar-fill" style={{width: `${p.pct}%`}} />
                                </div>
                                <span className="time_num timebar_bar-pct">{p.pct.toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}