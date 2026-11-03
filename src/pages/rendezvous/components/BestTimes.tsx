import {Check, Copy} from "lucide-react";
import Button from "@/components/Button/Button.tsx";
import {type EventMeta, PARTS} from "../types.ts";
import {discordText, type Stretch, summaryText, whoText} from "../best.ts";
import {formatDateShort, slotKey} from "../utils.ts";
import {SlotTime} from "./TimeSlotGrid.tsx";
import "./BestTimes.scss";

interface BestTimesProps {
    event: EventMeta;
    stretches: Stretch[];
    url: string;
    copied: string | null;
    onCopy: (text: string, what: string) => void;
}

// When, as the grid says it: the viewer's time, the event's in parentheses when the clocks differ.
function When({event, s}: { event: EventMeta; s: Stretch }) {
    const {day, month, date} = formatDateShort(s.date);
    const on = `${day}, ${month} ${date}`;
    if (event.granularity === "day") return <>{on}</>;
    if (event.granularity === "parts") return <>{on}, {PARTS.find(p => p.time === s.start)?.label.toLowerCase()}</>;
    return (
        <>
            {on}, <SlotTime date={s.date} time={s.start} timeZone={event.timeZone} />
            {" to "}<SlotTime date={s.date} time={s.end} timeZone={event.timeZone} />
        </>
    );
}

/** The few best times, and a copy of them to paste back in the chat. */
export default function BestTimes({event, stretches, url, copied, onCopy}: BestTimesProps) {
    const timed = typeof event.granularity === "number";
    return (
        <section className="rv_card rv_best">
            <div className="rv_best-head">
                <p className="rv_label">Best times</p>
                <div className="rv_row">
                    <Button start={copied === "best" ? Check : Copy} onClick={() => onCopy(summaryText(event, stretches, url), "best")}>
                        {copied === "best" ? "Copied" : "Copy"}
                    </Button>
                    {timed && (
                        <Button start={copied === "discord" ? Check : Copy} onClick={() => onCopy(discordText(event, stretches, url), "discord")}>
                            {copied === "discord" ? "Copied" : "Copy for Discord"}
                        </Button>
                    )}
                </div>
            </div>
            <ol className="rv_best-list">
                {stretches.map(s => (
                    <li key={slotKey(s.date, s.start)}>
                        <span className="rv_best-when"><When event={event} s={s} /></span>
                        <span className="rv_best-who">{whoText(event, s)}</span>
                    </li>
                ))}
            </ol>
        </section>
    );
}
