import React from "react";
import {Check, Clipboard, Link} from "lucide-react";
import Button from "@/components/Button/Button.tsx";
import {type P2PSnapshot, type P2PStatus} from "../types.ts";
import {formatBytes, getDropUrl} from "../utils.ts";
import P2PProgress from "./P2PProgress.tsx";
import CopyField from "./CopyField.tsx";
import Shimmer from "@/components/Shimmer/Shimmer.tsx";
import {type PickedFile, stackLabel, stackSize} from "../files.ts";
import "./P2PSendView.scss";

interface P2PSendViewProps {
    files: PickedFile[];
    /** Several files being zipped before the code is made: how far it's got, 0 to 1. */
    preparing: number | null;
    /** It stays the same for as long as the page waits for a receiver. */
    code: string | null;
    status: P2PStatus;
    snapshot: P2PSnapshot | null;
    error: string | null;
    copiedField: string | null;
    onCopy: (text: string, field: string, e?: React.MouseEvent) => void;
    onCancel: () => void;
}

/**
 * A direct transfer under way, from the sender's side: the code to pass on, then the progress. The form before it (the
 * files, what Direct does, Get a code) is the files' screen's Direct tab, in UploadView.
 */
export default function P2PSendView(
    {files, preparing, code, status, snapshot, error, copiedField, onCopy, onCancel}: P2PSendViewProps
) {
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
                </div>
            )}

            {files.length > 0 && (
                <p className="expedite_p2p-file">
                    {stackLabel(files)} · {formatBytes(stackSize(files))}
                </p>
            )}

            {preparing != null && (
                <p className="expedite_status-line"><Shimmer>Preparing the zip...</Shimmer> {Math.floor(preparing * 100)}%</p>
            )}

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
