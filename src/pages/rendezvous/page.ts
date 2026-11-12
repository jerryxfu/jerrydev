import type {Page} from "@/head.ts";
import {readAnswers} from "./answers.ts";

// An event has one address: the tool's letter, then the code (/r/K3F9Q).
const LETTER = "r";
export const eventPath = (code: string): string => `/${LETTER}/${code}`;

export default {
    path: "/rendezvous",
    letter: LETTER,
    name: "Rendezvous 📍",
    description: "Find the best time for your group to meet. Share availabilities and schedule events effortlessly.",
    words: "meet meeting event schedule availability poll",
    // The events you answered.
    saved: () => Object.entries(readAnswers()).map(([code, answer]) => ({
        id: `rendezvous:${code}`,
        title: `Rendezvous ${code}`,
        detail: `Answered as ${answer.name}`,
        href: eventPath(code),
    })),
} satisfies Page;
