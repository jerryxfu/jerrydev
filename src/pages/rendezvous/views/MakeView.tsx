import {useState} from "react";
import {CalendarPlus} from "lucide-react";
import Button from "@/components/Button/Button.tsx";
import Calendar from "@/components/Calendar/Calendar.tsx";
import {DEFAULT_SETTINGS, type EventSettings, WHEN_OPTIONS} from "../types.ts";
import {createEvent} from "../api.ts";
import usePaint from "../usePaint.ts";
import "./MakeView.scss";

const HOURS = Array.from({length: 24}, (_, i) => `${String(i).padStart(2, "0")}:00`);

const dayBefore = (day: string) => Temporal.PlainDate.from(day).subtract({days: 1}).toString();
const dayAfter = (day: string) => Temporal.PlainDate.from(day).add({days: 1}).toString();

/** The one screen to make an event: what for, which days, when in the day. Then the event's own page. */
export default function MakeView({onMade}: { onMade: (code: string) => void }) {
    const [settings, setSettings] = useState<EventSettings>({...DEFAULT_SETTINGS});
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const today = Temporal.Now.plainDateISO().toString();
    const picked = new Set(settings.dates);
    const setDay = (day: string, on: boolean) => setSettings(s => {
        const days = new Set(s.dates);
        if (on) days.add(day);
        else days.delete(day);
        return {...s, dates: [...days].sort()};
    });
    const paint = usePaint(day => picked.has(day), setDay);

    const timed = typeof settings.granularity === "number";
    const ready = settings.title.trim() !== "" && settings.dates.length > 0 && (!timed || settings.timeStart < settings.timeEnd);

    const make = async () => {
        if (!ready || busy) return;
        setBusy(true);
        setError(null);
        try {
            const {code} = await createEvent({...settings, title: settings.title.trim()});
            onMade(code);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't make the event. Try again.");
            setBusy(false);
        }
    };

    return (
        <div className="rv_make">
            <input
                className="rv_title-input"
                type="text"
                placeholder="What's it for? Dinner, game night, a call"
                maxLength={100}
                value={settings.title}
                onChange={(e) => setSettings(s => ({...s, title: e.target.value}))}
                onKeyDown={(e) => e.key === "Enter" && void make()}
                autoFocus
            />

            <section className="rv_card">
                <p className="rv_label">Which days?</p>
                <Calendar
                    className="rv_days"
                    gridProps={paint}
                    dayProps={(day) => day < today ? {disabled: true} : {
                        className: [
                            picked.has(day) && "is-picked",
                            picked.has(day) && picked.has(dayBefore(day)) && "has-prev",
                            picked.has(day) && picked.has(dayAfter(day)) && "has-next",
                        ].filter(Boolean).join(" "),
                        "aria-pressed": picked.has(day),
                        "data-paint": day,
                    }}
                />
                <p className="rv_note">
                    {settings.dates.length === 0
                        ? "Tap the days, or drag across them."
                        : `${settings.dates.length} day${settings.dates.length === 1 ? "" : "s"}`}
                    {settings.dates.length > 0 && (
                        <button className="rv_link" onClick={() => setSettings(s => ({...s, dates: []}))}>Clear</button>
                    )}
                </p>
            </section>

            <section className="rv_card">
                <p className="rv_label">When in the day?</p>
                <div className="rv_choices">
                    {WHEN_OPTIONS.map(o => (
                        <button
                            key={o.value}
                            className={`rv_choice ${settings.granularity === o.value ? "is-on" : ""}`}
                            aria-pressed={settings.granularity === o.value}
                            onClick={() => setSettings(s => ({...s, granularity: o.value}))}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
                {timed && (
                    <div className="rv_hours">
                        <span>From</span>
                        <select
                            className="rv_select"
                            aria-label="From"
                            value={settings.timeStart}
                            onChange={(e) => setSettings(s => ({...s, timeStart: e.target.value}))}
                        >
                            {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span>to</span>
                        <select
                            className="rv_select"
                            aria-label="To"
                            value={settings.timeEnd}
                            onChange={(e) => setSettings(s => ({...s, timeEnd: e.target.value}))}
                        >
                            {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
                )}
            </section>

            {error && <p className="rv_error">{error}</p>}

            <Button variant="main" size="big" start={CalendarPlus} busy={busy} disabled={!ready} onClick={() => void make()}>
                Make the event
            </Button>
        </div>
    );
}
