import React, {type ReactNode, useEffect, useMemo, useRef, useState} from "react";
import {File, Upload, X} from "lucide-react";
import {type DropSettings, type DropType, TTL_PRESETS} from "../types.ts";
import {formatBytes, formatDuration} from "../utils.ts";
import FilePreview from "./FilePreview.tsx";
import CodeEditor from "./CodeEditor.tsx";
import TextStats, {MoreTextStats, useTextStats} from "./TextStats.tsx";
import {AUTO, isLanguage, languageLabel, LANGUAGES, PLAIN, resolveLanguage} from "../highlight.ts";
import "./UploadView.scss";

interface UploadViewProps {
    dropType: DropType;
    textContent: string;
    /** The text is code, in this language (Shiki's id, or Auto); null for plain text. */
    language: string | null;
    setLanguage: (language: string | null) => void;
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

// The language the menu starts on when Code is ticked: the last one picked in this browser, else Auto.
const LANGUAGE_KEY = "expedite:language";

function startingLanguage(): string {
    try {
        const remembered = localStorage.getItem(LANGUAGE_KEY);
        if (remembered && (remembered === AUTO || isLanguage(remembered))) return remembered;
    } catch { /* storage off: no memory */
    }
    return AUTO;
}

function rememberLanguage(id: string) {
    try {
        localStorage.setItem(LANGUAGE_KEY, id);
    } catch { /* storage off: not remembered */
    }
}

// How many times a drop can be opened: the usual choices; any other number goes in the field beside them.
const VIEW_PRESETS: (number | null)[] = [1, 5, null];

export default function UploadView(
    {
        dropType, textContent, language, setLanguage, setTextContent, selectedFile, setSelectedFile, settings, setSettings,
        maxViewsInput, onMaxViewsChange, error, loading, onUpload, onCancel, progress,
    }: UploadViewProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const createButton = useRef<HTMLButtonElement>(null);

    const onTextChange = (value: string) => {
        setTextContent(value);
        setCreateReady(false);
    };
    // ⌘/Ctrl+Enter takes you to the Create button, ringed, without sending: Enter then sends it. A text box has no such
    // shortcut of its own.
    const onTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && textContent.trim() && !loading) {
            e.preventDefault();
            setCreateReady(true);
            createButton.current?.focus();
        }
    };
    // Reached by ⌘/Ctrl+Enter: ringed until it loses focus, whatever the browser thinks of where the focus came from.
    const [createReady, setCreateReady] = useState(false);

    // Derive the preview URL during render — no setState needed. FilePreview decides whether the file can be shown.
    const filePreview = useMemo(() => selectedFile ? URL.createObjectURL(selectedFile) : null, [selectedFile]);

    // Effect's only job: revoke the previous URL when it changes/unmounts
    useEffect(() => {
        if (!filePreview) return;
        return () => URL.revokeObjectURL(filePreview);
    }, [filePreview]);

    const stats = useTextStats(textContent, language !== null);
    // What Auto sees in the code: guessed once per change, for the menu's label and for the colours.
    const isCode = language !== null;
    const autoLanguage = useMemo(() => isCode ? resolveLanguage(AUTO, textContent) : null, [isCode, textContent]);

    // The pieces, put together below in the layout of a text drop or of a file drop.
    // Code: highlighted as you write, and on the receiver's page, in the language picked here.
    const textTools = (
        <div className="expedite_text-tools">
            <label className="expedite_check">
                <input
                    type="checkbox"
                    checked={language !== null}
                    onChange={(e) => setLanguage(e.target.checked ? startingLanguage() : null)}
                />
                Code (enable syntax highlighting)
            </label>
            {language !== null && (
                <select
                    className="expedite_select"
                    aria-label="Language"
                    value={language}
                    onChange={(e) => {
                        setLanguage(e.target.value);
                        rememberLanguage(e.target.value);
                    }}
                >
                    {/* Auto follows the text as it's written, and says what it sees. */}
                    <option value={AUTO}>Auto ({languageLabel(autoLanguage ?? PLAIN)})</option>
                    {Object.entries(LANGUAGES).map(([id, {label}]) => <option key={id} value={id}>{label}</option>)}
                </select>
            )}
        </div>
    );

    const textBox = language !== null ? (
        <CodeEditor
            language={language === AUTO ? autoLanguage ?? PLAIN : language}
            value={textContent}
            placeholder="Paste or type your code here..."
            onChange={onTextChange}
            onKeyDown={onTextKeyDown}
        />
    ) : (
        <textarea
            className="expedite_textarea"
            placeholder="Paste or type your text here..."
            value={textContent}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={onTextKeyDown}
            rows={1} // its height is set by its text, between its CSS limits (field-sizing)
            autoFocus
        />
    );

    const settingsPanel = (
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
    );

    const actions = (
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
    );

    // A text drop is written like a message: the text box first, as wide as the page; under it the statistics, beside the
    // settings and the buttons (these first on a phone, so sending isn't pushed down); then the further statistics, folded.
    if (dropType === "text") {
        return (
            <div className="expedite_upload expedite_compose">
                {textTools}
                {textBox}
                <div className="expedite_compose-row">
                    <div className="expedite_compose-controls">
                        {settingsPanel}
                        {error && <p className="expedite_error">{error}</p>}
                        {actions}
                    </div>
                    <TextStats stats={stats} code={language !== null} />
                </div>
                {/* Nothing more is counted past the size limit. */}
                {stats.more.length > 0 && <MoreTextStats stats={stats} code={language !== null} />}
            </div>
        );
    }

    return (
        <div className="expedite_upload expedite_split">
            <div className="expedite_main expedite_main--fill">
                <div className="expedite_file-zone expedite_grow" onClick={() => {
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
            </div>

            <div className="expedite_side">
                {settingsPanel}

                {error && <p className="expedite_error">{error}</p>}

                {actions}
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
