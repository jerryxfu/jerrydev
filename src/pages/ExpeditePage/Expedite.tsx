import React, {useCallback, useEffect, useRef, useState} from "react";
import {ArrowLeft, Check, Clipboard, Download, ExternalLink, File, FileText, Link, Trash2, Upload, X} from "lucide-react";
import gsap from "gsap";
import {apiBaseUrl} from "../../main.tsx";
import "./Expedite.scss";
import useTitle from "../../hooks/useTitle.ts";

type DropType = "text" | "file";
type ViewMode = "idle" | "uploading" | "created" | "retrieving" | "result";

interface DropSettings {
    deletable: boolean;
    maxViews: number | null; // null = infinite
    ttlMs: number;           // 60_000 to 86_400_000
}

interface DropMeta {
    code: string;
    type: DropType;
    size: number;
    createdAt: string;
    expiresAt: string;
    views: number;
    maxViews: number | null;
    deletable: boolean;
    text?: string;
    fileName?: string;
    mimeType?: string;
    encoding?: string;
}

const DEFAULT_SETTINGS: DropSettings = {
    deletable: true,
    maxViews: null,
    ttlMs: 43_200_000, // 12h
};

const TTL_PRESETS = [
    {label: "5 min", value: 300_000},
    {label: "30 min", value: 1_800_000},
    {label: "1 hr", value: 3_600_000},
    {label: "6 hr", value: 21_600_000},
    {label: "12 hr", value: 43_200_000},
    {label: "24 hr", value: 86_400_000},
];

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDuration(ms: number): string {
    if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
    return `${Math.round(ms / 3_600_000)}h`;
}

function timeUntil(dateStr: string): string {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return "expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function getDropUrl(code: string): string {
    return `${window.location.origin}/expedite?code=${code}`;
}

// --- GSAP transition helper ---
function animateIn(el: HTMLElement | null, delay = 0) {
    if (!el) return;
    gsap.fromTo(el,
        {opacity: 0, y: 16},
        {opacity: 1, y: 0, duration: 0.4, delay, ease: "power2.out"}
    );
}

function animateOut(el: HTMLElement | null): Promise<void> {
    if (!el) return Promise.resolve();
    return new Promise((resolve) => {
        gsap.to(el, {
            opacity: 0, y: -12, duration: 0.2, ease: "power2.in",
            onComplete: resolve
        });
    });
}

