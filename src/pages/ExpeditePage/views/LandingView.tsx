import {File, FileText, MonitorSmartphone, Radio} from "lucide-react";
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

const TILES: { type: DropType; label: string; note: string; desc: string; icon: typeof File }[] = [
    {
        type: "text", label: "Text", note: "snippet or paste", icon: FileText,
        desc: "Stored in the cloud, up to 500 KB. Expires between 1 minute and 24 hours.",
    },
    {
        type: "file", label: "File", note: "up to 16 GB", icon: File,
        desc: "Uploaded to object storage in the cloud. Expires between 1 minute and 24 hours.",
    },
    {
        type: "p2p", label: "Direct P2P", note: "peer-to-peer", icon: Radio,
        desc: "Faster. Sends the file directly from one device to the other. Best when you're both online at the same time, in person, or for transfers between your own devices. Nothing is stored online and there is no size limit.",
    },
];

export default function LandingView(
    {onSelect, code, setCode, error, loading, onRetrieve, p2pSupported}: LandingViewProps
) {
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
                    {TILES.map(({type, label, desc}) => (
                        <div key={type} className="expedite_mode">
                            <dt className="expedite_mode-term">{label}</dt>
                            <dd className="expedite_mode-desc">{desc}</dd>
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
                    {loading ? "Resolving…" : "Retrieve"}
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
