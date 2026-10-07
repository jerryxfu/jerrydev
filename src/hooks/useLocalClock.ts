import {useEffect, useMemo, useState} from "react";

// My clock, for the contact block and the hero's Montréal card. A named zone rather than a fixed offset, so all of
// this follows daylight saving on its own: Montréal is EST only from November to March, EDT the rest of the year.
export const MY_ZONE = "America/Toronto";

// Minutes that a zone is ahead of UTC at this instant. Intl gives the wall-clock reading in that zone;
// treating that reading as if it were UTC and subtracting the real instant yields the offset, DST and
// half-hour zones included. Rounded to the minute because the parts are only second-accurate.
function zoneOffsetMinutes(date: Date, timeZone: string): number {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone, hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(date);
    // Read by part type rather than through an Object.fromEntries lookup: that returns an index signature, and under noUncheckedIndexedAccess every field off it is string | undefined.
    const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    // hour is 0-23 under hour12: false, except that some engines emit 24 for midnight.
    const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
    return Math.round((asUTC - date.getTime()) / 60000);
}

export type LocalClock = {
    hm: string; // "6:41", apart from the period so a morph only swaps the digits that changed
    period: string; // "PM"
    zone: string; // "EDT"
    // How far my clock is from the reader's, in minutes: positive when mine is ahead.
    delta: number;
    // That distance, unsigned: "6h", "2h30", "0h".
    span: string;
};

export default function useLocalClock(timeZone: string = MY_ZONE): LocalClock {
    const [now, setNow] = useState(() => new Date());

    // Ticks on the minute, so the digits change when a wall clock's would. Every zone's offset is a whole number of
    // minutes, so the epoch's minutes line up with everyone's. A tab coming back from the background catches up at once.
    useEffect(() => {
        let interval: number | undefined;
        const timeout = window.setTimeout(() => {
            setNow(new Date());
            interval = window.setInterval(() => setNow(new Date()), 60_000);
        }, 60_000 - (Date.now() % 60_000) + 50);
        const onVisible = () => {
            if (document.visibilityState === "visible") setNow(new Date());
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            window.clearTimeout(timeout);
            window.clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, []);

    return useMemo(() => {
        const parts = new Intl.DateTimeFormat("en-US", {
            hour: "numeric", minute: "2-digit", timeZone, timeZoneName: "short",
        }).formatToParts(now);
        const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";

        // getTimezoneOffset is minutes behind UTC, so it is negated to match zoneOffsetMinutes.
        const delta = zoneOffsetMinutes(now, timeZone) + now.getTimezoneOffset();
        const abs = Math.abs(delta);
        const h = Math.floor(abs / 60), m = abs % 60;

        return {
            hm: `${part("hour")}:${part("minute")}`,
            period: part("dayPeriod"),
            zone: part("timeZoneName") || "ET",
            delta,
            span: m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`,
        };
    }, [now, timeZone]);
}
