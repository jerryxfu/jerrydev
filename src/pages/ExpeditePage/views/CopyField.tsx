import React, {type ReactNode} from "react";
import {Check, type LucideIcon} from "lucide-react";
import "./CopyField.scss";

// A command's links and its placeholders (<file>, <command>, <code>), each in a span of its own, for its colour.
function colourCommand(command: string): ReactNode[] {
    return command.split(/(https?:\/\/[^\s()<]+|<[a-z]+>)/).map((part, i) =>
        i % 2 === 0 ? part : (
            <span key={i} className={part.startsWith("<") ? "expedite_command-slot" : "expedite_command-link"}>{part}</span>
        )
    );
}

interface CopyFieldProps {
    value: string;
    // What the button copies, when it isn't what the field shows: a command without its placeholder code.
    copy?: string;
    // The field's name and the button's, for screen readers: "The drop's link", "Copy the link".
    label: string;
    copyLabel: string;
    icon: LucideIcon;
    // Which copy this is: the button shows a check while copiedField names it.
    field: string;
    copiedField: string | null;
    onCopy: (text: string, field: string, e?: React.MouseEvent) => void;
    // A command: in the commands' face and in colour, as compact as the text around it.
    small?: boolean;
}

/** A read-only field with a button on its side that copies it: a drop's link, a curl command. */
export default function CopyField(
    {value, copy = value, label, copyLabel, icon: Icon, field, copiedField, onCopy, small}: CopyFieldProps
) {
    const copied = copiedField === field;
    const size = small ? 13 : 14;
    return (
        <div
            className={`expedite_copy-field${small ? " expedite_copy-field--small" : ""}`}
            role={small ? "group" : undefined}
            aria-label={small ? label : undefined}
        >
            {small ? (
                // A line of text rather than an input, which can't colour its parts. One click selects it all, as the
                // input's focus did.
                <code className="expedite_copy-field-input text-small">{colourCommand(value)}</code>
            ) : (
                <input
                    className="expedite_copy-field-input text-small"
                    aria-label={label}
                    type="text"
                    value={value}
                    readOnly
                    spellCheck={false}
                    onFocus={(e) => e.target.select()}
                />
            )}
            <button
                className="expedite_copy-field-btn"
                aria-label={copied ? "Copied" : copyLabel}
                onClick={(e) => onCopy(copy, field, e)}
            >
                {copied ? <Check size={size} /> : <Icon size={size} />}
            </button>
        </div>
    );
}
