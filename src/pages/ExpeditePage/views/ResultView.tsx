import React, {type ReactNode, useMemo, useRef, useState} from "react";
import {Check, CircleCheck, CircleX, Clipboard, Download, File, FileText, Fingerprint, Link, SlidersHorizontal, Trash2} from "lucide-react";
import {type DownloadCheck, type DropMeta} from "../types.ts";
import {formatBytes, getDropUrl, timeUntil, when} from "../utils.ts";
import FilePreview, {CodeView, describeType, linesOf, type PreviewInfo} from "./FilePreview.tsx";
import {isLanguage, languageLabel} from "../highlight.ts";
import {characterCount, wordStats} from "./TextStats.tsx";
import "./ResultView.scss";
interface ResultViewProps {
    result: DropMeta;
    copiedField: string | null;
    onCopy: (text: string, field: string, e?: React.MouseEvent) => void;
    error: string | null;
    /** The last copy checked against the drop's SHA-256. */
    downloadCheck: DownloadCheck | null;
    onDownload: () => void;
    /** Checks a copy picked on this device against the SHA-256. */
    onCheckCopy: (file: File) => void;
    onDelete: () => void;
}

// "1,234,567 bytes (1.2 MB)": the exact count, then the short form when it says something more.
function exactSize(bytes: number): string {
    const exact = `${bytes.toLocaleString()} byte${bytes === 1 ? "" : "s"}`;
    return bytes < 1024 ? exact : `${exact} (${formatBytes(bytes)})`;
}

function duration(secs: number): string {
    const s = Math.round(secs);
    const hms = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60];
    return (hms[0] ? hms : hms.slice(1)).map((n, i) => (i ? String(n).padStart(2, "0") : String(n))).join(":");
}

// `wide`: across the section, for a long value (the SHA-256).
function Detail({label, wide, children}: { label: string; wide?: boolean; children: ReactNode }) {
    return (
        <div className={`expedite_meta-item${wide ? " is-wide" : ""}`}>
            <span className="expedite_meta-label">{label}</span>
            <span className="expedite_meta-value">{children}</span>
        </div>
    );
}

// Under the hash: how to check a copy against it, then how far the check has got, and what it found.
function DownloadCheckLine({check}: { check: DownloadCheck | null }) {
    if (!check) {
        return (
            <span className="expedite_meta-check">
                To make sure your copy is exactly the file that was sent, use the hash check below.
            </span>
        );
    }
    if (check.state === "checking") {
        return <span className="expedite_meta-check">Checking your copy... {Math.floor(check.progress * 100)}%</span>;
    }
    return check.state === "match"
        ? <span className="expedite_meta-check is-match"><CircleCheck size={13} /> Your copy matches it.</span>
        : <span className="expedite_meta-check is-mismatch"><CircleX size={13} /> Your copy doesn't match. Download it again.</span>;
}

/**
 * A received drop: what it is ("File details") and the technical side of it ("Advanced"), side by side in one table,
 * what to do with it under them, then the file itself, as wide as the page allows. Some details come from the preview as it loads:
 * lines, dimensions, duration.
 */
