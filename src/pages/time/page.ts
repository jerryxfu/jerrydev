import type {Page} from "@/head.ts";
import {fromNow} from "@/utils.ts";
import {loadUntil} from "./until.ts";

export default {
    path: "/time",
    name: "Time",
    description: "Time tools on one page: a Unix time converter, a countdown (to a date too), a stopwatch, date and hour calculators, world clocks, a duration adder and an A/V sync test pattern.",
    words: "unix timestamp epoch countdown timer stopwatch clock zone date calculator duration sum sync",
    // A countdown to a moment under way here: the page opens on it.
    saved: () => {
        const until = loadUntil();
        if (!until) return [];
        const at = Temporal.Instant.fromEpochMilliseconds(until.end)
            .toLocaleString(undefined, {weekday: "short", hour: "numeric", minute: "2-digit"});
        return [{id: "time:until", title: `Countdown until ${at}`, detail: `Ends ${fromNow(until.end - Date.now())}`, href: "/time"}];
    },
} satisfies Page;
