import {useEffect, useState} from "react";
import {Plus} from "lucide-react";
import {Redirect, useLocation, useParams, useSearch} from "wouter";
import Navbar from "@/components/Nav/Navbar.tsx";
import MakeView from "./views/MakeView.tsx";
import EventView from "./views/EventView.tsx";
import {getStats} from "./api.ts";
import page, {eventPath} from "./page.ts";
import "./Rendezvous.scss";

export default function Rendezvous() {
    const [, navigate] = useLocation();
    // The event in the address (/r/K3F9Q), or none (/rendezvous): the screen to make one.
    const code = useParams<{ code?: string }>().code?.toUpperCase() ?? null;
    const oldCode = new URLSearchParams(useSearch()).get("code");
    const [stats, setStats] = useState<{ activeEvents: number; answers: number } | null>(null);

    // The footer's numbers, as Expedite's: again on each screen.
    useEffect(() => {
        getStats().then(setStats, () => { /* no numbers, no line */
        });
    }, [code]);

    // A link made before 12 Nov 2026 (/rendezvous?code=K3F9Q) goes on to the event's address. An event lasts 95 days
    // at most: this and `oldCode` can go after 1 March 2027.
    if (oldCode) return <Redirect to={eventPath(oldCode)} replace />;

    const toMake = () => navigate(page.path);

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
                        <button className="rv_back" onClick={toMake}>
                            <Plus size={16} />
                            <span>New event</span>
                        </button>
                    )}
                    <h1>Rendezvous 📍</h1>
                    {!code && <p className="caption-text">Find the best time for your group to meet!</p>}
                </header>

                {code ? <EventView key={code} code={code} onNew={toMake} /> : <MakeView onMade={(made) => navigate(eventPath(made))} />}
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
