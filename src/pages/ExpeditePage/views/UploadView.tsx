import React, {type ReactNode, useEffect, useId, useMemo, useRef, useState} from "react";
import {Info} from "lucide-react";
import {type DropSettings, type DropType, TTL_PRESETS} from "../types.ts";
import {formatDuration} from "../utils.ts";
import FilePreview from "./FilePreview.tsx";
import FileZone from "./FileZone.tsx";
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

// Past this many characters the plain text box is at its tallest on any screen, wrapped or not: it stops measuring its
// text to size itself (field-sizing), which a long text would pay on every key.
const FULL_CHARACTERS = 20_000;

// How many times a drop can be opened: the usual choices; any other number goes in the field beside them.
const VIEW_PRESETS: (number | null)[] = [1, 5, null];

export default function UploadView(
    {
        dropType, textContent, language, setLanguage, setTextContent, selectedFile, setSelectedFile, settings, setSettings,
        maxViewsInput, onMaxViewsChange, error, loading, onUpload, onCancel, progress,
    }: UploadViewProps) {
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
    // Ids for the names of the settings' controls and the code box's hint; and whether the (i) beside the settings'
    // title shows what each does in a few words (a click or a tap, so it works on a phone too).
    const ids = {deletable: useId(), views: useId(), expiry: useId(), about: useId(), codeKeys: useId()};
    const [about, setAbout] = useState(false);

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
            {language !== null && (
                <span className="expedite_text-hint" id={ids.codeKeys}>Tab indents. To escape focus, press Esc.</span>
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
            describedBy={ids.codeKeys}
        />
    ) : (
        <textarea
            className={`expedite_textarea${textContent.length > FULL_CHARACTERS ? " is-full" : ""}`}
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
            <p className="expedite_settings-title caption-text">
                Settings
                <button
                    type="button"
                    className="expedite_info"
                    aria-label="What these settings do"
                    aria-expanded={about}
                    aria-controls={ids.about}
                    onClick={() => setAbout((open) => !open)}
                >
                    <Info size={14} strokeWidth={2} />
                </button>
            </p>
            <dl className="expedite_settings-about" id={ids.about} hidden={!about}>
                <div>
                    <dt>Deletable by recipient</dt>
                    <dd>Lets the person who opens it delete it for everyone.</dd>
                </div>
                <div>
                    <dt>Views allowed</dt>
                    <dd>How many times the code or link can be opened. After that, it stops working.</dd>
                </div>
                <div>
                    <dt>Expires after</dt>
                    <dd>When the drop is deleted, opened or not.</dd>
                </div>
            </dl>

            <div className="expedite_setting-row">
                <label className="text-small" htmlFor={ids.deletable}>Deletable by recipient</label>
                <button
                    id={ids.deletable}
                    className={`expedite_toggle ${settings.deletable ? "active" : ""}`}
                    role="switch"
                    aria-checked={settings.deletable}
                    onClick={() => setSettings(s => ({...s, deletable: !s.deletable}))}
                >
                    <span className="expedite_toggle-knob" />
                </button>
            </div>

            <div className="expedite_setting-row">
                <span className="text-small" id={ids.views}>Views allowed</span>
                {/* Presets like the expiry's, and a field for any other number (a pill lights only when the
                    field is empty). */}
                <div className="expedite_setting-input-group" role="group" aria-labelledby={ids.views}>
                    {VIEW_PRESETS.map((n) => (
                        <button
                            key={n ?? "none"}
                            className={`expedite_setting-pill ${!maxViewsInput && settings.maxViews === n ? "active" : ""}`}
                            aria-pressed={!maxViewsInput && settings.maxViews === n}
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
                <span className="text-small" id={ids.expiry}>Expires after</span>
                <div className="expedite_ttl-presets" role="group" aria-labelledby={ids.expiry}>
                    {TTL_PRESETS.map((p) => (
                        <button
                            key={p.value}
                            className={`expedite_setting-pill ${settings.ttlMs === p.value ? "active" : ""}`}
                            aria-pressed={settings.ttlMs === p.value}
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
                <FileZone file={selectedFile} onFile={setSelectedFile} limit="Max 16 GB" disabled={loading} />
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
