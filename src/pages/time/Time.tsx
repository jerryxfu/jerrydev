import {useState} from "react";
import Navbar from "@/components/Nav/Navbar.tsx";
// First: the tools' own styles build on the shared pieces in here, so they have to come after it.
import "./Time.scss";
import {type TabId, TABS} from "./types.ts";
import TimeBar from "./TimeBar.tsx";
import UnixConverter from "./tabs/UnixConverter.tsx";
import Stopwatch from "./tabs/Stopwatch.tsx";
import Countdown, {untilUnderWay} from "./tabs/Countdown.tsx";
import DateCalculator from "./tabs/DateCalculator.tsx";
import LocalTime from "./tabs/LocalTime.tsx";
import SyncPattern from "./tabs/SyncPattern.tsx";
import DiscordTimestamp from "./tabs/DiscordTimestamp.tsx";
import DurationSum from "./tabs/DurationSum.tsx";

export default function Time() {
    // On the countdown when one to a moment is under way (it's remembered until it's over), else on Time.
    const [tab, setTab] = useState<TabId>(() => (untilUnderWay() ? "countdown" : "time"));
    // The progress bars belong to the Time tab: open there, folded under their toggle in the others, so a tool sits
    // higher (Jerry). Opened or closed by hand, they stay so until the tab changes.
    const [barsOpen, setBarsOpen] = useState(() => tab === "time");

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
                    {/* Mounted on every tab, hidden on the others, so they keep running there (#74). */}
                    <div hidden={tab !== "countdown"}><Countdown active={tab === "countdown"} /></div>
                    <div hidden={tab !== "stopwatch"}><Stopwatch active={tab === "stopwatch"} /></div>
                    {tab === "calculator" && <DateCalculator />}
                    {tab === "sync" && <SyncPattern />}
                    {/* Small tools, a card each. */}
                    {tab === "tools" && (
                        <div className="time_stack">
                            <DiscordTimestamp />
                            <DurationSum />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
