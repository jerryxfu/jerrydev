import {useState} from "react";
import Navbar from "@/components/Nav/Navbar.tsx";
// First: the tools' own styles build on the shared pieces in here, so they have to come after it.
import "./Time.scss";
import {type TabId, TABS} from "./types.ts";
import TimeBar from "./TimeBar.tsx";
import UnixConverter from "./tabs/UnixConverter.tsx";
import Stopwatch from "./tabs/Stopwatch.tsx";
import Countdown from "./tabs/Countdown.tsx";
import DateCalculator from "./tabs/DateCalculator.tsx";
import LocalTime from "./tabs/LocalTime.tsx";

export default function Time() {
    const [tab, setTab] = useState<TabId>("time");
    // The progress bars belong to the Time tab: open there, folded under their toggle in the others, so a tool sits
    // higher (Jerry). Opened or closed by hand, they stay so until the tab changes.
    const [barsOpen, setBarsOpen] = useState(true);

    const choose = (id: TabId) => {
        setTab(id);
        setBarsOpen(id === "time");
    };

    return (
        <div className="time">
            <Navbar isShrunk={true} />
            <div className="nav-spacer" />

            <div className="time_container">
                <header className="time_header">
                    <h1>Time</h1>
                    <p className="caption-text">A small set of time tools: convert, count down, measure, calculate.</p>
                </header>

                <TimeBar open={barsOpen} onToggle={() => setBarsOpen((open) => !open)} />

                <div className="time_tabs" role="group" aria-label="Tools">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            className={`time_tab ${tab === t.id ? "active" : ""}`}
                            aria-pressed={tab === t.id}
                            onClick={() => choose(t.id)}
                        >
                            <t.icon size={16} strokeWidth={1.8} aria-hidden />
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="time_panel">
                    {tab === "time" && (
                        <div className="time_stack">
                            <UnixConverter />
                            <LocalTime />
                        </div>
                    )}
                    {tab === "countdown" && <Countdown />}
                    {tab === "stopwatch" && <Stopwatch />}
                    {tab === "calculator" && <DateCalculator />}
                </div>
            </div>
        </div>
    );
}
