import {useRef} from "react";
import {File, Upload, X} from "lucide-react";
import {formatBytes} from "../utils.ts";
import {useFileDrag} from "../useFileDrag.ts";

interface FileZoneProps {
    file: globalThis.File | null;
    onFile: (file: globalThis.File | null) => void;
    // What it says under "Click to choose a file", the size it takes.
    limit: string;
    disabled?: boolean;
}

// The file to send, on the File and Direct P2P screens: a click or a drop chooses it, and from the keyboard its input
// (Tab to it, then Enter or Space). Styles in UploadView.scss.
export default function FileZone({file, onFile, limit, disabled = false}: FileZoneProps) {
    const input = useRef<HTMLInputElement>(null);
    const drag = useFileDrag(disabled ? undefined : onFile);

    return (
        <div
            className={`expedite_file-zone expedite_grow${drag.over && !disabled ? " is-over" : ""}`}
            onClick={() => {
                if (!disabled) input.current?.click();
            }}
            {...drag.handlers}
        >
            <input
                ref={input}
                type="file"
                className="visually-hidden"
                aria-label={file ? `Choose another file instead of ${file.name}` : "Choose a file"}
                disabled={disabled}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                    const chosen = e.target.files?.[0];
                    if (chosen) onFile(chosen);
                    // So the same file can be chosen again after it's removed.
                    e.target.value = "";
                }}
            />
            {file ? (
                <div className="expedite_file-selected">
                    <File size={22} />
                    <div>
                        <p className="expedite_file-name">{file.name}</p>
                        <p className="expedite_file-size">{formatBytes(file.size)}</p>
                    </div>
                    <button
                        className="expedite_file-clear"
                        aria-label="Remove the file"
                        onClick={(e) => {
                            e.stopPropagation();
                            onFile(null);
                        }}
                        disabled={disabled}
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <>
                    <Upload size={28} strokeWidth={1} />
                    <p>Click to choose a file or drag &amp; drop</p>
                    <p className="expedite_file-limit">{limit}</p>
                    <p className="expedite_file-tip">Several files? Zip them into one first.</p>
                </>
            )}
        </div>
    );
}
