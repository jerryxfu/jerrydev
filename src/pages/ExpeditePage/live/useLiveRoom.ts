import {useEffect, useEffectEvent, useRef, useState} from "react";
import {apiBaseUrl} from "../../../main.tsx";
import {AUTO, PLAIN, resolveLanguage} from "../highlight.ts";
import type {LiveItem, LiveMember, LiveRoom, UploadSnapshot} from "../types.ts";
import * as api from "./room.ts";

/** Files in a live room are 1 GB at most (the API's LIVE_MAX_FILE_SIZE): checked here first, to say so at once. */
export const LIVE_MAX_FILE_SIZE = 1024 ** 3;

const message = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong");

// How often the page tells the API you're here. It counts you away 90 s after the last time (its LIVE_ONLINE_MS): a
// hidden tab's timer can slow to once a minute, and a file going up checks in too, so a page still open always makes it.
const CHECK_IN_MS = 30_000;

// The stream sends a text, or a finished file's links, once: after that the item comes without them, and keeps what the
// page already has. A stream that reopens sends the links again, signed anew: the page keeps the ones it has (signed
// until the room ends), or every picture in the room would download again.
function merge(prev: LiveItem[], next: LiveItem[]): LiveItem[] {
    const had = new Map(prev.map((i) => [i.id, i]));
    return next.map((item) => {
        const old = had.get(item.id);
        if (!old || item.status !== "complete") return item;
        return {...item, text: item.text ?? old.text, fileUrl: old.fileUrl ?? item.fileUrl, downloadUrl: old.downloadUrl ?? item.downloadUrl};
    });
}

/**
 * A live room as the page has it: the room, the people in it and their items as its stream sends them, your files going
 * up, and what to do in it. Expedite.tsx holds one, opened by `create` or `join` and closed by `close` (Back, leaving
 * the page: the seat stays yours) or by leaving or ending the room.
 */
