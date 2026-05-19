import {useCallback, useRef, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {ArrowLeft, Check, Clipboard, Download, File, FileText, Trash2, Upload} from "lucide-react";
import {apiBaseUrl} from "../../main.tsx";
import "./Expedite.scss";

type DropType = "text" | "file";

interface DropMeta {
    code: string;
    type: DropType;
    size: number;
    createdAt: string;
    expiresAt: string;
    downloads: number;
    // text-specific
    text?: string;
    // file-specific
    fileName?: string;
    mimeType?: string;
    encoding?: string;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function timeUntil(dateStr: string): string {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return "expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

export default function Expedite() {
    const [mode, setMode] = useState<"idle" | "uploading" | "retrieving">("idle");
    const [dropType, setDropType] = useState<DropType>("text");
    const [textContent, setTextContent] = useState("");
    const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
    const [retrieveCode, setRetrieveCode] = useState("");
    const [result, setResult] = useState<DropMeta | null>(null);
    const [createdCode, setCreatedCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const reset = () => {
        setMode("idle");
        setDropType("text");
        setTextContent("");
        setSelectedFile(null);
        setRetrieveCode("");
        setResult(null);
        setCreatedCode(null);
        setError(null);
        setLoading(false);
        setCopied(false);
    };

    const handleUpload = async () => {
        setLoading(true);
        setError(null);

        try {
            let res: Response;

            if (dropType === "text") {
                res = await fetch(`${apiBaseUrl}/expedite/drop/text`, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({text: textContent})
                });
            } else {
                if (!selectedFile) throw new Error("No file selected");
                const formData = new FormData();
                formData.append("file", selectedFile);
                res = await fetch(`${apiBaseUrl}/expedite/drop/file`, {
                    method: "POST",
                    body: formData
                });
            }

            const json = await res.json();
            if (!json._success) throw new Error(json.error?.message || "Upload failed");

            setCreatedCode(json.data.code);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setLoading(false);
        }
    };

    const handleRetrieve = async () => {
        if (!retrieveCode.trim()) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${apiBaseUrl}/expedite/drop/${retrieveCode.trim().toUpperCase()}`);
            const json = await res.json();
            if (!json._success) throw new Error(json.error?.message || "Not found");
            setResult(json.data as DropMeta);
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
        if (!result) return;
        try {
            await fetch(`${apiBaseUrl}/expedite/drop/${result.code}`, {method: "DELETE"});
            reset();
        } catch {
            // silent
        }
    };

    const copyCode = async (code: string) => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const copyText = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            setSelectedFile(file);
            setDropType("file");
            setMode("uploading");
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const pageVariants = {
        initial: {opacity: 0, y: 12},
        animate: {opacity: 1, y: 0},
        exit: {opacity: 0, y: -12}
    };

    return (
        <div
            className="expedite"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            <AnimatePresence>
                {isDragging && (
                    <motion.div
                        className="expedite_drag-overlay"
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        exit={{opacity: 0}}
                    >
                        <Upload size={48} strokeWidth={1} />
                        <p>Drop file to upload</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="expedite_container">
                <header className="expedite_header">
                    <a href="/" className="expedite_back">
                        <ArrowLeft size={16} />
                        <span>Home</span>
                    </a>
                    <h1>Expedite</h1>
                    <p className="expedite_subtitle">Share files and text snippets. Drops expire after 24 hours.</p>
                </header>

                <AnimatePresence mode="wait">
                    {/* Idle: choose action */}
                    {mode === "idle" && !createdCode && !result && (
                        <motion.div
                            key="idle"
                            className="expedite_actions"
                            variants={pageVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={{duration: 0.2}}
                        >
                            <button className="expedite_action-btn" onClick={() => setMode("uploading")}>
                                <Upload size={20} strokeWidth={1.5} />
                                <span>New drop</span>
                            </button>
                            <button className="expedite_action-btn" onClick={() => setMode("retrieving")}>
                                <Download size={20} strokeWidth={1.5} />
                                <span>Retrieve a drop</span>
                            </button>
                        </motion.div>
                    )}

                    {/* Upload flow */}
                    {mode === "uploading" && !createdCode && (
                        <motion.div
                            key="upload"
                            className="expedite_upload"
                            variants={pageVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={{duration: 0.2}}
                        >
                            <div className="expedite_type-toggle">
                                <button
                                    className={`expedite_type-btn ${dropType === "text" ? "active" : ""}`}
                                    onClick={() => setDropType("text")}
                                >
                                    <FileText size={14} />
                                    Text
                                </button>
                                <button
                                    className={`expedite_type-btn ${dropType === "file" ? "active" : ""}`}
                                    onClick={() => setDropType("file")}
                                >
                                    <File size={14} />
                                    File
                                </button>
                            </div>

                            {dropType === "text" ? (
                                <textarea
                                    className="expedite_textarea"
                                    placeholder="Paste or type your text here..."
                                    value={textContent}
                                    onChange={(e) => setTextContent(e.target.value)}
                                    rows={8}
                                    autoFocus
                                />
                            ) : (
                                <div
                                    className="expedite_file-zone"
                                    onClick={() => fileInputRef.current?.click()}
                                >
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
                                            <File size={20} />
                                            <div>
                                                <p className="expedite_file-name">{selectedFile.name}</p>
                                                <p className="expedite_file-size">{formatBytes(selectedFile.size)}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload size={24} strokeWidth={1} />
                                            <p>Click to choose a file or drag & drop</p>
                                            <p className="expedite_file-limit">Max 50 MB</p>
                                        </>
                                    )}
                                </div>
                            )}

                            {error && <p className="expedite_error">{error}</p>}

                            <div className="expedite_btn-row">
                                <button className="expedite_btn-secondary" onClick={reset}>Cancel</button>
                                <button
                                    className="expedite_btn-primary"
                                    onClick={handleUpload}
                                    disabled={loading || (dropType === "text" ? !textContent.trim() : !selectedFile)}
                                >
                                    {loading ? "Uploading..." : "Create drop"}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Created: show code */}
                    {createdCode && (
                        <motion.div
                            key="created"
                            className="expedite_result"
                            variants={pageVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={{duration: 0.2}}
                        >
                            <p className="expedite_result-label">Your drop code</p>
                            <button className="expedite_code-display" onClick={() => copyCode(createdCode)}>
                                <span className="expedite_code-text">{createdCode}</span>
                                {copied ? <Check size={16} /> : <Clipboard size={16} />}
                            </button>
                            <p className="expedite_result-hint">
                                {copied ? "Copied!" : "Tap to copy. Share this code to retrieve the drop."}
                            </p>
                            <button className="expedite_btn-secondary" onClick={reset}>Done</button>
                        </motion.div>
                    )}

                    {/* Retrieve flow */}
                    {mode === "retrieving" && !result && (
                        <motion.div
                            key="retrieve"
                            className="expedite_retrieve"
                            variants={pageVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={{duration: 0.2}}
                        >
                            <input
                                className="expedite_code-input"
                                type="text"
                                placeholder="Enter drop code"
                                value={retrieveCode}
                                onChange={(e) => setRetrieveCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                autoFocus
                                onKeyDown={(e) => e.key === "Enter" && handleRetrieve()}
                            />

                            {error && <p className="expedite_error">{error}</p>}

                            <div className="expedite_btn-row">
                                <button className="expedite_btn-secondary" onClick={reset}>Cancel</button>
                                <button
                                    className="expedite_btn-primary"
                                    onClick={handleRetrieve}
                                    disabled={loading || retrieveCode.trim().length < 3}
                                >
                                    {loading ? "Looking up..." : "Retrieve"}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* --- Retrieved result --- */}
                    {result && (
                        <motion.div
                            key="result"
                            className="expedite_retrieved"
                            variants={pageVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={{duration: 0.2}}
                        >
                            <div className="expedite_meta">
                                <div className="expedite_meta-header">
                                    <span className={`expedite_meta-type expedite_meta-type--${result.type}`}>
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
                                            <span className="expedite_meta-label">Type</span>
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
                                        <span className="expedite_meta-value">
                                            {new Date(result.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="expedite_meta-item">
                                        <span className="expedite_meta-label">Expires in</span>
                                        <span className="expedite_meta-value">{timeUntil(result.expiresAt)}</span>
                                    </div>
                                    <div className="expedite_meta-item">
                                        <span className="expedite_meta-label">Views</span>
                                        <span className="expedite_meta-value">{result.downloads}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Text preview */}
                            {result.type === "text" && result.text && (
                                <div className="expedite_text-preview">
                                    <pre>{result.text}</pre>
                                </div>
                            )}

                            <div className="expedite_btn-row">
                                <button className="expedite_btn-icon" onClick={handleDelete} title="Delete drop">
                                    <Trash2 size={16} />
                                </button>
                                {result.type === "text" && result.text && (
                                    <button
                                        className="expedite_btn-secondary"
                                        onClick={() => copyText(result.text!)}
                                    >
                                        {copied ? <Check size={14} /> : <Clipboard size={14} />}
                                        {copied ? "Copied" : "Copy text"}
                                    </button>
                                )}
                                <button className="expedite_btn-primary" onClick={handleDownload}>
                                    <Download size={14} />
                                    Download
                                </button>
                            </div>
                            <button className="expedite_btn-secondary expedite_btn-full" onClick={reset}>
                                Back
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
