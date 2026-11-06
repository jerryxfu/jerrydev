import type {Page} from "@/head.ts";
import {readAnswers} from "./answers.ts";

export default {
    path: "/rendezvous",
    name: "Rendezvous 📍",
    description: "Find the best time for your group to meet. Share availabilities and schedule events effortlessly.",
    words: "meet meeting event schedule availability poll",
    // The events you answered.
    saved: () => Object.entries(readAnswers()).map(([code, answer]) => ({
        id: `rendezvous:${code}`,
        title: `Rendezvous ${code}`,
        detail: `Answered as ${answer.name}`,
        href: `/rendezvous?code=${code}`,
    })),
} satisfies Page;
