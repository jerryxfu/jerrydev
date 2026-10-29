import React, {useEffect, useState} from "react";
import {Check, Clipboard, Link, Radio} from "lucide-react";
import Button from "@/components/Button/Button.tsx";
import {type P2PSnapshot, type P2PStatus} from "../types.ts";
import {formatBytes, getDropUrl} from "../utils.ts";
import P2PProgress from "./P2PProgress.tsx";
import {LocalFilePreview} from "./FilePreview.tsx";
import FileZone from "./FileZone.tsx";
import CopyField from "./CopyField.tsx";
import {type PickedFile, shownFile, stackLabel, stackSize} from "../files.ts";
import "./P2PSendView.scss";

interface P2PSendViewProps {
    files: PickedFile[];
    setFiles: (files: PickedFile[]) => void;
    /** Several files being zipped before the code is made: how far it's got, 0 to 1. */
    preparing: number | null;
    code: string | null;
    expiresAt: string | null;
    status: P2PStatus;
    snapshot: P2PSnapshot | null;
    running: boolean;
    error: string | null;
    /** Monthly relay quota spent: transfers are direct only. */
    relayDisabled: boolean;
    copiedField: string | null;
    onCopy: (text: string, field: string, e?: React.MouseEvent) => void;
    onStart: () => void;
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
        files, setFiles, preparing, code, expiresAt,
        status, snapshot, running, error, relayDisabled,
        copiedField, onCopy, onStart, onCancel,
    }: P2PSendViewProps
) {
    const remaining = useCountdown(expiresAt);

    // The file whose preview shows: the only one, or the one opened in the stack (as in UploadView).
    const [open, setOpen] = useState<string | null>(null);
    const shown = shownFile(files, open);
    const transferring = status.phase === "transferring" || status.phase === "connected";

    return (
        <div className="expedite_p2p-send expedite_split">
            {!running && (
                <>
                    <div className="expedite_main expedite_main--fill">
                        <FileZone
                            files={files}
                            onFiles={setFiles}
                            open={shown?.path ?? null}
                            onOpen={setOpen}
                            limit="No size limit (well... capped by the receiver's free storage)"
                        />
                    </div>

                    <div className="expedite_side">
                        {/* What this mode does, in plain words, before the technical side folded under Advanced. */}
                        <div>
                            <p className="expedite_p2p-about-title">Explanation</p>
                            <p className="expedite_p2p-about">
                                Your file goes straight from this device to the other one, like AirDrop. Nothing is uploaded first.
                                You get a code, the other person enters it, and the file arrives while both pages stay open.
                            </p>
                        </div>

                        <div className="expedite_p2p-notes">
                            <p className="expedite_p2p-notes-title">Before you start</p>
                            <ul>
                                <li>Keep this tab open and awake for the whole transfer. Closing it will stop the transfer.</li>
                                <li>The recipient needs a computer. For files over 1 GB, they will also need a Chromium-based browser (e.g. Google
                                    Chrome, Edge, Opera, Brave, etc.).
                                </li>
                                <li>Nothing is stored in the cloud during transfer because it's a (one-time) peer-to-peer transfer.</li>
                                {relayDisabled && (
                                    <li>TURN relay not available. This month's relay quota is used up, so transfers are direct-only until it
                                        resets.</li>
                                )}
                            </ul>
                        </div>

                        {error && <p className="expedite_error">{error}</p>}

                        <div className="expedite_btn-row">
                            <Button onClick={onCancel}>Cancel</Button>
                            <Button variant="main" start={Radio} onClick={onStart} disabled={!files.length}>
                                Get a code
                            </Button>
                        </div>
                    </div>

                    {/* The file, under both columns, as on the drop form. */}
                    <div className="expedite_wide">
                        {shown && <LocalFilePreview key={shown.path} file={shown.file} name={shown.file.name} />}
                    </div>
                </>
            )}

            {running && (
                <>
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
                </>
            )}
        </div>
    );
}
