import React, {type ReactNode, useMemo, useRef, useState} from "react";
import {flushSync} from "react-dom";
import {Check, CircleCheck, CircleX, Clipboard, Download, File, FileText, Fingerprint, Link, Terminal, Trash2} from "lucide-react";
import Button from "@/components/Button/Button.tsx";
import {type DownloadCheck, type DropMeta} from "../types.ts";
import {formatBytes, getCurlCommand, getDropUrl, timeSince, timeUntil, when} from "../utils.ts";
import FilePreview, {CodeView, describeType, linesOf, type PreviewInfo} from "./FilePreview.tsx";
import CopyField from "./CopyField.tsx";
import ZipStack from "./ZipStack.tsx";
import Disclosure from "./Disclosure.tsx";
import {isZip, urlSource} from "../zip.ts";
import {isLanguage, languageLabel} from "../highlight.ts";
import {characterCount, wordStats} from "./TextStats.tsx";
import useMediaQuery from "../../../hooks/useMediaQuery.ts";
import "./ResultView.scss";

interface ResultViewProps {
    result: DropMeta;
    copiedField: string | null;
    onCopy: (text: string, field: string, e?: React.MouseEvent) => void;
    error: string | null;
    /** The last copy checked against the drop's SHA-256. */
    downloadCheck: DownloadCheck | null;
    onDownload: () => Promise<void>;
    /** Checks a copy picked on this device against the SHA-256. */
    onCheckCopy: (file: File) => void;
    onDelete: () => Promise<void>;
}

// "1.2 MB (1,234,567 bytes)": the short form, then the exact count. Under 1 KB, the count alone.
function exactSize(bytes: number): string {
    const exact = `${bytes.toLocaleString()} byte${bytes === 1 ? "" : "s"}`;
    return bytes < 1024 ? exact : `${formatBytes(bytes)} (${exact})`;
}

function duration(secs: number): string {
    const s = Math.round(secs);
    const hms = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60];
    return (hms[0] ? hms : hms.slice(1)).map((n, i) => (i ? String(n).padStart(2, "0") : String(n))).join(":");
}

// "PDF document (application/pdf)": the type in words, then the MIME type as uploaded, unless the words are that type.
function typeOf(name: string, mimeType?: string): string {
    const words = describeType(name, mimeType);
    return mimeType && words !== mimeType ? `${words} (${mimeType})` : words;
}

// A value with a small button after it that copies it: the file's name, the SHA-256 (`className`: its monospace).
function Copyable({value, field, title, className, copiedField, onCopy}: {
    value: string;
    field: string;
    title: string;
    className?: string;
    copiedField: string | null;
    onCopy: ResultViewProps["onCopy"];
}) {
    return (
        <span className={`expedite_meta-copyable${className ? ` ${className}` : ""}`}>
            {value}
            <button type="button" className="expedite_meta-copy" title={title} aria-label={title} onClick={(e) => onCopy(value, field, e)}>
                {copiedField === field ? <Check size={13} /> : <Clipboard size={13} />}
            </button>
        </span>
    );
}

// A line of the list: what it is, then its value.
function Detail({label, children}: { label: string; children: ReactNode }) {
    return (
        <>
            <dt>{label}</dt>
            <dd>{children}</dd>
        </>
    );
}

/**
 * A received drop: its details in one table, what to do with it under them, then the file itself, as wide as the page
 * allows. Some details come from the preview as it loads: lines, dimensions, duration.
 */
