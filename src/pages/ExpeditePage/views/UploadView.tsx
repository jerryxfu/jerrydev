import React, {useEffect, useMemo, useRef} from "react";
import {File, FileText, Upload, X} from "lucide-react";
import {type DropSettings, type DropType, TTL_PRESETS} from "../types.ts";
import {formatBytes, formatDuration} from "../utils.ts";
import "./UploadView.scss";

interface UploadViewProps {
    dropType: DropType;
    setDropType: (type: DropType) => void;
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
}

export default function UploadView(
    {
        dropType, setDropType, textContent, setTextContent, selectedFile, setSelectedFile, settings, setSettings,
        maxViewsInput, onMaxViewsChange, error, loading, onUpload, onCancel,
    }: UploadViewProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isImage = !!selectedFile && selectedFile.type.startsWith("image/");
    const isPdf = !!selectedFile && selectedFile.type === "application/pdf";

    // Derive the preview URL during render — no setState needed
    const filePreview = useMemo(() => {
        if (!selectedFile || (!isImage && !isPdf)) return null;
        return URL.createObjectURL(selectedFile);
    }, [selectedFile, isImage, isPdf]);

    // Effect's only job: revoke the previous URL when it changes/unmounts
    useEffect(() => {
        if (!filePreview) return;
        return () => URL.revokeObjectURL(filePreview);
    }, [filePreview]);

    return (
        <div className="expedite_upload">
            <div className="expedite_type-toggle">
                <button
                    className={`small-text expedite_type-btn ${dropType === "text" ? "active" : ""}`}
                    onClick={() => setDropType("text")}
                >
                    <FileText size={14} /> Text
                </button>
                <button
                    className={`small-text expedite_type-btn ${dropType === "file" ? "active" : ""}`}
                    onClick={() => setDropType("file")}
                >
                    <File size={14} /> File
                </button>
            </div>

            {dropType === "text" ? (
                <textarea
                    className="expedite_textarea small-text"
                    placeholder="Paste or type your text here..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    rows={10}
                    autoFocus
                />
            ) : (
                <>
                    <div className="expedite_file-zone" onClick={() => fileInputRef.current?.click()}>
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
                                        setSelectedFile(null);
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <Upload size={28} strokeWidth={1} />
                                <p>Click to choose a file or drag & drop</p>
                                <p className="expedite_file-limit">Max 100 MB</p>
                            </>
                        )}
                    </div>

                    {filePreview && (isImage || isPdf) && (
                        <div className="expedite_file-preview">
                            {isImage ? (
                                <img src={filePreview} alt={selectedFile!.name} className="expedite_preview-img" />
                            ) : (
                                <iframe src={filePreview} title="preview" className="expedite_preview-frame" />
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Settings */}
            <div className="expedite_settings">
                <p className="expedite_settings-title caption-text">Settings</p>

                <div className="expedite_setting-row">
                    <label className="smaller-caption-text">Deletable by recipient</label>
                    <button
                        className={`expedite_toggle ${settings.deletable ? "active" : ""}`}
                        onClick={() => setSettings(s => ({...s, deletable: !s.deletable}))}
                    >
                        <span className="expedite_toggle-knob" />
                    </button>
                </div>

                <div className="expedite_setting-row">
                    <label className="smaller-caption-text">Max views</label>
                    <div className="expedite_setting-input-group">
                        <input
                            className="expedite_setting-input"
                            type="text"
                            inputMode="numeric"
                            min={1}
                            placeholder="unlimited"
                            value={maxViewsInput}
                            onChange={(e) => {
                                const cleaned = e.target.value.replace(/\D/g, "");
                                onMaxViewsChange(cleaned);
                            }}
                        />
                        <button
                            className={`expedite_setting-pill ${settings.maxViews === null ? "active" : ""}`}
                            onClick={() => {
                                onMaxViewsChange("");
                                setSettings(s => ({...s, maxViews: null}));
                            }}
                        >
                            ♾️
                        </button>
                    </div>
                </div>

                <div className="expedite_setting-row">
                    <label className="smaller-caption-text">Expires after</label>
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
                <button className="expedite_btn-secondary" onClick={onCancel}>Cancel</button>
                <button
                    className="expedite_btn-primary"
                    onClick={onUpload}
                    disabled={loading || (dropType === "text" ? !textContent.trim() : !selectedFile)}
                >
                    {loading ? "Uploading..." : `Create drop · ${formatDuration(settings.ttlMs)}`}
                </button>
            </div>
        </div>
    );
}