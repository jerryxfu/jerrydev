import React, {type ReactNode, useEffect, useMemo, useRef, useState} from "react";
import {File, Upload, X} from "lucide-react";
import {type DropSettings, type DropType, TTL_PRESETS} from "../types.ts";
import {formatBytes, formatDuration} from "../utils.ts";
import FilePreview from "./FilePreview.tsx";
import "./UploadView.scss";

interface UploadViewProps {
    dropType: DropType;
    textContent: string;
    setTextContent: (text: string) => void;
    selectedFile: globalThis.File | null;
    setSelectedFile: (file: globalThis.File | null) => void;
    settings: DropSettings;
    setSettings: React.Dispatch<React.SetStateAction<DropSettings>>;
    maxViewsInput: string;
    onMaxViewsChange: (val: string) => void;
    error: string | null;
    loading: boolean;
    onUpload: () => void;
    onCancel: () => void;
    /** The upload's progress, under the form. */
    progress?: ReactNode;
}

// How many times a drop can be opened: the usual choices; any other number goes in the field beside them.
const VIEW_PRESETS: (number | null)[] = [1, 5, null];

export default function UploadView(
    {
        dropType, textContent, setTextContent, selectedFile, setSelectedFile, settings, setSettings,
        maxViewsInput, onMaxViewsChange, error, loading, onUpload, onCancel, progress,
    }: UploadViewProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const createButton = useRef<HTMLButtonElement>(null);
    // Reached by ⌘/Ctrl+Enter: ringed until it loses focus, whatever the browser thinks of where the focus came from.
    const [createReady, setCreateReady] = useState(false);

    // Derive the preview URL during render — no setState needed. FilePreview decides whether the file can be shown.
    const filePreview = useMemo(() => selectedFile ? URL.createObjectURL(selectedFile) : null, [selectedFile]);

    // Effect's only job: revoke the previous URL when it changes/unmounts
    useEffect(() => {
        if (!filePreview) return;
        return () => URL.revokeObjectURL(filePreview);
    }, [filePreview]);

    return (
        <div className="expedite_upload expedite_split">
            <div className="expedite_main expedite_main--fill">
                {dropType === "text" ? (
                    <textarea
                        className="expedite_textarea"
                        placeholder="Paste or type your text here..."
                        value={textContent}
                        onChange={(e) => {
                            setTextContent(e.target.value);
                            setCreateReady(false);
                        }}
                        onKeyDown={(e) => {
                            // ⌘/Ctrl+Enter takes you to the Create button, ringed, without sending: Enter then sends it.
                            // A text box has no such shortcut of its own.
                            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && textContent.trim() && !loading) {
                                e.preventDefault();
                                setCreateReady(true);
                                createButton.current?.focus();
                            }
                        }}
                        rows={10}
                        autoFocus
                    />
                ) : (
                    <div className="expedite_file-zone" onClick={() => {
                        if (!loading) fileInputRef.current?.click();
                    }}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            hidden
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) setSelectedFile(f);
                            }}
                        />
                        {selectedFile ? (
                            <div className="expedite_file-selected">
                                <File size={22} />
                                <div>
                                    <p className="expedite_file-name">{selectedFile.name}</p>
                                    <p className="expedite_file-size">{formatBytes(selectedFile.size)}</p>
                                </div>
                                <button
                                    className="expedite_file-clear"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!loading) setSelectedFile(null);
                                    }}
                                    disabled={loading}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <Upload size={28} strokeWidth={1} />
                                <p>Click to choose a file or drag &amp; drop</p>
                                <p className="expedite_file-limit">Max 16 GB</p>
                                <p className="expedite_file-tip">Several files? Zip them into one first.</p>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="expedite_side">
                {/* Settings */}
                <div className={`expedite_settings ${loading ? "is-disabled" : ""}`}>
                    <p className="expedite_settings-title caption-text">Settings</p>

                    <div className="expedite_setting-row">
                        <label className="text-small">Deletable by recipient</label>
                        <button
                            className={`expedite_toggle ${settings.deletable ? "active" : ""}`}
                            onClick={() => setSettings(s => ({...s, deletable: !s.deletable}))}
                        >
                            <span className="expedite_toggle-knob" />
                        </button>
                    </div>

                    <div className="expedite_setting-row">
                        <label className="text-small">Views allowed</label>
                        {/* Presets like the expiry's, and a field for any other number (a pill lights only when the
                            field is empty). */}
                        <div className="expedite_setting-input-group">
                            {VIEW_PRESETS.map((n) => (
                                <button
                                    key={n ?? "none"}
                                    className={`expedite_setting-pill ${!maxViewsInput && settings.maxViews === n ? "active" : ""}`}
                                    onClick={() => {
                                        onMaxViewsChange("");
                                        setSettings(s => ({...s, maxViews: n}));
                                    }}
                                >
                                    {n ?? "No limit"}
                                </button>
                            ))}
                            <input
                                className="expedite_setting-input"
                                type="text"
                                inputMode="numeric"
                                placeholder="other"
                                aria-label="Another number of views"
                                value={maxViewsInput}
                                onChange={(e) => {
                                    const cleaned = e.target.value.replace(/\D/g, "");
                                    onMaxViewsChange(cleaned);
                                }}
                            />
                        </div>
                    </div>

                    <div className="expedite_setting-row">
                        <label className="text-small">Expires after</label>
                        <div className="expedite_ttl-presets">
                            {TTL_PRESETS.map((p) => (
                                <button
                                    key={p.value}
                                    className={`expedite_setting-pill ${settings.ttlMs === p.value ? "active" : ""}`}
                                    onClick={() => setSettings(s => ({...s, ttlMs: p.value}))}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {error && <p className="expedite_error">{error}</p>}

                <div className="expedite_btn-row">
                    <button
                        className={`expedite_btn-secondary ${loading ? "expedite_btn-secondary--danger" : ""}`}
                        onClick={onCancel}
                    >
                        {loading ? "Cancel upload" : "Cancel"}
                    </button>
                    <button
                        ref={createButton}
                        className={`expedite_btn-primary${createReady ? " is-ready" : ""}`}
                        onBlur={() => setCreateReady(false)}
                        onClick={onUpload}
                        disabled={loading || (dropType === "text" ? !textContent.trim() : !selectedFile)}
                    >
                        {loading ? "Uploading..." : `Create drop · ${formatDuration(settings.ttlMs)}`}
                    </button>
                </div>
            </div>

            {/* Under the form, as wide as the view: the upload's progress, and the file itself. */}
            <div className="expedite_wide">{progress}</div>
            <div className="expedite_wide">
                {filePreview && selectedFile && (
                    <FilePreview
                        key={filePreview}
                        src={filePreview}
                        name={selectedFile.name}
                        mimeType={selectedFile.type}
                        size={selectedFile.size}
                        file={selectedFile}
                    />
                )}
            </div>
        </div>
    );
}
