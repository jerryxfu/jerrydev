import React from "react";
import {Check, Clipboard, Link} from "lucide-react";
import {QRCodeSVG} from "qrcode.react";
import {getDropUrl, timeUntil, when} from "../utils.ts";
import useMediaQuery from "../../../hooks/useMediaQuery.ts";
import "./CreatedView.scss";

/** What the drop just created will do: told back under its code, so the sender knows what they made. */
export interface CreatedInfo {
    expiresAt: string;
    maxViews: number | null;
    deletable: boolean;
}

interface CreatedViewProps {
    code: string;
    info: CreatedInfo | null;
    copiedField: string | null;
    onCopy: (text: string, field: string, e?: React.MouseEvent) => void;
    onDone: () => void;
}

export default function CreatedView({code, info, copiedField, onCopy, onDone}: CreatedViewProps) {
    // A pointer that hovers clicks; a finger taps.
    const verb = useMediaQuery("(hover: hover)") ? "Click" : "Tap";

    return (
        <div className="expedite_created">
            <div className="expedite_created-share">
                <p className="text-small">Your drop code</p>
                <button className="expedite_code-display" onClick={(e) => onCopy(code, "code", e)}>
                    <span className="expedite_code-text">{code}</span>
                    {copiedField === "code" ? <Check size={18} /> : <Clipboard size={18} />}
                </button>
                <p className="text-small">
                    {copiedField === "code" ? "Copied!" : `${verb} to copy the code`}
                </p>
                <div className="expedite_link-box">
                    <input
                        className="expedite_link-input text-small"
                        type="text"
                        value={getDropUrl(code)}
                        readOnly
                        onFocus={(e) => e.target.select()}
                    />
                    <button
                        className="expedite_link-copy"
                        onClick={(e) => onCopy(getDropUrl(code), "link", e)}
                    >
                        {copiedField === "link" ? <Check size={14} /> : <Link size={14} />}
                    </button>
                </div>

                {info && (
                    <p className="expedite_created-summary">
                        <span>Expires {when(info.expiresAt)} (in {timeUntil(info.expiresAt)})</span>
                        <span>{info.maxViews == null ? "No view limit" : info.maxViews === 1 ? "Can be opened once" : `Can be opened ${info.maxViews} times`}</span>
                        <span>{info.deletable ? "The recipient can delete it" : "The recipient can't delete it"}</span>
                    </p>
                )}
            </div>

            {/* The link, for a phone's camera (issue #70). Dark on white in every theme: some scanners can't read a light
                code on a dark ground. */}
            <figure className="expedite_qr">
                <QRCodeSVG
                    className="expedite_qr-code"
                    value={getDropUrl(code)}
                    size={168}
                    marginSize={3}
                    bgColor="#ffffff"
                    fgColor="#1a1a1a"
                    title="QR code of the drop's link"
                />
                <figcaption className="text-caption">Scan to open it on another device</figcaption>
            </figure>

            <button className="expedite_btn-primary expedite_btn-full" onClick={onDone}>
                Done
            </button>

            <p className="text-caption">Copy the code or the link now: this page won't show them again.</p>
        </div>
    );
}