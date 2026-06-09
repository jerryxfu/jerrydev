import React, {useCallback, useEffect, useRef, useState} from "react";
import {ArrowLeft, ExternalLink} from "lucide-react";
import {Helmet} from "react-helmet-async";
import gsap from "gsap";
import {apiBaseUrl} from "../../main.tsx";
import "./Rendezvous.scss";

import {DEFAULT_SETTINGS, type EventMeta, type EventSettings, type ViewMode} from "./types.ts";
import IdleView from "./views/IdleView.tsx";
import CreateView from "./views/CreateView.tsx";
import CreatedView from "./views/CreatedView.tsx";
import JoinView from "./views/JoinView.tsx";
import RespondView from "./views/RespondView.tsx";
import ResultView from "./views/ResultView.tsx";

// --- GSAP transition helpers ---
function animateIn(el: HTMLElement | null, delay = 0) {
    if (!el) return;
    gsap.fromTo(el,
        {opacity: 0, y: 16},
        {opacity: 1, y: 0, duration: 0.33, delay, ease: "power2.out"}
    );
}

function animateOut(el: HTMLElement | null): Promise<void> {
    if (!el) return Promise.resolve();
    return new Promise((resolve) => {
        gsap.to(el, {
            opacity: 0, y: -12, duration: 0.2, ease: "power2.in",
            onComplete: resolve
        });
    });
}

