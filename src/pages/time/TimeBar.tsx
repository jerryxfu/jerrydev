import {useEffect, useState} from "react";
import "./TimeBar.scss";

interface Progress {
    label: string;
    pct: number;
}

// Uses start/end Date objects (not fixed 86400000) so DST-length days/weeks stay correct
function computeProgress(now: Date): Progress[] {
    const ms = now.getTime();
    const y = now.getFullYear(), mo = now.getMonth(), d = now.getDate();

    const startY = new Date(y, 0, 1).getTime();
    const endY = new Date(y + 1, 0, 1).getTime();
    const startMo = new Date(y, mo, 1).getTime();
    const endMo = new Date(y, mo + 1, 1).getTime();
    const startD = new Date(y, mo, d).getTime();
    const endD = new Date(y, mo, d + 1).getTime();

    const dow = (now.getDay() + 6) % 7; // Monday = 0
    const startW = new Date(y, mo, d - dow).getTime();
    const endW = new Date(y, mo, d - dow + 7).getTime();

    const pct = (a: number, b: number) => ((ms - a) / (b - a)) * 100;
    return [
        {label: "Year", pct: pct(startY, endY)},
        {label: "Month", pct: pct(startMo, endMo)},
        {label: "Week", pct: pct(startW, endW)},
        {label: "Day", pct: pct(startD, endD)},
    ];
}

export default function TimeBar() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const progress = computeProgress(now);
    const time = now.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false});
    const date = now.toLocaleDateString([], {weekday: "long", month: "long", day: "numeric", year: "numeric"});
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return (
        <div className="timebar">
            <div className="timebar_clock">
                <span className="time_mono timebar_time">{time}</span>
                <div className="timebar_meta">
                    <span className="timebar_date">{date}</span>
                    <span className="timebar_tz">{tz}</span>
                </div>
            </div>

            <div className="timebar_bars">
                {progress.map((p) => (
                    <div className="timebar_bar-row" key={p.label}>
                        <span className="timebar_bar-label">{p.label}</span>
                        <div className="timebar_bar">
                            <div className="timebar_bar-fill" style={{width: `${p.pct}%`}} />
                        </div>
                        <span className="time_mono timebar_bar-pct">{p.pct.toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}