import {type ReactNode, useState} from "react";
import {CircleQuestionMark, File, FileText, MonitorSmartphone, Radio} from "lucide-react";
import {type DropType} from "../types.ts";
import "./LandingView.scss";

interface LandingViewProps {
    onSelect: (type: DropType) => void;
    code: string;
    setCode: (code: string) => void;
    error: string | null;
    loading: boolean;
    onRetrieve: () => void;
    p2pSupported: boolean;
}

// `help` is the long-form answer behind the question mark. Optional because only
// the mode people actually have to choose between needs one.
const TILES: {
    type: DropType; label: string; note: string; desc: string; icon: typeof File; help?: ReactNode;
}[] = [
    {
        type: "text", label: "Text", note: "freeform text", icon: FileText,
        desc: "Stored in the cloud, up to 500 KB. Expires between 1 minute and 24 hours.",
    },
    {
        type: "file", label: "File", note: "up to 16 GB", icon: File,
        desc: "Uploaded to the cloud, up to 16 GB. Expires between 1 minute and 24 hours.",
    },
    {
        type: "p2p", label: "Direct P2P", note: "peer-to-peer", icon: Radio,
        desc: "Sent directly from one device to the other. Nothing stored online, no size limit. Faster.",
        help: (
            <>
                <p>
                    <strong>File</strong> is the "Google Drive" approach: the file is uploaded first, then you send a link, and the other person
                    downloads it whenever they get around to it. Use this when you're sending it off and getting on with your day.
                </p>
                <p>
                    <strong>Direct P2P</strong> is the "AirDrop" approach: there's no upload step; the transfer happens live while both tabs are open.
                    Use this when you're both at your devices right now, or when you're moving something between your own.
                </p>
            </>
        ),
    },
];

export default function LandingView(
    {onSelect, code, setCode, error, loading, onRetrieve, p2pSupported}: LandingViewProps
) {
    // Which mode's help panel is expanded, if any. A plain disclosure rather
    // than a hover tooltip: hover has no touch equivalent, and this much text
    // in a floating bubble would run off the side of a phone.
    const [openHelp, setOpenHelp] = useState<DropType | null>(null);

    return (
        <div className="expedite_landing">
            {/* --- Send --- */}
            <section className="expedite_landing-section">
                <p className="expedite_landing-label">Send</p>

                <div className="expedite_tiles">
                    {TILES.map(({type, label, note, icon: Icon}) => (
                        <button
                            key={type}
                            className="expedite_tile"
                            onClick={() => onSelect(type)}
                        >
                            <Icon size={20} strokeWidth={1.5} />
                            <span className="expedite_tile-label">{label}</span>
                            <span className="expedite_tile-note">{note}</span>
                        </button>
                    ))}
                </div>

                <dl className="expedite_landing-modes">
                    {TILES.map(({type, label, desc, help}) => (
                        <div key={type} className="expedite_mode">
                            <dt className="expedite_mode-term">
                                {label}
                                {help && (
                                    <button
                                        type="button"
                                        className="expedite_help-toggle"
                                        aria-expanded={openHelp === type}
                                        aria-controls={`expedite-help-${type}`}
                                        aria-label={`Which mode should I use? (${label})`}
                                        onClick={() => setOpenHelp(openHelp === type ? null : type)}
                                    >
                                        <CircleQuestionMark size={14} strokeWidth={2} />
                                    </button>
                                )}
                            </dt>
                            {/* The panel lives inside the <dd>: a <div> in a <dl>
                                may only group a <dt> with its <dd>. */}
                            <dd className="expedite_mode-desc">
                                {desc}
                                {help && openHelp === type && (
                                    <div className="expedite_help-panel" id={`expedite-help-${type}`}>
                                        {help}
                                    </div>
                                )}
                            </dd>
                        </div>
                    ))}
                </dl>
            </section>

            <div className="expedite_landing-divider" role="separator" />

            {/* --- Receive --- */}
            <section className="expedite_landing-section">
                <p className="expedite_landing-label">Receive</p>

                <input
                    className="expedite_code-input"
                    type="text"
                    placeholder="Enter drop code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    maxLength={5}
                    onKeyDown={(e) => e.key === "Enter" && onRetrieve()}
                />

                {error && <p className="expedite_error">{error}</p>}

                <button
                    className="expedite_btn-primary expedite_btn-full"
                    onClick={onRetrieve}
                    disabled={loading || code.trim().length < 5}
                >
                    {loading ? "Resolving..." : "Retrieve"}
                </button>

                <p className="expedite_landing-hint">
                    Enter the code or paste the link in your browser search bar.
                </p>

                {!p2pSupported && (
                    <div className="expedite_landing-notice">
                        <MonitorSmartphone size={22} strokeWidth={1.4} />
                        <p className="expedite_landing-notice-text">
                            Direct P2P drops can't be received on this browser. The recipient needs a Chromium-based browser (e.g. Google Chrome,
                            Edge, Opera, Brave, etc.) on computer. Sending works anywhere.
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
}