export default function Expedite() {
    // region useStates & useRefs
    const [view, setView] = useState<ViewMode>("idle");
    const [dropType, setDropType] = useState<DropType>("text");
    const [textContent, setTextContent] = useState("");
    const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
    const [retrieveCode, setRetrieveCode] = useState("");
    const [result, setResult] = useState<DropMeta | null>(null);
    const [createdCode, setCreatedCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [settings, setSettings] = useState<DropSettings>({...DEFAULT_SETTINGS});
    const [maxViewsInput, setMaxViewsInput] = useState("");
    const [stats, setStats] = useState<{
        activeDrops: number;
        totalSize: number;
        totalViews: number;
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const viewRef = useRef<HTMLDivElement>(null);
    const dragOverlayRef = useRef<HTMLDivElement>(null);
    // endregion

    useTitle("Expedite 📦 | jerryxf"); // update page title

    // Auto-retrieve from URL param
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code) {
            setRetrieveCode(code.toUpperCase());
            setView("retrieving");
            // Trigger retrieve after mount
            setTimeout(() => retrieveDrop(code.toUpperCase()), 100);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Animate view transitions
    useEffect(() => {
        animateIn(viewRef.current);
    }, [view, createdCode, result]);

    // Drag overlay animation
    useEffect(() => {
        if (dragOverlayRef.current) {
            gsap.to(dragOverlayRef.current, {
                opacity: isDragging ? 1 : 0,
                duration: 0.2,
                pointerEvents: isDragging ? "auto" : "none"
            });
        }
    }, [isDragging]);

    useEffect(() => {
        fetch(`${apiBaseUrl}/expedite/stats`)
            .then(r => r.json())
            .then(json => {
                if (json._success) setStats(json.data);
            })
            .catch(() => {
            }); // silent
    }, [view]);

    const transitionTo = async (nextView: ViewMode) => {
        await animateOut(viewRef.current);
        setView(nextView);
    };

    const reset = async () => {
        await animateOut(viewRef.current);
        setDropType("text");
        setTextContent("");
        setSelectedFile(null);
        setRetrieveCode("");
        setResult(null);
        setCreatedCode(null);
        setError(null);
        setLoading(false);
        setCopiedField(null);
        setSettings({...DEFAULT_SETTINGS});
        setMaxViewsInput("");
        // Clean URL params
        window.history.replaceState({}, "", "/expedite");
        setView("idle");
    };

    // region data stuff
    const handleUpload = async () => {
        setLoading(true);
        setError(null);

        try {
            let res: Response;

            if (dropType === "text") {
                res = await fetch(`${apiBaseUrl}/expedite/drop/text`, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        text: textContent,
                        deletable: settings.deletable,
                        maxViews: settings.maxViews,
                        ttlMs: settings.ttlMs,
                    })
                });
            } else {
                if (!selectedFile) {
                    setError("No file selected");
                    setLoading(false);
                    return;
                }
                const formData = new FormData();
                formData.append("file", selectedFile);
                formData.append("deletable", String(settings.deletable));
                if (settings.maxViews !== null) formData.append("maxViews", String(settings.maxViews));
                formData.append("ttlMs", String(settings.ttlMs));
                res = await fetch(`${apiBaseUrl}/expedite/drop/file`, {method: "POST", body: formData});
            }

            const json = await res.json();
            if (!json._success) {
                setError(json.error?.message || "Upload failed");
                setLoading(false);
                return;
            }

            setCreatedCode(json.data.code);
            await transitionTo("created");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setLoading(false);
        }
    };

    const retrieveDrop = async (code?: string) => {
        const targetCode = (code || retrieveCode).trim().toUpperCase();
        if (!targetCode) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${apiBaseUrl}/expedite/drop/${targetCode}`);
            const json = await res.json();
            if (!json._success) {
                setError(json.error?.message || "Not found");
                setLoading(false);
                return;
            }
            setResult(json.data as DropMeta);
            await transitionTo("result");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Retrieval failed");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!result) return;
        if (result.type === "text" && result.text) {
            const blob = new Blob([result.text], {type: "text/plain"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `expedite-${result.code}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            window.open(`${apiBaseUrl}/expedite/drop/${result.code}/download`, "_blank");
        }
    };

    const handleDelete = async () => {
        if (!result || !result.deletable) return;
        try {
            await fetch(`${apiBaseUrl}/expedite/drop/${result.code}`, {method: "DELETE"});
            await reset();
        } catch { /* silent */
        }
    };

    const copyToClipboard = async (text: string, field: string, e?: React.MouseEvent) => {
        const btn = e?.currentTarget as HTMLElement | null;

        // Flash green (must capture btn before await)
        if (btn) {
            btn.classList.add("expedite_btn--success");
            setTimeout(() => btn.classList.remove("expedite_btn--success"), 1500);
        }

        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            setSelectedFile(file);
            setDropType("file");
            setView("uploading");
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => setIsDragging(false), []);

    const handleMaxViewsChange = (val: string) => {
        setMaxViewsInput(val);
        const num = parseInt(val, 10);
        setSettings(s => ({...s, maxViews: (num > 0) ? num : null}));
    };
    // endregion

    return (
        <div className="expedite" onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
            {/* Drag overlay */}
            <div ref={dragOverlayRef} className="expedite_drag-overlay" style={{opacity: 0, pointerEvents: "none"}}>
                <Upload size={48} strokeWidth={1} />
                <p>Drop file to upload</p>
            </div>

            <div className="expedite_container">
                <a href="/" className="expedite_home-link">
                    <ExternalLink size={13} />
                    <span>jerryxf.net</span>
                </a>
                <header className="expedite_header">
                    {view !== "idle" && (
                        <button className="expedite_back" onClick={reset}>
                            <ArrowLeft size={16} />
                            <span>Back</span>
                        </button>
                    )}
                    <h1>Expedite 📦</h1>
                    <p className="caption-text">Share files and text snippets with instantaneous same-day shipping (guaranteed)!</p>
                </header>

                {/* Views */}
                <div ref={viewRef}>
                    {/* Idle */}
                    {view === "idle" && (
                        <div className="expedite_actions">
                            <button className="expedite_action-btn" onClick={() => transitionTo("uploading")}>
                                <Upload size={22} strokeWidth={1.5} />
                                <div className="expedite_action-text">
                                    <span className="small-text">New drop</span>
                                    <span className="smaller-caption-text">Share a file or text snippet</span>
                                </div>
                            </button>

                            <button className="expedite_action-btn" onClick={() => transitionTo("retrieving")}>
                                <Download size={22} strokeWidth={1.5} />
                                <div className="expedite_action-text">
                                    <span className="small-text">Retrieve a drop</span>
                                    <span className="smaller-caption-text">Enter a code to access shared content</span>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Upload */}
                    {view === "uploading" && (
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
                                                handleMaxViewsChange(cleaned);
                                            }}
                                        />
                                        <button
                                            className={`expedite_setting-pill ${settings.maxViews === null ? "active" : ""}`}
                                            onClick={() => {
                                                setMaxViewsInput("");
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
                                <button className="expedite_btn-secondary" onClick={reset}>Cancel</button>
                                <button
                                    className="expedite_btn-primary"
                                    onClick={handleUpload}
                                    disabled={loading || (dropType === "text" ? !textContent.trim() : !selectedFile)}
                                >
                                    {loading ? "Uploading..." : `Create drop · ${formatDuration(settings.ttlMs)}`}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Created */}
                    {view === "created" && createdCode && (
                        <div className="expedite_created">
                            <p className="smaller-caption-text">Your drop code</p>
                            <button className="expedite_code-display" onClick={(e) => copyToClipboard(createdCode, "code", e)}>
                                <span className="expedite_code-text">{createdCode}</span>
                                {copiedField === "code" ? <Check size={18} /> : <Clipboard size={18} />}
                            </button>
                            <p className="smaller-caption-text">
                                {copiedField === "code" ? "Copied!" : "Tap to copy code"}
                            </p>
                            <div className="expedite_link-box">
                                <input
                                    className="expedite_link-input small-text"
                                    type="text"
                                    value={getDropUrl(createdCode)}
                                    readOnly
                                    onFocus={(e) => e.target.select()}
                                />
                                <button
                                    className="expedite_link-copy"
                                    onClick={(e) => copyToClipboard(getDropUrl(createdCode), "link", e)}
                                >
                                    {copiedField === "link" ? <Check size={14} /> : <Link size={14} />}
                                </button>
                            </div>

                            <button className="expedite_btn-secondary expedite_btn-full" onClick={reset}>
                                Done
                            </button>
                        </div>
                    )}

                    {/* Retrieve */}
                    {view === "retrieving" && !result && (
                        <div className="expedite_retrieve">
                            <input
                                className="expedite_code-input"
                                type="text"
                                placeholder="Enter drop code"
                                value={retrieveCode}
                                onChange={(e) => setRetrieveCode(e.target.value.toUpperCase())}
                                maxLength={5}
                                autoFocus={true}
                                onKeyDown={(e) => e.key === "Enter" && retrieveDrop()}
                            />
                            {error && <p className="expedite_error">{error}</p>}
                            <div className="expedite_btn-row">
                                <button className="expedite_btn-secondary" onClick={reset}>Cancel</button>
                                <button
                                    className="expedite_btn-primary"
                                    onClick={() => retrieveDrop()}
                                    disabled={loading || retrieveCode.trim().length < 3}
                                >
                                    {loading ? "Looking up..." : "Retrieve"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Result */}
                    {view === "result" && result && (
                        <div className="expedite_retrieved">
                            {/* Metadata card */}
                            <div className="expedite_meta">
                                <div className="expedite_meta-header">
                                    <span className="expedite_meta-type">
                                        {result.type === "text" ? <FileText size={14} /> : <File size={14} />}
                                        {result.type}
                                    </span>
                                    <span className="expedite_meta-code">{result.code}</span>
                                </div>
                                <div className="expedite_meta-grid">
                                    {result.fileName && (
                                        <div className="expedite_meta-item">
                                            <span className="expedite_meta-label">Filename</span>
                                            <span className="expedite_meta-value">{result.fileName}</span>
                                        </div>
                                    )}
                                    <div className="expedite_meta-item">
                                        <span className="expedite_meta-label">Size</span>
                                        <span className="expedite_meta-value">{formatBytes(result.size)}</span>
                                    </div>
                                    {result.mimeType && (
                                        <div className="expedite_meta-item">
                                            <span className="expedite_meta-label">MIME type</span>
                                            <span className="expedite_meta-value">{result.mimeType}</span>
                                        </div>
                                    )}
                                    {result.encoding && (
                                        <div className="expedite_meta-item">
                                            <span className="expedite_meta-label">Encoding</span>
                                            <span className="expedite_meta-value">{result.encoding}</span>
                                        </div>
                                    )}
                                    <div className="expedite_meta-item">
                                        <span className="expedite_meta-label">Created</span>
                                        <span className="expedite_meta-value">{new Date(result.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="expedite_meta-item">
                                        <span className="expedite_meta-label">Expires in</span>
                                        <span className="expedite_meta-value">{timeUntil(result.expiresAt)}</span>
                                    </div>
                                    <div className="expedite_meta-item">
                                        <span className="expedite_meta-label">Views</span>
                                        <span className="expedite_meta-value">
                                            {result.views}{result.maxViews ? ` / ${result.maxViews}` : ""}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            {result.type === "text" && result.text && (
                                <>
                                    <p className="expedite_content-label">Content</p>
                                    <div className="expedite_text-preview">
                                        <pre>{result.text}</pre>
                                    </div>
                                </>
                            )}

                            {/* Actions */}
                            <div className="expedite_btn-row">
                                <button
                                    className={`expedite_btn-icon ${result.deletable ? "expedite_btn-icon--danger" : "expedite_btn-icon--disabled"}`}
                                    onClick={handleDelete}
                                    disabled={!result.deletable}
                                    title={result.deletable ? "Delete drop" : "Deletion disabled by sender"}
                                >
                                    <Trash2 size={16} />
                                </button>
                                <button
                                    className="expedite_btn-secondary"
                                    onClick={(e) => copyToClipboard(result.code, "code", e)}
                                >
                                    {copiedField === "code" ? <Check size={14} /> : <Clipboard size={14} />}
                                    {copiedField === "code" ? "Copied" : "Code"}
                                </button>
                                <button
                                    className="expedite_btn-secondary"
                                    onClick={(e) => copyToClipboard(getDropUrl(result.code), "link", e)}
                                >
                                    {copiedField === "link" ? <Check size={14} /> : <Link size={14} />}
                                    {copiedField === "link" ? "Copied" : "Link"}
                                </button>
                                {result.type === "text" && result.text && (
                                    <button
                                        className="expedite_btn-secondary"
                                        onClick={(e) => copyToClipboard(result.text!, "text", e)}
                                    >
                                        {copiedField === "text" ? <Check size={14} /> : <Clipboard size={14} />}
                                        {copiedField === "text" ? "Copied" : "Text"}
                                    </button>
                                )}
                                <button className="expedite_btn-primary" onClick={handleDownload}>
                                    <Download size={14} />
                                    Download
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="expedite_spacer" />
            {stats && (
                <div className="expedite_stats">
                    <span>{stats.activeDrops} active drop{stats.activeDrops !== 1 ? "s" : ""}</span>
                    <span>·</span>
                    <span>{formatBytes(stats.totalSize)}</span>
                    <span>·</span>
                    <span>{stats.totalViews} view{stats.totalViews !== 1 ? "s" : ""}</span>
                </div>
            )}

            <footer className="expedite_footer">
                <p>
                    <a href="/expedite">📦 Expedite</a>, made with ❤️ by Jerry
                </p>
            </footer>
        </div>
    );
}