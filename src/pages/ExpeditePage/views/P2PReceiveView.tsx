import {Download, MonitorSmartphone, Radio} from "lucide-react";
import {type DropMeta, type P2PSnapshot, type P2PStatus} from "../types.ts";
import {formatBytes, timeUntil} from "../utils.ts";
import P2PProgress from "./P2PProgress.tsx";
import "./P2PReceiveView.scss";

interface P2PReceiveViewProps {
    meta: DropMeta;
    supported: boolean;
    useTurn: boolean;
    setUseTurn: (value: boolean) => void;
    status: P2PStatus;
    snapshot: P2PSnapshot | null;
    running: boolean;
    error: string | null;
    /** ICE failed -> the sender may republish with a relay; offer a re-check. */
    retryable: boolean;
    /** Monthly relay quota spent, the TURN toggle is off-limits. */
    relayDisabled: boolean;
    onAccept: () => void;
    onRetry: () => void;
    onCancel: () => void;
}

export default function P2PReceiveView(
    {
        meta,
        supported,
        useTurn,
        setUseTurn,
        status,
        snapshot,
        running,
        error,
        retryable,
        relayDisabled,
        onAccept,
        onRetry,
        onCancel
    }: P2PReceiveViewProps
) {
    // --- Unsupported: no save picker means no streaming sink ---
    if (!supported) {
        return (
            <div className="expedite_p2p-receive">
                <div className="expedite_p2p-blocked">
                    <MonitorSmartphone size={26} strokeWidth={1.4} />
                    <p className="expedite_p2p-blocked-title">Direct P2P can't be received on this browser</p>
                    <p className="expedite_p2p-blocked-body">
                        This browser doesn't support peer-to-peer transfers for large files. Alternatively, you can:
                    </p>
                    <ul className="expedite_p2p-blocked-list">
                        <li>Open this in a Chromium-based browser (Google Chrome, Edge, Opera, Brave etc.) on a computer.</li>
                        <li>Use a regular file drop (not Direct P2P).</li>
                    </ul>
                </div>

                <div className="expedite_p2p-summary">
                    <span>{meta.fileName ?? "unnamed"}</span>
                    <span>{formatBytes(meta.size)}</span>
                    <span>expires in {timeUntil(meta.expiresAt)}</span>
                </div>

                <div className="expedite_btn-row">
                    <button className="expedite_btn-primary expedite_btn-full" onClick={onCancel}>
                        Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="expedite_p2p-receive">
            {!running && (
                <>
                    <div className="expedite_p2p-offer">
                        <Radio size={22} strokeWidth={1.5} />
                        <div className="expedite_p2p-offer-text">
                            <p className="expedite_p2p-offer-name">{meta.fileName ?? "unnamed"}</p>
                            <p className="expedite_p2p-offer-meta">
                                {formatBytes(meta.size)}
                                {meta.mimeType ? ` · ${meta.mimeType}` : ""}
                                {" · session expires in "}{timeUntil(meta.expiresAt)}
                            </p>
                        </div>
                    </div>

                    <div className="expedite_settings">
                        <p className="expedite_settings-title">Transport</p>
                        <div className="expedite_setting-row">
                            <label className="text-small">
                                Allow TURN relay
                                <span className="expedite_setting-sub">
                                    ENABLE THIS IF YOU ARE BEHIND A FIREWALL (E.G. SCHOOL OR CORPORATE NETWORK)
                                    <br /><br />
                                    Allows Traversal Using Relays around NAT (TURN) when no direct path exists.
                                    Data passes will pass through Cloudflare TURN instead of going peer to peer.
                                </span>
                            </label>
                            <button
                                className={`expedite_toggle ${useTurn && !relayDisabled ? "active" : ""}`}
                                onClick={() => setUseTurn(!useTurn)}
                                disabled={relayDisabled}
                            >
                                <span className="expedite_toggle-knob" />
                            </button>
                        </div>
                        {relayDisabled && (
                            <p className="expedite_p2p-standby">
                                This month's relay quota is used up, so transfers are direct-only until it resets.
                            </p>
                        )}
                    </div>

                    <div className="expedite_p2p-notes">
                        <p className="expedite_p2p-notes-title">How does this work?</p>
                        <ul>
                            <li>You'll pick a save location first. The file is written there as it arrives, not after.</li>
                            <li>Keep this tab open until it finishes. Closing it aborts the transfer and discards the partial file.</li>
                            <li>The sender's tab must stay open too; the data come from their machine (it isn't stored in the cloud).</li>
                            <li>One receiver per code. Accepting claims the session and begins data transfer.</li>
                        </ul>
                    </div>

                    {error && <p className="expedite_error">{error}</p>}

                    <div className="expedite_btn-row">
                        <button className="expedite_btn-secondary" onClick={onCancel}>Cancel</button>
                        <button className="expedite_btn-primary" onClick={onAccept}>
                            <Download size={14} />
                            Choose location &amp; receive
                        </button>
                    </div>
                </>
            )}

            {running && (
                <>
                    <p className="expedite_p2p-file">
                        {meta.fileName ?? "unnamed"} · {formatBytes(meta.size)}
                    </p>

                    <P2PProgress status={status} snapshot={snapshot} role="receive" />

                    {error && <p className="expedite_error">{error}</p>}

                    {retryable && status.phase === "failed" && (
                        <p className="expedite_p2p-standby">
                            A direct route could not be found and the automatic relay
                            retry didn't go through. Ask the sender to restart the
                            transfer, then try again with the same code.
                        </p>
                    )}

                    <div className="expedite_btn-row">
                        {retryable && status.phase === "failed" && (
                            <button className="expedite_btn-primary" onClick={onRetry}>
                                Try again
                            </button>
                        )}
                        <button
                            className={status.phase === "done"
                                ? "expedite_btn-primary expedite_btn-full"
                                : "expedite_btn-secondary expedite_btn-secondary--danger"}
                            onClick={onCancel}
                        >
                            {status.phase === "done" ? "Done" : "Abort transfer"}
                        </button>
                    </div>

                    <p className="expedite_p2p-standby">
                        {status.phase === "done"
                            ? "File was written to the location you chose."
                            : "Keep this tab open. Aborting discards the partial file."}
                    </p>
                </>
            )}
        </div>
    );
}
