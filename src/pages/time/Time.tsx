import {useState} from "react";
import {Helmet} from "react-helmet-async";
import {ExternalLink} from "lucide-react";
import {type TabId, TABS} from "./types.ts";
import UnixConverter from "./tabs/UnixConverter.tsx";
import "./Time.scss";
import TimeBar from "./TimeBar.tsx";
import Stopwatch from "./tabs/Stopwatch.tsx";

export default function Time() {
    const [tab, setTab] = useState<TabId>("unix");

    return (
        <div className="time">
            <Helmet>
                <title>Time | jerryxf</title>
                <meta name="description"
                      content="Unix converter, countdown, stopwatch, date calculator, and local time info — a clean set of time tools." />
                <link rel="canonical" href="https://jerryxf.net/time" />
            </Helmet>

            <div className="time_container">
                <a href="/" className="time_home-link">
                    <ExternalLink size={13} />
                    <span>jerryxf.net</span>
                </a>

                <header className="time_header">
                    <h1>Time</h1>
                    <p className="time_sub">A small set of time tools — convert, count down, measure, calculate.</p>
                </header>

                <TimeBar />

                <nav className="time_tabs">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            className={`time_tab ${tab === t.id ? "active" : ""}`}
                            onClick={() => setTab(t.id)}
                        >
                            {t.label}
                        </button>
                    ))}
                </nav>

                <div className="time_panel">
                    {tab === "unix" && <UnixConverter />}
                    {tab === "countdown" && <Placeholder name="Countdown" />}
                    {tab === "stopwatch" && <Stopwatch />}
                    {tab === "calculator" && <Placeholder name="Date calculator" />}
                    {tab === "local" && <Placeholder name="Local time" />}
                </div>
            </div>
        </div>
    );
}

function Placeholder({name}: { name: string }) {
    return <p className="time_placeholder">{name} — coming next.</p>;
}