export default function Rendezvous() {
    const [view, setView] = useState<ViewMode>(() =>
        new URLSearchParams(window.location.search).get("code") ? "joining" : "idle"
    );
    const [settings, setSettings] = useState<EventSettings>({...DEFAULT_SETTINGS});
    const [joinCode, setJoinCode] = useState(() =>
        new URLSearchParams(window.location.search).get("code")?.toUpperCase() ?? ""
    );
    const [createdCode, setCreatedCode] = useState<string | null>(null);
    const [event, setEvent] = useState<EventMeta | null>(null);
    const [respondName, setRespondName] = useState("");
    const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [stats, setStats] = useState<{ activeEvents: number } | null>(null);

    const viewRef = useRef<HTMLDivElement>(null);
    const hasInitialized = useRef(false);

    // Animate view transitions
    useEffect(() => {
        animateIn(viewRef.current);
    }, [view, createdCode, event]);

    // Fetch stats
    useEffect(() => {
        fetch(`${apiBaseUrl}/rendezvous/stats`)
            .then(r => r.json())
            .then(json => {
                if (json._success) setStats(json.data);
            })
            .catch(() => {
            });
    }, [view]);

    const transitionTo = async (nextView: ViewMode) => {
        await animateOut(viewRef.current);
        setView(nextView);
    };

    const reset = async () => {
        await animateOut(viewRef.current);
        setSettings({...DEFAULT_SETTINGS});
        setJoinCode("");
        setCreatedCode(null);
        setEvent(null);
        setRespondName("");
        setSelectedSlots(new Set());
        setError(null);
        setLoading(false);
        setCopiedField(null);
        window.history.replaceState({}, "", "/rendezvous");
        setView("idle");
    };

    const handleCreate = async () => {
        if (!settings.title.trim() || settings.dates.length === 0) {
            setError("Please enter a title and select at least one date.");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${apiBaseUrl}/rendezvous/event`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    title: settings.title,
                    dates: settings.dates,
                    timeStart: settings.timeStart,
                    timeEnd: settings.timeEnd,
                    granularity: settings.granularity,
                    ttlMs: settings.ttlMs,
                }),
            });
            const json = await res.json();
            if (!json._success) {
                setError(json.error?.message || "Failed to create event");
                setLoading(false);
                return;
            }
            setCreatedCode(json.data.code);
            await transitionTo("created");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to create event");
        } finally {
            setLoading(false);
        }
    };

    const fetchEvent = async (code?: string) => {
        const targetCode = (code || joinCode).trim().toUpperCase();
        if (!targetCode) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${apiBaseUrl}/rendezvous/event/${targetCode}`);
            const json = await res.json();
            if (!json._success) {
                setError(json.error?.message || "Event not found");
                setLoading(false);
                return;
            }
            setEvent(json.data as EventMeta);
            window.history.replaceState({}, "", `/rendezvous?code=${targetCode}`);
            await transitionTo("result");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to fetch event");
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch when arriving via a ?code= link (joinCode is seeded from the URL above)
    useEffect(() => {
        if (joinCode && !hasInitialized.current) {
            hasInitialized.current = true;
            void fetchEvent(joinCode);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRespond = async () => {
        if (!event || !respondName.trim()) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${apiBaseUrl}/rendezvous/event/${event.code}/respond`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    name: respondName.trim(),
                    slots: Array.from(selectedSlots),
                }),
            });
            const json = await res.json();
            if (!json._success) {
                setError(json.error?.message || "Failed to submit");
                setLoading(false);
                return;
            }
            // Refetch event to get updated responses
            const updated = await fetch(`${apiBaseUrl}/rendezvous/event/${event.code}`);
            const updatedJson = await updated.json();
            if (updatedJson._success) {
                setEvent(updatedJson.data as EventMeta);
            }
            await transitionTo("result");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to submit");
        } finally {
            setLoading(false);
        }
    };

    const toggleSlot = useCallback((slotKey: string) => {
        setSelectedSlots(prev => {
            const next = new Set(prev);
            if (next.has(slotKey)) next.delete(slotKey);
            else next.add(slotKey);
            return next;
        });
    }, []);

    const copyToClipboard = async (text: string, field: string, e?: React.MouseEvent) => {
        const btn = e?.currentTarget as HTMLElement | null;
        if (btn) {
            btn.classList.add("rv_btn--success");
            setTimeout(() => btn.classList.remove("rv_btn--success"), 1500);
        }
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const goToResults = async () => {
        if (!event) return;
        // Refetch latest data
        try {
            const res = await fetch(`${apiBaseUrl}/rendezvous/event/${event.code}`);
            const json = await res.json();
            if (json._success) setEvent(json.data as EventMeta);
        } catch { /* use existing data */
        }
        await transitionTo("result");
    };

    return (
        <div className="rv">
            <Helmet>
                <title>Rendezvous 🗓️ | jerryxf</title>
                <meta name="description"
                      content="Find the best time for your group to meet. Share availabilities and schedule events effortlessly." />
                <link rel="canonical" href="https://jerryxf.net/rendezvous" />
            </Helmet>

            <div className="rv_container">
                <a href="/" className="rv_home-link">
                    <ExternalLink size={13} />
                    <span>jerryxf.net</span>
                </a>
                <header className="rv_header">
                    {view !== "idle" && (
                        <button className="rv_back" onClick={reset}>
                            <ArrowLeft size={16} />
                            <span>Back</span>
                        </button>
                    )}
                    <h1>Rendezvous 🗓️</h1>
                    {view === "idle" && (
                        <p className="caption-text">Find the best time for your group to meet!</p>
                    )}
                </header>

                {/* Views */}
                <div ref={viewRef}>
                    {view === "idle" && (
                        <IdleView
                            onCreateEvent={() => transitionTo("creating")}
                            onJoinEvent={() => transitionTo("joining")}
                        />
                    )}

                    {view === "creating" && (
                        <CreateView
                            settings={settings}
                            setSettings={setSettings}
                            error={error}
                            loading={loading}
                            onCreate={handleCreate}
                            onCancel={reset}
                        />
                    )}

                    {view === "created" && createdCode && (
                        <CreatedView
                            code={createdCode}
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                            onDone={reset}
                            onOpen={() => fetchEvent(createdCode)}
                        />
                    )}

                    {view === "joining" && !event && (
                        <JoinView
                            code={joinCode}
                            setCode={setJoinCode}
                            error={error}
                            loading={loading}
                            onJoin={() => fetchEvent()}
                            onCancel={reset}
                        />
                    )}

                    {view === "responding" && event && (
                        <RespondView
                            event={event}
                            name={respondName}
                            setName={setRespondName}
                            selectedSlots={selectedSlots}
                            onToggleSlot={toggleSlot}
                            error={error}
                            loading={loading}
                            onSubmit={handleRespond}
                            onViewResults={goToResults}
                        />
                    )}

                    {view === "result" && event && (
                        <ResultView
                            event={event}
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                            onAddAvailability={() => transitionTo("responding")}
                        />
                    )}
                </div>
            </div>

            <div className="rv_spacer" />
            {stats && (
                <div className="rv_stats">
                    <span>{stats.activeEvents} active event{stats.activeEvents !== 1 ? "s" : ""}</span>
                </div>
            )}

            <footer className="rv_footer">
                <p>
                    <a href="/rendezvous">🗓️ Rendezvous</a>, made with ❤️ by Jerry
                </p>
            </footer>
        </div>
    );
}