export default function ResultView(
    {result, copiedField, onCopy, error, downloadCheck, onDownload, onCheckCopy, onDelete}: ResultViewProps,
) {
    const [info, setInfo] = useState<PreviewInfo>({});
    // A zip: its files, read from the drop's link a few KB at a time; how many, once read.
    const zip = useMemo(
        () => result.type === "file" && result.fileUrl && isZip(result.fileName ?? "", result.mimeType)
            ? urlSource(result.fileUrl, result.size) : null,
        [result.type, result.fileUrl, result.fileName, result.mimeType, result.size],
    );
    const [fileCount, setFileCount] = useState<number | null>(null);
    // The hash check's file picker, and where the check is: its button says how far it has got, then what it found.
    const picker = useRef<HTMLInputElement>(null);
    const check = downloadCheck?.state;
    const checkLabel = downloadCheck?.state === "checking" ? `Checking ${Math.floor(downloadCheck.progress * 100)}%`
        : check === "match" ? "Matches" : check === "mismatch" ? "Doesn't match" : "Hash check";
    // Deleting removes the drop for everyone, so the trash button asks first, in place.
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    // Deleting and the download's first step (its link checked) wait on the network: their buttons spin meanwhile.
    const [deleting, setDeleting] = useState(false);
    const [downloading, setDownloading] = useState(false);
    // Keeping it (the button or Escape) puts the focus back on the trash button, where the question came from.
    const trash = useRef<HTMLButtonElement>(null);
    const keep = () => {
        flushSync(() => setConfirmingDelete(false));
        trash.current?.focus();
    };
    // Opening it used the last view the sender allowed: the code is gone for anyone else.
    const lastView = result.maxViews != null && result.views >= result.maxViews;
    const isText = result.type === "text";
    // The drop from a terminal, to pipe it into a command. Each run spends a view, so it shows only while the code works.
    const curl = lastView ? null : getCurlCommand(result.code, isText ? "text" : "file");
    // A text drop as its lines show: a pasted file's last newline and Windows line endings don't add an empty line.
    const shownText = useMemo(() => (result.text ? linesOf(result.text) : ""), [result.text]);
    const lines = isText && result.text ? shownText.split("\n").length : info.lines;
    // What "Content" copies: a text drop's text, or a text or code file read whole by its preview.
    const content = isText ? result.text : info.text;
    // A text drop (not code): how long it is to read.
    const words = useMemo(() => isText && result.text && !result.language ? wordStats(result.text) : null, [isText, result.text, result.language]);
    // The hash and the command: a column of their own on a laptop, folded on a phone, where few need them.
    const wide = useMediaQuery("(min-width: 900px)");
    const more = result.sha256 || curl ? (
        <dl>
            {result.sha256 && (
                <Detail label="SHA-256">
                    <Copyable
                        value={result.sha256} field="sha256" title="Copy the SHA-256" className="expedite_meta-hash"
                        copiedField={copiedField} onCopy={onCopy}
                    />
                </Detail>
            )}
            {curl && (
                <Detail label="In a terminal">
                    <CopyField
                        value={curl}
                        label="A command to get the drop from a terminal"
                        copyLabel="Copy the command"
                        icon={Terminal}
                        field="curl"
                        copiedField={copiedField}
                        onCopy={onCopy}
                        small
                    />
                    {result.maxViews != null && <span className="expedite_meta-check">Each run counts as a view.</span>}
                </Detail>
            )}
        </dl>
    ) : null;

    return (
        <div className="expedite_retrieved">
            <section className="expedite_meta">
                <h2 className="expedite_meta-header">
                    {isText ? <FileText size={14} /> : <File size={14} />}
                    {isText ? "Text details" : "File details"}
                </h2>
                {/* The details, then the hash and the command: side by side on a laptop, folded on a phone. */}
                <div className="expedite_details">
                    <dl>
                        {result.fileName && (
                            <Detail label="Name">
                                <Copyable
                                    value={result.fileName} field="name" title="Copy the name"
                                    copiedField={copiedField} onCopy={onCopy}
                                />
                            </Detail>
                        )}
                        {!isText && <Detail label="Type">{typeOf(result.fileName ?? "", result.mimeType)}</Detail>}
                        {result.language && <Detail label="Language">{languageLabel(result.language)}</Detail>}
                        <Detail label="Size">{exactSize(result.size)}</Detail>
                        {fileCount != null && <Detail label="Files">{fileCount.toLocaleString()}</Detail>}
                        {lines != null && (
                            <Detail label="Lines">{lines.toLocaleString()}{info.partial ? "+ (counted in the part shown)" : ""}</Detail>
                        )}
                        {info.lineEndings && <Detail label="Line endings">{info.lineEndings === "CRLF" ? "CRLF (Windows)" : "LF (Unix)"}</Detail>}
                        {words && (
                            <>
                                <Detail label="Words">{words.words.toLocaleString()}</Detail>
                                <Detail label="Reading time">{words.reading}</Detail>
                            </>
                        )}
                        {isText && result.text && <Detail label="Characters">{characterCount(result.text).toLocaleString()}</Detail>}
                        {info.width != null && info.height != null && (
                            <Detail label="Dimensions">{info.width.toLocaleString()} × {info.height.toLocaleString()} px</Detail>
                        )}
                        {info.duration != null && Number.isFinite(info.duration) && <Detail label="Duration">{duration(info.duration)}</Detail>}
                        <Detail label="Created">{Temporal.Instant.from(result.createdAt).toLocaleString()} ({timeSince(result.createdAt)})</Detail>
                        <Detail label="Expires in">{timeUntil(result.expiresAt)}</Detail>
                        <Detail label="Views">{result.views}{result.maxViews ? ` of ${result.maxViews}` : " (no limit)"}</Detail>
                    </dl>
                    {more && (wide ? more : <Disclosure title="More details">{more}</Disclosure>)}
                </div>
            </section>

            {lastView && (
                <p className="expedite_notice">
                    {isText
                        ? "That was the last view: this code no longer works. Copy or download the text before you leave this page."
                        : `That was the last view: this code no longer works, but you can still download the file here until it expires ${when(result.expiresAt)}.`}
                </p>
            )}

            {error && <p className="expedite_error">{error}</p>}

            {/* Actions */}
            {confirmingDelete ? (
                // Keyed, so the question's buttons are new ones (autoFocus works only on a new element) rather than
                // the row's own reused in place, the Link button turned into "Keep it".
                <div
                    key="confirm"
                    className="expedite_btn-row expedite_confirm"
                    role="group"
                    aria-label="Delete this drop?"
                    onKeyDown={(e) => {
                        if (e.key === "Escape") keep();
                    }}
                >
                    <p>Delete this drop for everyone? Its code and link stop working.</p>
                    <Button onClick={keep} autoFocus>Keep it</Button>
                    <Button
                        variant="danger" start={Trash2} busy={deleting}
                        onClick={() => {
                            setDeleting(true);
                            void onDelete().finally(() => setDeleting(false));
                        }}
                    >
                        Delete
                    </Button>
                </div>
            ) : (
                <div key="actions" className="expedite_btn-row">
                    <Button
                        ref={trash}
                        variant={result.deletable ? "danger" : "plain"}
                        start={Trash2}
                        onClick={() => setConfirmingDelete(true)}
                        disabled={!result.deletable}
                        title={result.deletable ? "Delete drop" : "Deletion disabled by sender"}
                    />
                    {/* The code, to pass on: a click copies it, as the Live room's does. */}
                    <Button
                        className="expedite_code-btn"
                        end={copiedField === "code" ? Check : Clipboard}
                        title="Copy the code"
                        onClick={(e) => onCopy(result.code, "code", e)}
                    >
                        {result.code}
                    </Button>
                    <Button
                        start={copiedField === "link" ? Check : Link}
                        onClick={(e) => onCopy(getDropUrl(result.code), "link", e)}
                    >
                        {copiedField === "link" ? "Copied" : "Link"}
                    </Button>
                    {content && (
                        <Button
                            start={copiedField === "content" ? Check : Clipboard}
                            onClick={(e) => onCopy(content, "content", e)}
                        >
                            {copiedField === "content" ? "Copied" : "Content"}
                        </Button>
                    )}
                    {/* The downloaded copy, picked from the device, checked against the hash: the page never sees the
                        download, which the browser's own downloader saves. A click while it checks picks another copy. */}
                    {result.sha256 && (
                        <>
                            <Button
                                className={check === "match" ? "is-match" : check === "mismatch" ? "is-mismatch" : undefined}
                                start={check === "match" ? CircleCheck : check === "mismatch" ? CircleX : Fingerprint}
                                busy={check === "checking"}
                                onClick={() => picker.current?.click()}
                            >
                                {checkLabel}
                            </Button>
                            <input
                                ref={picker}
                                type="file"
                                hidden
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) onCheckCopy(file);
                                    e.target.value = ""; // the same file can be picked again
                                }}
                            />
                        </>
                    )}
                    <Button
                        variant="main" start={Download} busy={downloading}
                        onClick={() => {
                            setDownloading(true);
                            void onDownload().finally(() => setDownloading(false));
                        }}
                    >
                        Download
                    </Button>
                </div>
            )}

            {/* The file itself, under what to do with it and as wide as the page. */}
            {result.type === "file" && result.fileUrl && (
                <FilePreview
                    key={result.fileUrl}
                    src={result.fileUrl}
                    name={result.fileName ?? ""}
                    mimeType={result.mimeType}
                    size={result.size}
                    onInfo={setInfo}
                />
            )}

            {/* A zip: the files in it, each one to show or download on its own. */}
            {zip && <ZipStack source={zip} remote onRead={setFileCount} />}

            {/* Sent as code: shown like a code file, numbered and highlighted. */}
            {isText && result.text && result.language && (
                <CodeView text={shownText} language={isLanguage(result.language) ? result.language : null} />
            )}

            {isText && result.text && !result.language && (
                <>
                    <p className="expedite_content-label">Content</p>
                    {/* A textarea rather than <pre> so the caret can be placed inside it and ranges selected */}
                    <textarea
                        className="expedite_text-preview"
                        value={result.text}
                        readOnly
                        spellCheck={false}
                        onFocus={(e) => e.target.select()}
                    />
                </>
            )}
        </div>
    );
}