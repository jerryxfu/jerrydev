import {useState} from "react";
import {ClipboardPaste} from "lucide-react";
import {CAN_READ_CLIPBOARD, type Pasted, readClipboard} from "../paste.ts";

interface PasteLinkProps {
    /** What it says: what this place takes. */
    label: string;
    /** Takes what the clipboard holds. False when there's nothing in it for this place. */
    onPaste: (pasted: Pasted) => boolean;
    /** Said when there was nothing in it for this place. */
    none: string;
    disabled?: boolean;
}

/**
 * A caption that pastes (#98, Jerry): the paste icon, then a few underlined words, under what it fills and at its
 * left (the landing's tiles, the text box, the file zone). It reads the clipboard, so it isn't there in a browser
 * that can't; the keys paste everywhere (Expedite.tsx). What it couldn't do is said beside it.
 */
export default function PasteLink({label, onPaste, none, disabled = false}: PasteLinkProps) {
    const [note, setNote] = useState<string | null>(null);
    if (!CAN_READ_CLIPBOARD) return null;

    const paste = async () => {
        setNote(null);
        try {
            if (!onPaste(await readClipboard())) setNote(none);
        } catch {
            setNote("This browser didn't let the page read the clipboard.");
        }
    };

    return (
        <p className="expedite_paste">
            <button type="button" className="expedite_paste-link" onClick={() => void paste()} disabled={disabled}>
                <ClipboardPaste size={14} strokeWidth={1.8} aria-hidden />
                {label}
            </button>
            {note && <span className="expedite_paste-note" role="status">{note}</span>}
        </p>
    );
}
