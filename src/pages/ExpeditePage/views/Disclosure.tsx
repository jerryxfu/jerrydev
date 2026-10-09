import {type ReactNode, useState} from "react";
import {ChevronRight} from "lucide-react";
import "./Disclosure.scss";

interface DisclosureProps {
    /** Names the section in this browser's storage, which remembers whether it was left open. */
    id: string;
    title: string;
    /** A short state shown beside the title, so what's set inside shows while it's closed. */
    note?: string;
    children: ReactNode;
}

const storageKey = (id: string) => `expedite:open:${id}`;

/**
 * A section folded under its title, closed at first: the technical side of Direct P2P, which most people never need
 * (Raph and Samy, Oct 2026). A native <details>, so it opens from the keyboard and with a screen reader. Whoever opens
 * it finds it open next time, in this browser.
 */
export default function Disclosure({id, title, note, children}: DisclosureProps) {
    const [open, setOpen] = useState(() => {
        try {
            return localStorage.getItem(storageKey(id)) === "1";
        } catch {
            return false;
        }
    });

    return (
        <details
            className="expedite_disclosure"
            open={open}
            onToggle={(e) => {
                const next = e.currentTarget.open;
                setOpen(next);
                try {
                    localStorage.setItem(storageKey(id), next ? "1" : "0");
                } catch {
                    // Storage off (a private window): it just won't be remembered.
                }
            }}
        >
            <summary className="expedite_disclosure-summary">
                <ChevronRight size={15} className="expedite_disclosure-chevron" aria-hidden />
                <span>{title}</span>
                {note && <span className="expedite_disclosure-note">· {note}</span>}
            </summary>
            <div className="expedite_disclosure-body">{children}</div>
        </details>
    );
}
