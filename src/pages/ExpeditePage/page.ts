import type {Page} from "@/head.ts";
import {fromNow} from "@/utils.ts";
import {readSeats} from "./live/seats.ts";

export default {
    path: "/expedite",
    name: "Expedite 📦",
    description: "Quickly share files and text snippets with other people or across your own devices.",
    words: "share send file text code drop upload transfer p2p live room",
    // The live rooms you have a seat in.
    saved: () => Object.entries(readSeats()).map(([code, seat]) => ({
        id: `expedite:${code}`,
        title: `Live room ${code}`,
        detail: `Your seat, ends ${fromNow(Temporal.Instant.from(seat.expiresAt).epochMilliseconds - Date.now())}`,
        href: `/expedite?code=${code}`,
    })),
} satisfies Page;
