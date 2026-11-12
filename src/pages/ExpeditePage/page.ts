import type {Page} from "@/head.ts";
import {fromNow} from "@/utils.ts";
import {readSeats} from "./live/seats.ts";

// A drop, a live room or a P2P code has one address: the tool's letter, then the code (/e/K7XQ4).
const LETTER = "e";
export const dropPath = (code: string): string => `/${LETTER}/${code}`;

export default {
    path: "/expedite",
    letter: LETTER,
    name: "Expedite 📦",
    description: "Quickly share files and text snippets with other people or across your own devices.",
    words: "share send file text code drop upload transfer p2p live room",
    // The live rooms you have a seat in.
    saved: () => Object.entries(readSeats()).map(([code, seat]) => ({
        id: `expedite:${code}`,
        title: `Live room ${code}`,
        detail: `Your seat, ends ${fromNow(Temporal.Instant.from(seat.expiresAt).epochMilliseconds - Date.now())}`,
        href: dropPath(code),
    })),
} satisfies Page;
