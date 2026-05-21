import React from "react";
import {Check, Clipboard, Link} from "lucide-react";
import {getDropUrl} from "../utils.ts";
import "./CreatedView.scss";

interface CreatedViewProps {
    code: string;
    copiedField: string | null;
    onCopy: (text: string, field: string, e?: React.MouseEvent) => void;
    onDone: () => void;
}

export default function CreatedView({code, copiedField, onCopy, onDone}: CreatedViewProps) {
    return (
        <div className="expedite_created">
            <p className="smaller-caption-text">Your drop code</p>
            <button className="expedite_code-display" onClick={(e) => onCopy(code, "code", e)}>
                <span className="expedite_code-text">{code}</span>
                {copiedField === "code" ? <Check size={18} /> : <Clipboard size={18} />}
            </button>
            <p className="smaller-caption-text">
                {copiedField === "code" ? "Copied!" : "Tap to copy code"}
            </p>
            <div className="expedite_link-box">
                <input
                    className="expedite_link-input small-text"
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

            <button className="expedite_btn-secondary expedite_btn-full" onClick={onDone}>
                Done
            </button>
        </div>
    );
}