export function useLiveRoom() {
    const [room, setRoom] = useState<LiveRoom | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [members, setMembers] = useState<LiveMember[]>([]);
    const [ownerId, setOwnerId] = useState<string | null>(null);
    const [items, setItems] = useState<LiveItem[]>([]);
    // Your files going up, by item id: their parts and bytes sent. Kept once the bytes are up, so the card doesn't drop
    // to "Sending..." before the item shows complete, and then until the room closes here (unused by then).
    const [uploads, setUploads] = useState<Record<string, UploadSnapshot>>({});
    // Items that came in while the room was open, not in its first list: shown arriving.
    const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
    const [closed, setClosed] = useState<"ended" | "removed" | null>(null);
    // The stream was refused and the room is still there: a button reconnects.
    const [lost, setLost] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Stops the stream and the check-ins, which run together.
    const stopStream = useRef<(() => void) | null>(null);
    const lastCheckIn = useRef(0);
    // Every file going up (from before its item exists), and by item id for its cancel button.
    const sending = useRef(new Set<AbortController>());
    const sendingById = useRef(new Map<string, AbortController>());
    // The items seen so far; null until the room's first list.
    const known = useRef<Set<string> | null>(null);
    // While the tab is hidden, what came in from the others counts in its title: "(2) Expedite".
    const unread = useRef(0);
    const title = useRef<string | null>(null);

    const showUnread = () => {
        title.current ??= document.title;
        document.title = unread.current ? `(${unread.current}) ${title.current}` : title.current;
    };

    useEffect(() => {
        const onVisible = () => {
            if (document.hidden || !unread.current) return;
            unread.current = 0;
            showUnread();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, []);

    // Leaving the page (a closed tab, another site) or Expedite stops the stream and the files going up, as Back does
    // (close): a file given up is deleted, with keepalive, so the others don't see it coming forever.
    useEffect(() => {
        const files = sending.current;
        const stop = () => {
            stopStream.current?.();
            for (const controller of files) controller.abort();
        };
        window.addEventListener("pagehide", stop);
        return () => {
            window.removeEventListener("pagehide", stop);
            stop();
        };
    }, []);

    const stopUploads = () => {
        for (const controller of sending.current) controller.abort();
        sending.current.clear();
        sendingById.current.clear();
    };

    // A failed one is left: the stream says when the room has ended or you were removed.
    const checkIn = (code: string, myToken: string) => {
        lastCheckIn.current = Date.now();
        void api.checkIn(code, myToken).catch(() => undefined);
    };

    const connect = (code: string, myToken: string, myId: string) => {
        stopStream.current?.();
        setLost(false);
        // You're here while this page has the room open: the page says so, now and every CHECK_IN_MS. Not the stream: in
        // production the platform keeps it open after its page has gone.
        checkIn(code, myToken);
        const timer = window.setInterval(() => checkIn(code, myToken), CHECK_IN_MS);
        const closeStream = api.openStream(code, myToken, {
            members: (data) => {
                setMembers(data.members);
                setOwnerId(data.ownerId);
            },
            items: (list) => {
                setItems((prev) => merge(prev, list));
                if (known.current === null) {
                    known.current = new Set(list.map((i) => i.id));
                    return;
                }
                const seen = known.current;
                const arrived = list.filter((i) => !seen.has(i.id));
                if (arrived.length === 0) return;
                for (const item of arrived) seen.add(item.id);
                setFresh((prev) => new Set([...prev, ...arrived.map((i) => i.id)]));
                if (document.hidden) {
                    unread.current += arrived.filter((i) => i.memberId !== myId).length;
                    showUnread();
                }
            },
            closed: (why) => {
                api.forgetSeat(code);
                stopStream.current?.();
                stopStream.current = null;
                stopUploads();
                setClosed(why);
            },
            lost: () => {
                // The check-ins stop with the stream: a page that hears nothing more isn't here. Reconnecting starts both.
                stopStream.current?.();
                stopStream.current = null;
                // A room that has ended answers 404; one still there refused this stream (a seat that's gone, or too
                // many tries from this network): reconnecting is left to a click.
                fetch(`${apiBaseUrl}/expedite/drop/${code}`)
                    .then((res) => {
                        if (res.status !== 404) throw new Error("still there");
                        api.forgetSeat(code);
                        setClosed("ended");
                    })
                    .catch(() => setLost(true));
            },
        });
        stopStream.current = () => {
            closeStream();
            window.clearInterval(timer);
        };
    };

    // Back to the page from the browser's cache (its Back button, after another site): the stream stopped as the page
    // went, so it opens again. What came in meanwhile arrives as new.
    const resume = useEffectEvent((e: PageTransitionEvent) => {
        if (e.persisted && room && token && !closed) connect(room.code, token, room.me.id);
    });
    useEffect(() => {
        window.addEventListener("pageshow", resume);
        return () => window.removeEventListener("pageshow", resume);
    }, []);

    const enter = (r: LiveRoom) => {
        const myToken = r.me.token ?? api.seatToken(r.code);
        if (!myToken) throw new Error("The room didn't give this page a seat");
        api.keepSeat(r.code, myToken, r.expiresAt);
        known.current = null;
        setRoom(r);
        setToken(myToken);
        setMembers(r.members);
        setOwnerId(r.ownerId);
        setItems([]);
        setUploads({});
        setFresh(new Set());
        setClosed(null);
        setError(null);
        // The room's link: a reload, or the link sent to someone, opens it again.
        window.history.replaceState({}, "", `/expedite?code=${r.code}`);
        connect(r.code, myToken, r.me.id);
    };

    /** Stops what runs (the stream, files going up) and forgets the room here. The seat stays yours until the room ends. */
    const close = () => {
        stopStream.current?.();
        stopStream.current = null;
        stopUploads();
        unread.current = 0;
        if (title.current) document.title = title.current;
        setRoom(null);
        setToken(null);
        setMembers([]);
        setItems([]);
        setUploads({});
        setClosed(null);
        setLost(false);
        setError(null);
    };

    const create = async () => enter(await api.createRoom());
    const join = async (code: string) => enter(await api.joinRoom(code, api.seatToken(code)));

    const reconnect = async () => {
        if (!room) return;
        try {
            enter(await api.joinRoom(room.code, token));
        } catch (err) {
            setError(message(err));
        }
    };

    /** A text into your box, its language guessed (code is highlighted, anything else stays plain). True once it's in. */
    const postText = async (text: string): Promise<boolean> => {
        if (!room || !token || !text.trim()) return false;
        const language = resolveLanguage(AUTO, text);
        try {
            await api.sendText(room.code, token, text, language === PLAIN ? null : language);
            setError(null);
            return true;
        } catch (err) {
            setError(message(err));
            return false;
        }
    };

    /** Files into your box, all at once. */
    const postFiles = (files: File[]) => {
        if (!room || !token) return;
        setError(null);
        for (const file of files) {
            if (file.size > LIVE_MAX_FILE_SIZE) {
                setError(`${file.name} is over 1 GB. Send it as a File drop.`);
                continue;
            }
            const controller = new AbortController();
            sending.current.add(controller);
            let id: string | null = null;
            api.sendFile(room.code, token, file,
                (itemId) => {
                    id = itemId;
                    sendingById.current.set(itemId, controller);
                    setUploads((u) => ({...u, [itemId]: {mode: "single", parts: [], uploadedBytes: 0, totalBytes: file.size}}));
                },
                (s) => {
                    const itemId = id;
                    if (itemId) setUploads((u) => ({...u, [itemId]: s}));
                    // A hidden tab's timer can lag: a file going up keeps you here, so it's never taken for given up.
                    if (Date.now() - lastCheckIn.current >= CHECK_IN_MS) checkIn(room.code, token);
                },
                controller.signal,
            )
                .catch((err: unknown) => {
                    if ((err as Error).name !== "AbortError") setError(`${file.name}: ${message(err)}`);
                    // Given up: its item is deleted, and its progress with it.
                    const itemId = id;
                    if (itemId) setUploads((u) => Object.fromEntries(Object.entries(u).filter(([key]) => key !== itemId)));
                })
                .finally(() => {
                    sending.current.delete(controller);
                    if (id) sendingById.current.delete(id);
                });
        }
    };

    /** Deletes one of your items; a file still going up is stopped (and deleted as it stops). */
    /** One of your items deleted, or stopped while it goes up. True once it's done (the room's next list leaves it out). */
    const removeItem = async (id: string): Promise<boolean> => {
        if (!room || !token) return false;
        const upload = sendingById.current.get(id);
        if (upload) {
            upload.abort();
            return true;
        }
        try {
            await api.deleteItem(room.code, token, id);
            return true;
        } catch (err) {
            setError(message(err));
            return false;
        }
    };

    const renameMe = async (name: string) => {
        if (!room || !token) return;
        try {
            const done = await api.rename(room.code, token, room.me.id, name);
            // At once here; the others see it on their stream's next look.
            setMembers((list) => list.map((m) => (m.id === room.me.id ? {...m, name: done.name} : m)));
            setError(null);
        } catch (err) {
            setError(message(err));
        }
    };

    /** The room's creator removes someone: their seat frees, their items go. True once it's done. */
    const removePerson = async (id: string): Promise<boolean> => {
        if (!room || !token) return false;
        try {
            await api.removeMember(room.code, token, id);
            return true;
        } catch (err) {
            setError(message(err));
            return false;
        }
    };

    /** Leave (your items go with you), or end the room for everyone if you made it. True once it's done. */
    const leave = async (): Promise<boolean> => {
        if (!room || !token) return false;
        try {
            if (room.me.id === ownerId) await api.endRoom(room.code, token);
            else await api.removeMember(room.code, token, room.me.id);
            api.forgetSeat(room.code);
            // Nothing more to hear: its "ended" or "removed" would swap the room for that message as it fades out.
            stopStream.current?.();
            stopStream.current = null;
            return true;
        } catch (err) {
            setError(message(err));
            return false;
        }
    };

    return {
        room, members, ownerId, items, uploads, fresh, closed, lost, error,
        create, join, close, reconnect, postText, postFiles, removeItem, renameMe, removePerson, leave,
    };
}

export type LiveRoomState = ReturnType<typeof useLiveRoom>;
