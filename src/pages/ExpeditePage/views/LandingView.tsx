import {File, FileText, Radio} from "lucide-react";
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

const TILES: { type: DropType; label: string; note: string; icon: typeof File }[] = [
    {type: "text", label: "Text", note: "snippet or paste", icon: FileText},
    {type: "file", label: "File", note: "up to 16 GB", icon: File},
    {type: "p2p", label: "Direct P2P", note: "no upload", icon: Radio},
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

                <p className="expedite_landing-hint">
                    Direct P2P (peer-to-peer) streams data from browser to browser directly. Nothing is stored on the cloud and
                    there's no size limit. Best when you're both online at the same time.
                    {!p2pSupported && " Sending works here; receiving needs Google Chrome or Edge on a computer."}
                    {/*  TODO: add a description for eahc transfer mode  */}
                </p>
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
            </section>
        </div>
    );
}
