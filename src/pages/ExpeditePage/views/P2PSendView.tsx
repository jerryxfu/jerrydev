import React, {useEffect, useState} from "react";
import {Check, Clipboard, Link} from "lucide-react";
import Button from "@/components/Button/Button.tsx";
import {type P2PSnapshot, type P2PStatus} from "../types.ts";
import {formatBytes, getDropUrl} from "../utils.ts";
import P2PProgress from "./P2PProgress.tsx";
import CopyField from "./CopyField.tsx";
import {type PickedFile, stackLabel, stackSize} from "../files.ts";
import "./P2PSendView.scss";

interface P2PSendViewProps {
    files: PickedFile[];
    /** Several files being zipped before the code is made: how far it's got, 0 to 1. */
    preparing: number | null;
    code: string | null;
    expiresAt: string | null;
    status: P2PStatus;
    snapshot: P2PSnapshot | null;
    error: string | null;
    copiedField: string | null;
    onCopy: (text: string, field: string, e?: React.MouseEvent) => void;
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
    return Math.max(0, Math.round((Temporal.Instant.from(expiresAt).epochMilliseconds - now) / 1000));
}

function mmss(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * A direct transfer under way, from the sender's side: the code to pass on, then the progress. The form before it (the
 * files, what Direct does, Get a code) is the files' screen's Direct tab, in UploadView.
 */
export default function P2PSendView(
    {files, preparing, code, expiresAt, status, snapshot, error, copiedField, onCopy, onCancel}: P2PSendViewProps
) {
    const remaining = useCountdown(expiresAt);
    const transferring = status.phase === "transferring" || status.phase === "connected";

    return (
        <div className="expedite_p2p-send">
            {code && !transferring && status.phase !== "done" && (
                <div className="expedite_p2p-code-block">
                    <p className="text-small">Your code</p>
                    <button className="expedite_code-display" onClick={(e) => onCopy(code, "code", e)}>
                        <span className="expedite_code-text">{code}</span>
                        {copiedField === "code" ? <Check size={18} /> : <Clipboard size={18} />}
                    </button>

                    <CopyField
                        value={getDropUrl(code)}
                        label="The drop's link"
                        copyLabel="Copy the link"
                        icon={Link}
                        field="link"
                        copiedField={copiedField}
                        onCopy={onCopy}
                    />

                    {remaining != null && (
                        <p className={`expedite_p2p-countdown${remaining <= 60 ? " is-low" : ""}`}>
                            New code in {mmss(remaining)}
                        </p>
                    )}
                </div>
            )}

            {files.length > 0 && (
                <p className="expedite_p2p-file">
                    {stackLabel(files)} · {formatBytes(stackSize(files))}
                </p>
            )}

            {preparing != null && <p className="expedite_status-line">Preparing the zip... {Math.floor(preparing * 100)}%</p>}

            <P2PProgress status={status} snapshot={snapshot} role="send" />

            {error && <p className="expedite_error">{error}</p>}

            <div className="expedite_btn-row">
                <Button
                    variant={status.phase === "done" ? "main" : "danger"}
                    className={status.phase === "done" ? "expedite_btn-full" : undefined}
                    onClick={onCancel}
                >
                    {status.phase === "done" ? "Done" : "Cancel"}
                </Button>
            </div>

            <p className="expedite_p2p-standby">
                {status.phase === "done"
                    ? "Transfer complete. The code no longer works."
                    : "Keep this tab open. Closing it will stop the transfer and invalidate the code."}
            </p>
        </div>
    );
}
