import {apiBaseUrl} from "../../main.tsx";
import {type EventMeta, type EventSettings} from "./types.ts";
import {keepAnswer, myAnswer} from "./answers.ts";

// Rendezvous's calls to the API (routes/rendezvous there); your answers are in answers.ts. A call gives its data, or
// throws an ApiError with the API's message.
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
