import React, {useEffect, useMemo, useState} from "react";
import {Check, Clipboard, Link, Radio} from "lucide-react";
import {type P2PSnapshot, type P2PStatus} from "../types.ts";
import {formatBytes, getDropUrl} from "../utils.ts";
import P2PProgress from "./P2PProgress.tsx";
import RelaySetting from "./RelaySetting.tsx";
import FilePreview from "./FilePreview.tsx";
import FileZone from "./FileZone.tsx";
import "./P2PSendView.scss";

interface P2PSendViewProps {
    selectedFile: globalThis.File | null;
    setSelectedFile: (file: globalThis.File | null) => void;
    useTurn: boolean;
    setUseTurn: (value: boolean) => void;
    code: string | null;
    expiresAt: string | null;
    status: P2PStatus;
    snapshot: P2PSnapshot | null;
    running: boolean;
    error: string | null;
    /** ICE failed without a relay in play -> offer the relay retry. */
    retryable: boolean;
    /** Monthly relay quota spent, the TURN toggle is off-limits. */
    relayDisabled: boolean;
    /** This attempt is the automatic relay fallback — annotates the progress readout. */
    relayRetry: boolean;
    copiedField: string | null;
    onCopy: (text: string, field: string, e?: React.MouseEvent) => void;
    onStart: () => void;
    onRetry: () => void;
    onCancel: () => void;
}

/**
 * Seconds remaining until the session code rotates.
 *
 * Ticks a clock and derives the remainder during render rather than storing the
 * countdown in state (setState inside an effect body cascades renders).
 */
function useCountdown(expiresAt: string | null): number | null {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!expiresAt) return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [expiresAt]);

    if (!expiresAt) return null;
    return Math.max(0, Math.round((new Date(expiresAt).getTime() - now) / 1000));
}

function mmss(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

export default function P2PSendView(
    {
        selectedFile, setSelectedFile, useTurn, setUseTurn, code, expiresAt,
        status, snapshot, running, error, retryable, relayDisabled, relayRetry,
        copiedField, onCopy, onStart, onRetry, onCancel,
    }: P2PSendViewProps
) {
    const remaining = useCountdown(expiresAt);

    // The picked file's preview URL, revoked when it changes (as in UploadView).
    const filePreview = useMemo(() => selectedFile ? URL.createObjectURL(selectedFile) : null, [selectedFile]);
    useEffect(() => {
        if (!filePreview) return;
        return () => URL.revokeObjectURL(filePreview);
    }, [filePreview]);
    const transferring = status.phase === "transferring" || status.phase === "connected";

    return (
        <div className="expedite_p2p-send expedite_split">
            {!running && (
                <>
                    <div className="expedite_main expedite_main--fill">
                        <FileZone
                            file={selectedFile}
                            onFile={setSelectedFile}
                            limit="No size limit (well... capped by the receiver's free storage)"
                        />
                    </div>

                    <div className="expedite_side">
                        <RelaySetting useTurn={useTurn} setUseTurn={setUseTurn} relayDisabled={relayDisabled} />

                        <div className="expedite_p2p-notes">
                            <p className="expedite_p2p-notes-title">Before you start</p>
                            <ul>
                                <li>Keep this tab open and awake for the whole transfer. Closing it kills the connection.</li>
                                <li>The recipient needs a Chromium-based browser (e.g. Google Chrome, Edge, Opera, Brave, etc.) on a computer.</li>
                                <li>Nothing is stored in the cloud during transfer because it's a one-time peer-to-peer transfer.</li>
                            </ul>
                        </div>

                        {error && <p className="expedite_error">{error}</p>}

                        <div className="expedite_btn-row">
                            <button className="expedite_btn-secondary" onClick={onCancel}>Cancel</button>
                            <button
                                className="expedite_btn-primary"
                                onClick={onStart}
                                disabled={!selectedFile}
                            >
                                <Radio size={14} />
                                Get a code
                            </button>
                        </div>
                    </div>

                    {/* The file, under both columns, as on the drop form. */}
                    <div className="expedite_wide">
                        {filePreview && selectedFile && (
                            <FilePreview
                                key={filePreview}
                                src={filePreview}
                                name={selectedFile.name}
                                mimeType={selectedFile.type}
                                size={selectedFile.size}
                                file={selectedFile}
                            />
                        )}
                    </div>
                </>
            )}

            {running && (
                <>
                    {code && !transferring && status.phase !== "done" && (
                        <div className="expedite_p2p-code-block">
                            <p className="text-small">Session code</p>
                            <button className="expedite_code-display" onClick={(e) => onCopy(code, "code", e)}>
                                <span className="expedite_code-text">{code}</span>
                                {copiedField === "code" ? <Check size={18} /> : <Clipboard size={18} />}
                            </button>

                            <div className="expedite_link-box">
                                <input
                                    className="expedite_link-input text-small"
                                    aria-label="The drop's link"
                                    type="text"
                                    value={getDropUrl(code)}
                                    readOnly
                                    onFocus={(e) => e.target.select()}
                                />
                                <button
                                    className="expedite_link-copy"
                                    aria-label={copiedField === "link" ? "Link copied" : "Copy the link"}
                                    onClick={(e) => onCopy(getDropUrl(code), "link", e)}
                                >
                                    {copiedField === "link" ? <Check size={14} /> : <Link size={14} />}
                                </button>
                            </div>

                            {remaining != null && (
                                <p className={`expedite_p2p-countdown${remaining <= 60 ? " is-low" : ""}`}>
                                    New code in {mmss(remaining)}
                                </p>
                            )}
                        </div>
                    )}

                    {selectedFile && (
                        <p className="expedite_p2p-file">
                            {selectedFile.name} · {formatBytes(selectedFile.size)}
                        </p>
                    )}

                    <P2PProgress status={status} snapshot={snapshot} role="send" relayRetry={relayRetry} />

                    {error && <p className="expedite_error">{error}</p>}

                    {retryable && status.phase === "failed" && (
                        <p className="expedite_p2p-standby">
                            No direct route was found, and the automatic relay retry
                            failed too. Retrying attempts the relay again. If this keeps
                            failing, both ends may be offline or blocked.
                        </p>
                    )}

                    <div className="expedite_btn-row">
                        {retryable && status.phase === "failed" && (
                            <button className="expedite_btn-primary" onClick={onRetry}>
                                Retry with relay
                            </button>
                        )}
                        <button
                            className={status.phase === "done"
                                ? "expedite_btn-primary expedite_btn-full"
                                : "expedite_btn-secondary expedite_btn-secondary--danger"}
                            onClick={onCancel}
                        >
                            {status.phase === "done" ? "Done" : "Close session"}
                        </button>
                    </div>

                    <p className="expedite_p2p-standby">
                        {status.phase === "done"
                            ? "Transfer complete. The session is closed and the code is dead."
                            : "Keep this tab open. Closing it tears down the connection and invalidates the code."}
                    </p>
                </>
            )}
        </div>
    );
}
