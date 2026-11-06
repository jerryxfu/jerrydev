import {useCallback, useEffect, useRef, useState} from "react";
import {Check, Clipboard, Link, LoaderCircle, Plus, Share2} from "lucide-react";
import Button from "@/components/Button/Button.tsx";
import useMediaQuery from "@/hooks/useMediaQuery.ts";
import {copyText} from "@/utils.ts";
import {type EventMeta} from "../types.ts";
import {getEventUrl} from "../utils.ts";
import {ApiError, getEvent, respond} from "../api.ts";
import {lastName, myAnswer} from "../answers.ts";
import {bestTimes} from "../best.ts";
import BestTimes from "../components/BestTimes.tsx";
import YourTimes from "./YourTimes.tsx";
import Everyone from "./Everyone.tsx";
import "./EventView.scss";

type Tab = "you" | "everyone";

// Back to the page after a while: the answers given meanwhile. Not more often, for the API's limit on lookups.
const REFRESH_AFTER_MS = 10_000;

/** An event's own page, the one its link opens: share it, give your times, see everyone's. */
export default function EventView({code, onNew}: { code: string; onNew: () => void }) {
    const [event, setEvent] = useState<EventMeta | null>(null);
    const [failed, setFailed] = useState<string | null>(null);
    // Answered already (on this device): everyone's first.
    const [tab, setTab] = useState<Tab>(() => myAnswer(code) ? "everyone" : "you");
    const [name, setName] = useState(() => myAnswer(code)?.name ?? lastName());
    const [slots, setSlots] = useState<Set<string>>(new Set());
    // Picks not saved yet: a refresh of the event leaves them alone.
    const edited = useRef(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const copiedTimer = useRef(0);
    // A phone's share sheet (Messages, Discord, Instagram...); a laptop copies the link.
    const canShare = useMediaQuery("(pointer: coarse)") && typeof navigator.share === "function";

    // The event as the API has it now, and your picks in it, unless some aren't saved yet.
    const load = useCallback(() => getEvent(code).then(next => {
        setEvent(next);
        if (!edited.current) {
            const me = myAnswer(code)?.name.toLowerCase();
            setSlots(new Set(next.responses.find(r => r.name.toLowerCase() === me)?.slots ?? []));
        }
    }, (err: unknown) => {
        // Shown only while there's no event yet: a refresh that fails keeps the one on screen.
        setFailed(err instanceof ApiError && err.status === 404
            ? "This event has ended, or the link is wrong."
            : err instanceof Error ? err.message : "Couldn't open the event. Try again.");
    }), [code]);

    useEffect(() => {
        void load();
        let last = Date.now();
        const onShow = () => {
            if (document.visibilityState !== "visible" || Date.now() - last < REFRESH_AFTER_MS) return;
            last = Date.now();
            void load();
        };
        document.addEventListener("visibilitychange", onShow);
        return () => {
            document.removeEventListener("visibilitychange", onShow);
            window.clearTimeout(copiedTimer.current);
        };
    }, [load]);

    const setSlot = useCallback((key: string, on: boolean) => {
        edited.current = true;
        setSlots(prev => {
            if (prev.has(key) === on) return prev;
            const next = new Set(prev);
            if (on) next.add(key);
            else next.delete(key);
            return next;
        });
    }, []);

    const save = async () => {
        if (!name.trim() || saving) return;
        setSaving(true);
        setError(null);
        try {
            await respond(code, name.trim(), [...slots]);
            edited.current = false;
            await load();
            setTab("everyone");
        } catch (err) {
            setError(err instanceof ApiError && err.status === 409
                ? `${err.message}. Pick another name.`
                : err instanceof Error ? err.message : "Couldn't save. Try again.");
        } finally {
            setSaving(false);
        }
    };

    const copy = async (text: string, what: string) => {
        if (!(await copyText(text))) return;
        setCopied(what);
        window.clearTimeout(copiedTimer.current);
        copiedTimer.current = window.setTimeout(() => setCopied(null), 1500);
    };

    if (!event) {
        return failed ? (
            <div className="rv_gone">
                <p>{failed}</p>
                <Button variant="main" start={Plus} onClick={onNew}>Make an event</Button>
            </div>
        ) : (
            <div className="rv_gone" aria-label="Opening the event">
                <LoaderCircle size={20} className="spinning" aria-hidden />
            </div>
        );
    }

    const url = getEventUrl(code);
    const answers = event.responses.length;
    const best = bestTimes(event);
    const share = () => navigator.share({title: event.title, text: `${event.title}: when are you free?`, url}).catch(() => {
        /* closed without sharing */
    });

    return (
        <div className="rv_event">
            <header className="rv_event-head">
                <h2 className="rv_event-title">{event.title}</h2>
                <p className="rv_note">
                    {event.dates.length} day{event.dates.length === 1 ? "" : "s"}
                    {" · "}
                    {answers === 0 ? "no answers yet" : `${answers} answered`}
                </p>
                <div className="rv_row">
                    <Button
                        variant={canShare ? "plain" : "main"}
                        start={copied === "link" ? Check : Link}
                        onClick={() => void copy(url, "link")}
                    >
                        {copied === "link" ? "Copied" : "Copy link"}
                    </Button>
                    {/* The code, as Expedite's received drops show theirs: a click copies it. */}
                    <Button
                        className="rv_code-btn"
                        end={copied === "code" ? Check : Clipboard}
                        title="Copy the code"
                        onClick={() => void copy(event.code, "code")}
                    >
                        {event.code}
                    </Button>
                    {canShare && <Button variant="main" start={Share2} onClick={() => void share()}>Share</Button>}
                </div>
            </header>

            {best.length > 0 && (
                <BestTimes event={event} stretches={best} url={url} copied={copied} onCopy={(text, what) => void copy(text, what)} />
            )}

            <div className="rv_tabs" role="tablist">
                <button role="tab" className="rv_tab" aria-selected={tab === "you"} onClick={() => setTab("you")}>
                    Your times
                </button>
                <button role="tab" className="rv_tab" aria-selected={tab === "everyone"} onClick={() => setTab("everyone")}>
                    Everyone{answers > 0 && ` (${answers})`}
                </button>
            </div>

            {tab === "you" ? (
                <YourTimes
                    event={event}
                    name={name}
                    setName={setName}
                    slots={slots}
                    setSlot={setSlot}
                    answered={myAnswer(code) !== null}
                    saving={saving}
                    error={error}
                    onSave={() => void save()}
                />
            ) : (
                <Everyone event={event} />
            )}
        </div>
    );
}
