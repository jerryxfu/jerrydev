import {apiBaseUrl} from "../../main.tsx";
import {type EventMeta, type EventSettings} from "./types.ts";

// Rendezvous's calls to the API (routes/rendezvous there), and your answers. A call gives its data, or throws an
// ApiError with the API's message.
export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

async function call<T>(path: string, init?: { method: string; body: unknown }): Promise<T> {
    const res = await fetch(`${apiBaseUrl}/rendezvous${path}`, init && {
        method: init.method,
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(init.body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(json.error?.message || "Something went wrong. Try again.", res.status);
    return json.data as T;
}

export const createEvent = (settings: EventSettings) =>
    call<{ code: string }>("/event", {method: "POST", body: {...settings, timeZone: Temporal.Now.timeZoneId()}});

export const getEvent = (code: string) => call<EventMeta>(`/event/${code}`);

/** For the footer: events still open, and the answers in them. */
export const getStats = () => call<{ activeEvents: number; answers: number }>("/stats");

/** Your answer: a new one gives back a token, kept here to change it later. */
export async function respond(code: string, name: string, slots: string[]): Promise<void> {
    const mine = myAnswer(code);
    const data = await call<{ name: string; token?: string }>(`/event/${code}/respond`, {
        method: "POST", body: {name, slots, token: mine?.token},
    });
    const token = data.token ?? mine?.token;
    if (token) keepAnswer(code, {token, name: data.name});
}

// --- Your answers, by event code, and the name you last answered with (for the next event) ---

const ANSWERS_KEY = "rendezvous:answers";
const NAME_KEY = "rendezvous:name";
// An event ends the day after its last date; a month covers it, and drops the answers of events long gone.
const KEPT_DAYS = 31;

type Answer = { token: string; name: string; at: string };

function readAnswers(): Record<string, Answer> {
    try {
        const all = JSON.parse(localStorage.getItem(ANSWERS_KEY) ?? "{}") as Record<string, Answer>;
        const since = Temporal.Now.instant().subtract({hours: 24 * KEPT_DAYS});
        return Object.fromEntries(Object.entries(all).filter(([, a]) => Temporal.Instant.compare(a.at, since) > 0));
    } catch {
        return {};
    }
}

export const myAnswer = (code: string): Answer | null => readAnswers()[code] ?? null;

function keepAnswer(code: string, answer: Omit<Answer, "at">): void {
    try {
        localStorage.setItem(ANSWERS_KEY, JSON.stringify({...readAnswers(), [code]: {...answer, at: Temporal.Now.instant().toString()}}));
        localStorage.setItem(NAME_KEY, answer.name);
    } catch { /* storage refused (a private window): the answer can't be changed from this page later */
    }
}

export function lastName(): string {
    try {
        return localStorage.getItem(NAME_KEY) ?? "";
    } catch {
        return "";
    }
}
