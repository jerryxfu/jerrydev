import {useMemo, useRef} from "react";
import {FolderPlus, Plus, Upload, X} from "lucide-react";
import Button from "@/components/Button/Button.tsx";
import useMediaQuery from "../../../hooks/useMediaQuery.ts";
import {formatBytes} from "../utils.ts";
import {addFiles, fromInput, type PickedFile, stackSize} from "../files.ts";
import {useFileDrag} from "../useFileDrag.ts";
import FileStack, {type StackRow} from "./FileStack.tsx";

interface FileZoneProps {
    files: PickedFile[];
    /** The files once some are added or removed. */
    onFiles: (files: PickedFile[]) => void;
    /** The file whose preview shows under the form (by its path). */
    open: string | null;
    onOpen: (path: string | null) => void;
    // What it says under "Click to choose files", the size it takes.
    limit: string;
    disabled?: boolean;
}

// The files to send, on the File and Direct P2P screens. Empty, a zone: a click or a drop chooses them, and from the
// keyboard its input (Tab to it, then Enter or Space). With files, their stack, with buttons to add more, and it still
// takes drops. A folder dropped or picked brings its files, with their paths. Styles in UploadView.scss and FileStack.scss.
export default function FileZone({files, onFiles, open, onOpen, limit, disabled = false}: FileZoneProps) {
    const filesInput = useRef<HTMLInputElement>(null);
    const folderInput = useRef<HTMLInputElement>(null);
    const add = (added: PickedFile[]) => {
        if (added.length) onFiles(addFiles(files, added));
    };
    const drag = useFileDrag(disabled ? undefined : add);
    // A folder is picked on a computer: a phone's picker has none.
    const folders = useMediaQuery("(hover: hover)");
    const rows = useMemo<StackRow[]>(
        () => files.map((f) => ({key: f.path, path: f.path, size: f.file.size, bytes: () => Promise.resolve(f.file)})),
        [files],
    );
    const empty = files.length === 0;

    const inputs = (
        <>
            <input
                ref={filesInput}
                type="file"
                multiple
                className={empty ? "visually-hidden" : undefined}
                hidden={!empty} // with files, Add files is the way to it
                aria-label="Choose files"
                disabled={disabled}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                    add(fromInput(e.target.files));
                    // So the same file can be chosen again after it's removed.
                    e.target.value = "";
                }}
            />
            <input
                ref={(el) => {
                    folderInput.current = el;
                    el?.setAttribute("webkitdirectory", ""); // not in React's props
                }}
                type="file"
                hidden
                disabled={disabled}
                onChange={(e) => {
                    add(fromInput(e.target.files));
                    e.target.value = "";
                }}
            />
        </>
    );

    if (empty) {
        return (
            <div
                className={`expedite_file-zone expedite_grow${drag.over && !disabled ? " is-over" : ""}`}
                onClick={() => {
                    if (!disabled) filesInput.current?.click();
                }}
                {...drag.handlers}
            >
                {inputs}
                <Upload size={28} strokeWidth={1} />
                <p>Click to choose files or drag &amp; drop</p>
                {folders && (
                    <button
                        type="button"
                        className="expedite_file-folder"
                        onClick={(e) => {
                            e.stopPropagation();
                            folderInput.current?.click();
                        }}
                    >
                        Or pick a whole folder
                    </button>
                )}
                <p className="expedite_file-limit">{limit}</p>
            </div>
        );
    }

    return (
        <div
            className={`expedite_file-zone is-stack expedite_grow${drag.over && !disabled ? " is-over" : ""}`}
            {...drag.handlers}
        >
            {inputs}
            <FileStack
                rows={rows}
                open={open}
                onOpen={onOpen}
                action={(row) => (
                    <button
                        type="button"
                        className="expedite_stack-action"
                        aria-label={`Remove ${row.path}`}
                        title="Remove"
                        disabled={disabled}
                        onClick={() => onFiles(files.filter((f) => f.path !== row.key))}
                    >
                        <X size={14} />
                    </button>
                )}
            />
            <div className="expedite_stack-bar">
                <span className="expedite_stack-total">
                    {files.length === 1 ? "1 file" : `${files.length.toLocaleString()} files`} · {formatBytes(stackSize(files))}
                </span>
                <Button start={Plus} onClick={() => filesInput.current?.click()} disabled={disabled}>Add files</Button>
                {folders && (
                    <Button start={FolderPlus} onClick={() => folderInput.current?.click()} disabled={disabled}>Add a folder</Button>
                )}
            </div>
        </div>
    );
}
