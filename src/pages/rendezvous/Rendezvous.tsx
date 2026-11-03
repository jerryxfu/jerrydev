import {useEffect, useState} from "react";
import {Plus} from "lucide-react";
import Navbar from "@/components/Nav/Navbar.tsx";
import MakeView from "./views/MakeView.tsx";
import EventView from "./views/EventView.tsx";
import {getStats} from "./api.ts";
import "./Rendezvous.scss";

// The event in the link (/rendezvous?code=K3F9Q), or none: the screen to make one.
const codeInUrl = () => new URLSearchParams(window.location.search).get("code")?.toUpperCase() || null;

export default function Rendezvous() {
    const [code, setCode] = useState(codeInUrl);
    const [stats, setStats] = useState<{ activeEvents: number; answers: number } | null>(null);

    // The footer's numbers, as Expedite's: again on each screen.
    useEffect(() => {
        getStats().then(setStats, () => { /* no numbers, no line */
        });
    }, [code]);

    // Back and forward, between the event and the screen that made it.
    useEffect(() => {
        const onPop = () => setCode(codeInUrl());
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, []);

    const open = (next: string | null) => {
        window.history.pushState({}, "", next ? `/rendezvous?code=${next}` : "/rendezvous");
        setCode(next);
        window.scrollTo(0, 0);
    };

    // Someone opening an event came for it, not for the site: no navbar on its page, as on Expedite's received drops.
    const bare = code !== null;

    return (
        <div className={`rv${bare ? " rv--bare" : ""}`}>
            {!bare && (
                <>
                    <Navbar isShrunk={true} />
                    <div className="nav-spacer" />
                </>
            )}

            <div className="rv_container">
                <header className="rv_header">
                    {code && (
                        <button className="rv_back" onClick={() => open(null)}>
                            <Plus size={16} />
                            <span>New event</span>
                        </button>
                    )}
                    <h1>Rendezvous 📍</h1>
                    {!code && <p className="caption-text">Find the best time for your group to meet!</p>}
                </header>

                {code ? <EventView key={code} code={code} onNew={() => open(null)} /> : <MakeView onMade={open} />}
            </div>

            <div className="rv_spacer" />
            {stats && (
                <div className="rv_stats">
                    <span>{stats.activeEvents} active event{stats.activeEvents !== 1 ? "s" : ""}</span>
                    <span>·</span>
                    <span>{stats.answers} answer{stats.answers !== 1 ? "s" : ""}</span>
                </div>
            )}
            <footer className="rv_footer">
                <p>
                    <a href="/rendezvous">📍 Rendezvous</a>, made with ❤️ by Jerry
                </p>
            </footer>
        </div>
    );
}
