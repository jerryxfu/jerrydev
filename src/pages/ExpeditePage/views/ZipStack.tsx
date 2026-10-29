import {useEffect, useMemo, useRef, useState} from "react";
import {Download} from "lucide-react";
import {P2P_MEMORY_MAX} from "../types.ts";
import {formatBytes, saveBlob} from "../utils.ts";
import {entryData, readZip, type ZipEntry, type ZipSource} from "../zip.ts";
import FileStack, {type StackRow} from "./FileStack.tsx";
import {LocalFilePreview, typeOf} from "./FilePreview.tsx";

// From a drop's link, a file is fetched into the page to be shown or saved on its own, up to these sizes: a bigger one
// comes with the zip (a link can't point at part of a file). From a copy here (Direct P2P), any size: it's a slice.
const OPEN_MAX = 100 * 1024 * 1024;
const SAVE_MAX = P2P_MEMORY_MAX;

interface ZipStackProps {
    source: ZipSource;
    /** The zip is behind a link: each file is fetched, up to OPEN_MAX to show and SAVE_MAX to save. */
    remote?: boolean;
    /** How many files it holds, once read. */
    onRead?: (count: number) => void;
}

const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1);

/** A file out of the zip, under its name and with the type its preview needs. */
const asFile = (blob: Blob, path: string) => new File([blob], baseName(path), {type: typeOf(path)});

// Where the opened file is: being fetched, shown, or not to be shown here.
type Opened =
    | { key: string; state: "loading"; progress: number }
    | { key: string; state: "shown"; file: File }
    | { key: string; state: "too-big" | "failed" };

/**
 * The files in a received zip, each one shown or saved on its own: read from its central directory (a few KB), then
 * each file from its own bytes, which a stored zip keeps whole and in one place. Nothing when it isn't a zip the page
 * can read: it stays one file, downloaded whole.
 */
export default function ZipStack({source, remote = false, onRead}: ZipStackProps) {
    const [entries, setEntries] = useState<ZipEntry[] | null>(null);
    const [opened, setOpened] = useState<Opened | null>(null);
    const loading = useRef<AbortController | null>(null);
    // Files being saved: how far each one's fetch has got, 0 to 1.
    const [saving, setSaving] = useState<Record<string, number>>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        void readZip(source).then((read) => {
            if (cancelled) return;
            setEntries(read);
            if (read?.length) onRead?.(read.length);
        });
        return () => {
            cancelled = true;
            loading.current?.abort();
        };
    }, [source, onRead]);

    const rows = useMemo<StackRow[]>(() => (entries ?? []).map((entry, i) => ({
        key: String(i),
        path: entry.path,
        size: entry.size,
        bytes: entry.readable ? () => entryData(source, entry) : undefined,
    })), [entries, source]);

    if (!entries?.length) return null;
    const entryOf = (key: string) => entries[Number(key)]!;

    // One file open at a time: opening another stops the last one's fetch.
    const open = (key: string | null) => {
        loading.current?.abort();
        loading.current = null;
        if (key == null) {
            setOpened(null);
            return;
        }
        const entry = entryOf(key);
        if (remote && entry.size > OPEN_MAX) {
            setOpened({key, state: "too-big"});
            return;
        }
        const controller = new AbortController();
        loading.current = controller;
        setOpened({key, state: "loading", progress: 0});
        entryData(source, entry, (progress) => {
            if (!controller.signal.aborted) setOpened({key, state: "loading", progress});
        }, controller.signal)
            .then((blob) => {
                if (!controller.signal.aborted) setOpened({key, state: "shown", file: asFile(blob, entry.path)});
            })
            .catch(() => {
                if (!controller.signal.aborted) setOpened({key, state: "failed"});
            });
    };

    const save = async (key: string) => {
        const entry = entryOf(key);
        setError(null);
        // Open already: no need to fetch it again.
        if (opened?.key === key && opened.state === "shown") {
            saveBlob(opened.file, opened.file.name);
            return;
        }
        setSaving((s) => ({...s, [key]: 0}));
        try {
            const blob = await entryData(source, entry, (progress) => setSaving((s) => ({...s, [key]: progress})));
            saveBlob(asFile(blob, entry.path), baseName(entry.path));
        } catch {
            setError(`${baseName(entry.path)} couldn't be downloaded. Try again, or download the zip.`);
        } finally {
            setSaving((s) => {
                const rest = {...s};
                delete rest[key];
                return rest;
            });
        }
    };

    const name = opened ? baseName(entryOf(opened.key).path) : "";

    return (
        <div className="expedite_zip">
            <p className="expedite_zip-title">
                {entries.length === 1 ? "1 file" : `${entries.length.toLocaleString()} files`} in this zip
            </p>
            <FileStack
                rows={rows}
                open={opened?.key ?? null}
                onOpen={open}
                action={(row) => {
                    const entry = entryOf(row.key);
                    const tooBig = remote && entry.size > SAVE_MAX;
                    const progress = saving[row.key];
                    return (
                        <button
                            type="button"
                            className="expedite_stack-action"
                            aria-label={`Download ${entry.path}`}
                            title={!entry.readable
                                ? "Only in the zip: this one can't be taken out here"
                                : tooBig ? `Over ${formatBytes(SAVE_MAX)}: download the zip for this one` : "Download"}
                            disabled={!entry.readable || tooBig || progress != null}
                            onClick={() => void save(row.key)}
                        >
                            {progress != null ? `${Math.floor(progress * 100)}%` : <Download size={14} />}
                        </button>
                    );
                }}
            />
            {error && <p className="expedite_error">{error}</p>}
            {opened?.state === "loading" && (
                <p className="expedite_status-line">Opening {name}... {Math.floor(opened.progress * 100)}%</p>
            )}
            {opened?.state === "too-big" && (
                <p className="expedite_status-line">{name} is too big to preview here. Download the file or the zip to view.</p>
            )}
            {opened?.state === "failed" && <p className="expedite_error">{name} couldn't be opened. Try again.</p>}
            {opened?.state === "shown" && <LocalFilePreview key={opened.key} file={opened.file} name={opened.file.name} />}
        </div>
    );
}
