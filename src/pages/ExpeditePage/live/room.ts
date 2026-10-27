import {apiBaseUrl} from "../../../main.tsx";
import type {LiveItem, LiveMember, LiveRoom, UploadSnapshot} from "../types.ts";
import {putToR2, type UploadPlan} from "../uploadEngine.ts";

// A live room's calls to the API (routes/expedite/live.ts there), and your seats. Plain functions, as the transfer
// engines are; the room's state is useLiveRoom's.

// Your seat in each room you're in, by code: the token the API gave, kept until the room ends. A reload, or the room's
// link opened again in this browser, puts you back in your seat rather than in a new one.
const SEATS_KEY = "expedite:live";

type Seats = Record<string, { token: string; expiresAt: string }>;

function readSeats(): Seats {
    try {
        const seats = JSON.parse(localStorage.getItem(SEATS_KEY) ?? "{}") as Seats;
        // Rooms that have ended are forgotten.
        return Object.fromEntries(Object.entries(seats).filter(([, seat]) => new Date(seat.expiresAt).getTime() > Date.now()));
    } catch {
        return {};
    }
}

function writeSeats(seats: Seats): void {
    try {
        localStorage.setItem(SEATS_KEY, JSON.stringify(seats));
    } catch { /* storage refused (a private window): the seat lasts as long as the page */
    }
}

export function seatToken(code: string): string | null {
    return readSeats()[code]?.token ?? null;
}

export function keepSeat(code: string, token: string, expiresAt: string): void {
    writeSeats({...readSeats(), [code]: {token, expiresAt}});
}

export function forgetSeat(code: string): void {
    const seats = readSeats();
    delete seats[code];
    writeSeats(seats);
}

/** An answer of the API that isn't a success, with its status: 404 is a room that has ended. */
export class LiveError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

async function call<T>(
    path: string,
    {method = "GET", token, body, signal, keepalive}: {
        method?: string; token?: string; body?: unknown; signal?: AbortSignal; keepalive?: boolean
    } = {}
): Promise<T> {
    const res = await fetch(`${apiBaseUrl}/expedite/live${path}`, {
        method,
        headers: {
            ...(body !== undefined ? {"Content-Type": "application/json"} : {}),
            ...(token ? {"X-Live-Token": token} : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
        keepalive,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new LiveError(json?.error?.message || `The room didn't answer (${res.status})`, res.status);
    return json?.data as T;
}

export const createRoom = () => call<LiveRoom>("", {method: "POST"});

/** A seat in the room: yours again with its token, else a new one. */
export const joinRoom = (code: string, token: string | null) =>
    call<LiveRoom>(`/${code}/join`, {method: "POST", body: token ? {token} : {}});

/** Your page is still open: you show as here (the API counts you away 90 s after the last one). */
export const checkIn = (code: string, token: string) => call<void>(`/${code}/here`, {method: "POST", token});

export const rename = (code: string, token: string, id: string, name: string) =>
    call<{ name: string }>(`/${code}/members/${id}`, {method: "PATCH", token, body: {name}});

/** Leave (your own id), or remove someone (the room's creator). */
export const removeMember = (code: string, token: string, id: string) =>
    call<void>(`/${code}/members/${id}`, {method: "DELETE", token});

export const endRoom = (code: string, token: string) => call<void>(`/${code}`, {method: "DELETE", token});

export const sendText = (code: string, token: string, text: string, language: string | null) =>
    call<{ id: string }>(`/${code}/items`, {method: "POST", token, body: {kind: "text", text, ...(language ? {language} : {})}});

/** Deletes one of your items. `keepalive` for a page that's closing: the upload it stops must still be told. */
export const deleteItem = (code: string, token: string, id: string, keepalive = false) =>
    call<void>(`/${code}/items/${id}`, {method: "DELETE", token, keepalive});

/**
 * Sends a file to your box: the API makes its item (the others see it coming), the bytes go to R2 by its links, then the
 * API is told it's whole. `onStart` gets the item's id, for its progress. A file given up (cancelled, failed) is deleted.
 */
export async function sendFile(
    code: string, token: string, file: File,
    onStart: (id: string) => void, onProgress: (s: UploadSnapshot) => void, signal: AbortSignal
): Promise<void> {
    const plan = await call<UploadPlan & { id: string }>(`/${code}/items`, {
        method: "POST", token, signal,
        body: {kind: "file", fileName: file.name, fileSize: file.size, mimeType: file.type || "application/octet-stream"},
    });
    onStart(plan.id);
    try {
        const parts = await putToR2(file, plan, onProgress, signal);
        await call(`/${code}/items/${plan.id}/complete`, {method: "POST", token, body: {parts}, signal});
    } catch (err) {
        void deleteItem(code, token, plan.id, true).catch(() => undefined);
        throw err;
    }
}

export interface StreamHandlers {
    members: (data: { ownerId: string; members: LiveMember[] }) => void;
    items: (items: LiveItem[]) => void;
    /** The room ended (its creator, or its hour), or you were removed from it. */
    closed: (why: "ended" | "removed") => void;
    /** The stream was refused or can't be reopened. */
    lost: () => void;
}

/**
 * The room's stream (EventSource reconnects on its own when the connection drops). Returns how to close it. After
 * `ended` or `removed` it's closed here, or EventSource would reopen it.
 */
export function openStream(code: string, token: string, on: StreamHandlers): () => void {
    const source = new EventSource(`${apiBaseUrl}/expedite/live/${code}/events?token=${encodeURIComponent(token)}`);
    source.addEventListener("members", (e) => on.members(JSON.parse(e.data)));
    source.addEventListener("items", (e) => on.items(JSON.parse(e.data)));
    for (const why of ["ended", "removed"] as const) {
        source.addEventListener(why, () => {
            source.close();
            on.closed(why);
        });
    }
    source.onerror = () => {
        if (source.readyState === EventSource.CLOSED) on.lost();
    };
    return () => source.close();
}
