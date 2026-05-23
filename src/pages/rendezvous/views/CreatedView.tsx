import React from "react";
import {Check, Clipboard, Link} from "lucide-react";
import {getEventUrl} from "../utils.ts";
import "./CreatedView.scss";

interface CreatedViewProps {
    code: string;
    copiedField: string | null;
    onCopy: (text: string, field: string, e?: React.MouseEvent) => void;
    onDone: () => void;
}

export default function CreatedView({code, copiedField, onCopy, onDone}: CreatedViewProps) {
    return (
        <div className="rv_created">
            <p className="smaller-caption-text">Your event code</p>
            <button className="rv_code-display" onClick={(e) => onCopy(code, "code", e)}>
                <span className="rv_code-text">{code}</span>
                {copiedField === "code" ? <Check size={18} /> : <Clipboard size={18} />}
            </button>
            <p className="smaller-caption-text">
                {copiedField === "code" ? "Copied!" : "Tap to copy code"}
            </p>
            <div className="rv_link-box">
                <input
                    className="rv_link-input small-text"
                    type="text"
                    value={getEventUrl(code)}
                    readOnly
                    onFocus={(e) => e.target.select()}
                />
                <button
                    className="rv_link-copy"
                    onClick={(e) => onCopy(getEventUrl(code), "link", e)}
                >
                    {copiedField === "link" ? <Check size={14} /> : <Link size={14} />}
                </button>
            </div>

            <button className="rv_btn-secondary rv_btn-full" onClick={onDone}>
                Done
            </button>
        </div>
    );
}