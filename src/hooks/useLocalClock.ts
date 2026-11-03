import {useEffect, useMemo, useState} from "react";

// My clock, for the contact block and the hero's clock card. A named zone rather than a fixed offset, so all of
// this follows daylight saving on its own: Montréal is EST only from November to March, EDT the rest of the year.
export const MY_ZONE = "America/Toronto";

export type LocalClock = {
    hm: string; // "6:41", apart from the period so a morph only swaps the digits that changed
    period: string; // "PM"
    zone: string; // "EDT"
    // How far my clock is from the reader's, in minutes: positive when mine is ahead.
    delta: number;
    // That distance, unsigned: "6h", "2h30", "0h".
    span: string;
    date: string; // my day, "Wednesday, October 7", for the experience timeline's now
    day: string; // the same day for a <time>: "2026-10-07"
};

export default function useLocalClock(timeZone: string = MY_ZONE): LocalClock {
    const [now, setNow] = useState(() => Temporal.Now.instant());

    // Ticks on the minute, so the digits change when a wall clock's would. Every zone's offset is a whole number of
    // minutes, so the epoch's minutes line up with everyone's. A tab coming back from the background catches up at once.
    useEffect(() => {
        let interval: number | undefined;
        const timeout = window.setTimeout(() => {
            setNow(Temporal.Now.instant());
            interval = window.setInterval(() => setNow(Temporal.Now.instant()), 60_000);
        }, 60_000 - (Date.now() % 60_000) + 50);
        const onVisible = () => {
            if (document.visibilityState === "visible") setNow(Temporal.Now.instant());
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            window.clearTimeout(timeout);
            window.clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, []);

    return useMemo(() => {
        const mine = now.toZonedDateTimeISO(timeZone);
        const parts = new Intl.DateTimeFormat("en-US", {
            hour: "numeric", minute: "2-digit", timeZone, timeZoneName: "short",
        }).formatToParts(now.epochMilliseconds);
        const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";

        // Each zone's offset from UTC at this instant, daylight saving and half-hour zones included.
        const delta = Math.round((mine.offsetNanoseconds - now.toZonedDateTimeISO(Temporal.Now.timeZoneId()).offsetNanoseconds) / 60e9);
        const abs = Math.abs(delta);
        const h = Math.floor(abs / 60), m = abs % 60;

        return {
            hm: `${part("hour")}:${part("minute")}`,
            period: part("dayPeriod"),
            zone: part("timeZoneName") || "ET",
            delta,
            span: m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`,
            date: mine.toLocaleString("en-US", {weekday: "long", month: "long", day: "numeric"}),
            day: mine.toPlainDate().toString(),
        };
    }, [now, timeZone]);
}
