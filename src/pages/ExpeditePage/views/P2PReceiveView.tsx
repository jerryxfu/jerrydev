import {Download, MonitorSmartphone, Radio} from "lucide-react";
import Button from "@/components/Button/Button.tsx";
import {type DropMeta, P2P_MEMORY_MAX, type P2PReceiveMode, type P2PSnapshot, type P2PStatus} from "../types.ts";
import {formatBytes, timeUntil} from "../utils.ts";
import P2PProgress from "./P2PProgress.tsx";
import "./P2PReceiveView.scss";

interface P2PReceiveViewProps {
    meta: DropMeta;
    /** How this browser receives: to a picked file, in memory up to P2P_MEMORY_MAX, or not at all (phones, tablets). */
    mode: P2PReceiveMode;
    status: P2PStatus;
    snapshot: P2PSnapshot | null;
    running: boolean;
    error: string | null;
    /** Monthly relay quota spent: transfers are direct only. */
    relayDisabled: boolean;
    onAccept: () => void;
    /** Received in memory: saves it to the downloads again, in case the browser didn't. */
    onSave?: () => void;
    onCancel: () => void;
}

export default function P2PReceiveView(
    {
        meta,
        mode,
        status,
        snapshot,
        running,
        error,
        relayDisabled,
        onAccept,
        onSave,
        onCancel
    }: P2PReceiveViewProps
) {
    const inMemory = mode === "memory";
    const tooBig = inMemory && meta.size > P2P_MEMORY_MAX;

    // --- Can't receive: a phone or tablet, or over what this browser can hold in memory ---
    if (mode === "none" || tooBig) {
        return (
            <div className="expedite_p2p-receive">
                <div className="expedite_p2p-blocked">
                    <MonitorSmartphone size={26} strokeWidth={1.4} />
                    <p className="expedite_p2p-blocked-title">
                        {tooBig ? "This file is too big for this browser" : "Direct P2P can't be received on a phone or tablet"}
                    </p>
                    <p className="expedite_p2p-blocked-body">
                        {tooBig
                            ? `Without a Chromium-based browser, Direct P2P drops are limited to 1 GB. This one is ${formatBytes(meta.size)}. Instead, you can:`
                            : "A phone or tablet pauses the page when its screen locks, which would stop the transfer. Instead, you can:"}
                    </p>
                    <ul className="expedite_p2p-blocked-list">
                        {meta.size > P2P_MEMORY_MAX
                            ? <li>Open this in a Chromium-based browser (Google Chrome, Edge, Opera, Brave etc.) on a computer.</li>
                            : <li>Open this on a computer.</li>}
                        <li>Use a regular file drop (not Direct P2P).</li>
                    </ul>
                </div>

                <div className="expedite_p2p-summary">
                    <span>{meta.fileName ?? "unnamed"}</span>
                    <span>{formatBytes(meta.size)}</span>
                    <span>expires in {timeUntil(meta.expiresAt)}</span>
                </div>

                <div className="expedite_btn-row">
                    <Button variant="main" className="expedite_btn-full" onClick={onCancel}>
                        Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="expedite_p2p-receive expedite_split">
            {!running && (
                <>
                    <div className="expedite_main expedite_main--fill">
                        <div className="expedite_p2p-offer expedite_grow">
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
                    </div>

                    <div className="expedite_side">
                        <div className="expedite_p2p-notes">
                            <p className="expedite_p2p-notes-title">How does this work?</p>
                            <ul>
                                {inMemory
                                    ? <li>Files up to 1 GB in this browser. The file is kept in this tab and saved to your downloads once it's complete.</li>
                                    : <li>You'll pick a save location first. The file is written there as it arrives.</li>}
                                <li>Keep this tab open until it finishes. Closing it aborts the transfer and discards the partial file.</li>
                                <li>The sender's tab must stay open too; the data come from their machine directly (it isn't stored in the cloud).
                                </li>
                                <li>One receiver per code. Accepting claims the session and begins data transfer.</li>
                                {relayDisabled && (
                                    <li>This month's relay quota is used up, so transfers are direct-only until it resets.</li>
                                )}
                            </ul>
                        </div>

                        {error && <p className="expedite_error">{error}</p>}

                        <div className="expedite_btn-row">
                            <Button onClick={onCancel}>Cancel</Button>
                            <Button variant="main" start={Download} onClick={onAccept}>
                                {inMemory ? "Receive" : <>Choose location &amp; receive</>}
                            </Button>
                        </div>
                    </div>
                </>
            )}

            {running && (
                <>
                    <p className="expedite_p2p-file">
                        {meta.fileName ?? "unnamed"} · {formatBytes(meta.size)}
                    </p>

                    <P2PProgress status={status} snapshot={snapshot} role="receive" inMemory={inMemory} />

                    {error && <p className="expedite_error">{error}</p>}

                    <div className="expedite_btn-row">
                        {status.phase === "done" && onSave && (
                            <Button start={Download} onClick={onSave}>Save again</Button>
                        )}
                        <Button
                            variant={status.phase === "done" ? "main" : "danger"}
                            className={status.phase === "done" && !onSave ? "expedite_btn-full" : undefined}
                            onClick={onCancel}
                        >
                            {status.phase === "done" ? "Done" : "Abort transfer"}
                        </Button>
                    </div>

                    <p className="expedite_p2p-standby">
                        {status.phase !== "done"
                            ? "Keep this tab open. Aborting discards the partial file."
                            : inMemory
                                ? "The file was saved to your downloads. If it didn't start, save it again. It's gone once you leave this page."
                                : "File was written to the location you chose."}
                    </p>
                </>
            )}
        </div>
    );
}