export default function ResultView(
    {result, copiedField, onCopy, error, downloadCheck, onDownload, onCheckCopy, onDelete}: ResultViewProps,
) {
    const [info, setInfo] = useState<PreviewInfo>({});
    // The hash check's file picker, and where the check is.
    const picker = useRef<HTMLInputElement>(null);
    const check = downloadCheck?.state;
    // Deleting removes the drop for everyone, so the trash button asks first, in place.
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    // Opening it used the last view the sender allowed: the code is gone for anyone else.
    const lastView = result.maxViews != null && result.views >= result.maxViews;
    const isText = result.type === "text";
    // A text drop as its lines show: a pasted file's last newline and Windows line endings don't add an empty line.
    const shownText = useMemo(() => (result.text ? linesOf(result.text) : ""), [result.text]);
    const lines = isText && result.text ? shownText.split("\n").length : info.lines;
    // What "Content" copies: a text drop's text, or a text or code file read whole by its preview.
    const content = isText ? result.text : info.text;
    // A text drop (not code): how long it is to read.
    const words = useMemo(() => isText && result.text && !result.language ? wordStats(result.text) : null, [isText, result.text, result.language]);

    return (
        <div className="expedite_retrieved">
            {/* One table, two sections: what the file is, and its technical side. */}
            <div className="expedite_meta">
                <section className="expedite_meta-section">
                    <h2 className="expedite_meta-header">
                        {isText ? <FileText size={14} /> : <File size={14} />}
                        {isText ? "Text details" : "File details"}
                    </h2>
                    <div className="expedite_meta-grid">
                        {result.fileName && <Detail label="Name">{result.fileName}</Detail>}
                        {result.fileName && <Detail label="Type">{describeType(result.fileName, result.mimeType)}</Detail>}
                        <Detail label="Size">{exactSize(result.size)}</Detail>
                        {lines != null && (
                            <Detail label="Lines">{lines.toLocaleString()}{info.partial ? "+ (counted in the part shown)" : ""}</Detail>
                        )}
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
                        <Detail label="Created">{new Date(result.createdAt).toLocaleString()}</Detail>
                        <Detail label="Expires in">{timeUntil(result.expiresAt)}</Detail>
                        <Detail label="Views">{result.views}{result.maxViews ? ` of ${result.maxViews}` : " (no limit)"}</Detail>
                    </div>
                </section>

                <section className="expedite_meta-section">
                    <h2 className="expedite_meta-header">
                        <SlidersHorizontal size={14} />
                        Advanced
                    </h2>
                    <div className="expedite_meta-grid">
                        <Detail label="Drop code"><span className="expedite_meta-code">{result.code}</span></Detail>
                        {result.mimeType && <Detail label="MIME type, as uploaded">{result.mimeType}</Detail>}
                        {result.language && <Detail label="Language">{languageLabel(result.language)}</Detail>}
                        {result.encoding && <Detail label="Encoding">{result.encoding}</Detail>}
                        {info.lineEndings && <Detail label="Line endings">{info.lineEndings === "CRLF" ? "CRLF (Windows)" : "LF (Unix)"}</Detail>}
                        <Detail label="Deletable by you">{result.deletable ? "Yes" : "No, the sender turned it off"}</Detail>
                        {result.sha256 && (
                            <Detail label="SHA-256, at upload" wide>
                                <span className="expedite_meta-hash">
                                    {result.sha256}
                                    <button
                                        type="button"
                                        className="expedite_meta-copy"
                                        title="Copy the SHA-256"
                                        aria-label="Copy the SHA-256"
                                        onClick={(e) => onCopy(result.sha256!, "sha256", e)}
                                    >
                                        {copiedField === "sha256" ? <Check size={13} /> : <Clipboard size={13} />}
                                    </button>
                                </span>
                                <DownloadCheckLine check={downloadCheck} />
                            </Detail>
                        )}
                    </div>
                </section>
            </div>

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
                <div className="expedite_btn-row expedite_confirm">
                    <p>Delete this drop for everyone? Its code and link stop working.</p>
                    <button className="expedite_btn-secondary" onClick={() => setConfirmingDelete(false)} autoFocus>Keep it</button>
                    <button className="expedite_btn-secondary expedite_btn-secondary--danger" onClick={onDelete}>
                        <Trash2 size={14} />
                        Delete
                    </button>
                </div>
            ) : (
                <div className="expedite_btn-row">
                    <button
                        className={`expedite_btn-icon ${result.deletable ? "expedite_btn-icon--danger" : "expedite_btn-icon--disabled"}`}
                        onClick={() => setConfirmingDelete(true)}
                        disabled={!result.deletable}
                        title={result.deletable ? "Delete drop" : "Deletion disabled by sender"}
                    >
                        <Trash2 size={16} />
                    </button>
                    <button
                        className="expedite_btn-secondary"
                        onClick={(e) => onCopy(getDropUrl(result.code), "link", e)}
                    >
                        {copiedField === "link" ? <Check size={14} /> : <Link size={14} />}
                        {copiedField === "link" ? "Copied" : "Link"}
                    </button>
                    {content && (
                        <button
                            className="expedite_btn-secondary"
                            onClick={(e) => onCopy(content, "content", e)}
                        >
                            {copiedField === "content" ? <Check size={14} /> : <Clipboard size={14} />}
                            {copiedField === "content" ? "Copied" : "Content"}
                        </button>
                    )}
                    {/* The downloaded copy, picked from the device, checked against the hash (the line under it says how
                        it went): the page never sees the download, which the browser's own downloader saves. */}
                    {result.sha256 && (
                        <>
                            <button
                                className={`expedite_btn-secondary${check === "match" ? " is-match" : check === "mismatch" ? " is-mismatch" : ""}`}
                                onClick={() => picker.current?.click()}
                                disabled={check === "checking"}
                            >
                                {check === "match" ? <CircleCheck size={14} /> : check === "mismatch" ? <CircleX size={14} /> : <Fingerprint size={14} />}
                                Hash check
                            </button>
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
                    <button className="expedite_btn-primary" onClick={onDownload}>
                        <Download size={14} />
                        Download
                    </button>
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