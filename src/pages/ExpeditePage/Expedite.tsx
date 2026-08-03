import React, {useCallback, useEffect, useRef, useState} from "react";
import {ArrowLeft, ExternalLink, Upload} from "lucide-react";
import {Helmet} from "react-helmet-async";
import gsap from "gsap";
import {apiBaseUrl} from "../../main.tsx";
import "./Expedite.scss";

import {
    DEFAULT_SETTINGS,
    type DropMeta,
    type DropSettings,
    type DropType,
    EMPTY_P2P_STATUS,
    isP2PReceiveSupported,
    type P2PSnapshot,
    type P2PStatus,
    type UploadSnapshot,
    type ViewMode
} from "./types.ts";
import {formatBytes} from "./utils.ts";
import LandingView from "./views/LandingView.tsx";
import UploadView from "./views/UploadView.tsx";
import CreatedView from "./views/CreatedView.tsx";
import ResultView from "./views/ResultView.tsx";
import P2PSendView from "./views/P2PSendView.tsx";
import P2PReceiveView from "./views/P2PReceiveView.tsx";
import {uploadFile} from "./uploadEngine.ts";
import UploadProgress from "./views/UploadProgress.tsx";
import {closeSession, sendP2P} from "./p2p/sender.ts";
import {receiveP2P} from "./p2p/receiver.ts";

// --- GSAP transition helpers ---
function animateIn(el: HTMLElement | null, delay = 0) {
    if (!el) return;
    void void gsap.fromTo(el,
        {opacity: 0, y: 16},
        {opacity: 1, y: 0, duration: 0.33, delay, ease: "power2.out"}
    );
}

function animateOut(el: HTMLElement | null): Promise<void> {
    if (!el) return Promise.resolve();
    return new Promise((resolve) => {
        void gsap.to(el, {
            opacity: 0, y: -12, duration: 0.2, ease: "power2.in",
            onComplete: resolve
        });
    });
}

const freshStatus = (): P2PStatus => ({
    ...EMPTY_P2P_STATUS,
    candidates: {...EMPTY_P2P_STATUS.candidates},
});

export default function Expedite() {
    const [view, setView] = useState<ViewMode>("landing");
    const [retrieveCode, setRetrieveCode] = useState(() =>
        new URLSearchParams(window.location.search).get("code")?.toUpperCase() ?? ""
    );
    const [dropType, setDropType] = useState<DropType>("text");
    const [textContent, setTextContent] = useState("");
    const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
    const [result, setResult] = useState<DropMeta | null>(null);
    const [createdCode, setCreatedCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [settings, setSettings] = useState<DropSettings>({...DEFAULT_SETTINGS});
    const [maxViewsInput, setMaxViewsInput] = useState("");

    const [uploadSnapshot, setUploadSnapshot] = useState<UploadSnapshot | null>(null);
    const uploadAbortRef = useRef<AbortController | null>(null);

    // --- Direct P2P ---
    const [useTurn, setUseTurn] = useState(false);
    const [p2pStatus, setP2pStatus] = useState<P2PStatus>(freshStatus);
    const [p2pSnapshot, setP2pSnapshot] = useState<P2PSnapshot | null>(null);
    const [p2pCode, setP2pCode] = useState<string | null>(null);
    const [p2pExpiresAt, setP2pExpiresAt] = useState<string | null>(null);
    const [p2pRunning, setP2pRunning] = useState(false);
    const p2pAbortRef = useRef<AbortController | null>(null);
    const p2pCodeRef = useRef<string | null>(null);
    const p2pSupported = isP2PReceiveSupported();

    const [stats, setStats] = useState<{
        activeDrops: number;
        totalViews: number;
        liveSessions?: number;
        usedBytes?: number;
        maxBytes?: number;
    } | null>(null);

    const viewRef = useRef<HTMLDivElement>(null);
    const dragOverlayRef = useRef<HTMLDivElement>(null);
    const hasInitialized = useRef(false);

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

    // Fetch stats
    useEffect(() => {
        fetch(`${apiBaseUrl}/expedite/stats`)
            .then(async r => {
                if (!r.ok) return;
                const json = await r.json();
                setStats(json.data);
            }).catch(() => {
        });
    }, [view]);

    // A live session left dangling would keep handing out an offer nobody is
    // listening for until its TTL runs out. keepalive lets the request outlive
    // the page; sendBeacon can't be used because it only issues POSTs.
    useEffect(() => {
        const onUnload = (): void => {
            if (p2pCodeRef.current) closeSession(apiBaseUrl, p2pCodeRef.current);
        };
        window.addEventListener("beforeunload", onUnload);
        return () => window.removeEventListener("beforeunload", onUnload);
    }, []);

    const transitionTo = async (nextView: ViewMode) => {
        await animateOut(viewRef.current);
        setView(nextView);
    };

    const reset = async () => {
        uploadAbortRef.current?.abort();
        uploadAbortRef.current = null;
        setUploadSnapshot(null);

        p2pAbortRef.current?.abort();
        p2pAbortRef.current = null;
        if (p2pCodeRef.current) closeSession(apiBaseUrl, p2pCodeRef.current);
        p2pCodeRef.current = null;
        setP2pCode(null);
        setP2pExpiresAt(null);
        setP2pRunning(false);
        setP2pSnapshot(null);
        setP2pStatus(freshStatus());

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
        window.history.replaceState({}, "", "/expedite");
        setView("landing");
    };

    // --- Landing tile selection ---
    const handleSelect = async (type: DropType) => {
        setError(null);
        setDropType(type);
        await transitionTo(type === "p2p" ? "p2p-send" : "composing");
    };

    const handleUpload = async () => {
        setLoading(true);
        setError(null);

        // TEXT — unchanged, inline JSON
        if (dropType === "text") {
            try {
                const res = await fetch(`${apiBaseUrl}/expedite/drop/text`, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        text: textContent,
                        deletable: settings.deletable,
                        maxViews: settings.maxViews,
                        ttlMs: settings.ttlMs,
                    })
                });

                const json = await res.json();

                if (!res.ok) {
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
            return;
        }

        // FILE — presigned engine (single or multipart), direct to R2
        if (!selectedFile) {
            setError("No file selected");
            setLoading(false);
            return;
        }
        const controller = new AbortController();
        uploadAbortRef.current = controller;
        setUploadSnapshot(null);
        try {
            const meta = await uploadFile(selectedFile, settings, apiBaseUrl, setUploadSnapshot, controller.signal);
            setCreatedCode(meta.code);
            await transitionTo("created");
        } catch (err: unknown) {
            // AbortError = user cancelled; stay on the form silently
            if ((err as Error).name !== "AbortError") {
                setError(err instanceof Error ? err.message : "Upload failed");
            }
        } finally {
            uploadAbortRef.current = null;
            setUploadSnapshot(null);
            setLoading(false);
        }
    };

    const cancelUpload = () => uploadAbortRef.current?.abort();

    const retrieveDrop = async (code?: string) => {
        const targetCode = (code || retrieveCode).trim().toUpperCase();
        if (!targetCode) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${apiBaseUrl}/expedite/drop/${targetCode}`);
            const json = await res.json();

            if (!res.ok) {
                setError(json.error?.message || "Not found");
                setLoading(false);
                return;
            }

            const meta = json.data as DropMeta;
            setResult(meta);
            // The type isn't known until the lookup resolves, which is also when
            // it appears in the heading.
            await transitionTo(meta.type === "p2p" ? "p2p-receive" : "result");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Retrieval failed");
        } finally {
            setLoading(false);
        }
    };

    // Auto-retrieve when arriving via a ?code= link (retrieveCode is seeded from the URL above)
    useEffect(() => {
        if (retrieveCode && !hasInitialized.current) {
            hasInitialized.current = true;
            void retrieveDrop(retrieveCode);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Direct P2P: send ---
    const startP2PSend = async () => {
        if (!selectedFile) return;
        setError(null);
        setP2pSnapshot(null);
        setP2pStatus(freshStatus());
        setP2pRunning(true);

        const controller = new AbortController();
        p2pAbortRef.current = controller;

        try {
            await sendP2P({
                file: selectedFile,
                apiBaseUrl,
                useTurn,
                signal: controller.signal,
                onStatus: setP2pStatus,
                onSnapshot: setP2pSnapshot,
                onCode: (code, expiresAt) => {
                    // Ref mirrors state so the unload handler can read it without
                    // re-subscribing on every rotation.
                    p2pCodeRef.current = code;
                    setP2pCode(code);
                    setP2pExpiresAt(expiresAt);
                },
            });
        } catch (err: unknown) {
            if ((err as Error).name !== "AbortError") {
                setError(err instanceof Error ? err.message : "Transfer failed");
            }
        } finally {
            p2pAbortRef.current = null;
            if (p2pCodeRef.current) {
                closeSession(apiBaseUrl, p2pCodeRef.current);
                p2pCodeRef.current = null;
            }
        }
    };

    // --- Direct P2P: receive ---
    const acceptP2PReceive = async () => {
        if (!result?.offer || !window.showSaveFilePicker) return;
        setError(null);

        // showSaveFilePicker must be the first await in this handler — it needs
        // the user gesture, and any prior await would spend it.
        let handle: FileSystemFileHandle;
        try {
            handle = await window.showSaveFilePicker({
                suggestedName: result.fileName ?? `expedite-${result.code}`,
            });
        } catch (err: unknown) {
            // Dismissing the picker isn't an error worth reporting.
            if ((err as Error).name !== "AbortError") {
                setError(err instanceof Error ? err.message : "Could not open save location");
            }
            return;
        }

        setP2pSnapshot(null);
        setP2pStatus(freshStatus());
        setP2pRunning(true);

        const controller = new AbortController();
        p2pAbortRef.current = controller;

        try {
            await receiveP2P({
                code: result.code,
                offer: result.offer,
                fileName: result.fileName ?? `expedite-${result.code}`,
                fileSize: result.size,
                handle,
                apiBaseUrl,
                useTurn,
                signal: controller.signal,
                onStatus: setP2pStatus,
                onSnapshot: setP2pSnapshot,
            });
        } catch (err: unknown) {
            if ((err as Error).name !== "AbortError") {
                setError(err instanceof Error ? err.message : "Transfer failed");
            }
        } finally {
            p2pAbortRef.current = null;
        }
    };

    const handleDownload = async () => {
        if (!result) return;

        // Text: build blob locally
        if (result.type === "text" && result.text) {
            const blob = new Blob([result.text], {type: "text/plain"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `expedite-${result.code}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            return;
        }

        if (!result.fileUrl) return;

        // File: Fetch and force a download via blob
        try {
            const res = await fetch(result.fileUrl);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = result.fileName ?? `expedite-${result.code}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            // Fallback: open in new tab if fetch fails (e.g. CORS)
            window.open(result.fileUrl, "_blank");
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

        if (btn) {
            btn.classList.add("expedite_btn--success");
            setTimeout(() => btn.classList.remove("expedite_btn--success"), 1500);
        }

        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleMaxViewsChange = (val: string) => {
        setMaxViewsInput(val);
        const num = parseInt(val, 10);
        setSettings(s => ({...s, maxViews: (num > 0) ? num : null}));
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            setSelectedFile(file);
            setDropType("file");
            setView("composing");
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => setIsDragging(false), []);

    // The resolved drop type is appended to the heading, so it only appears
    // once a lookup has returned.
    const resolvedType = result?.type ?? null;

    return (
        <div className="expedite" onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
            <Helmet>
                <title>Expedite 📦 | jerryxf</title>
                <meta name="description" content="Quickly share files and text snippets with other people or across your own devices." />
                <link rel="canonical" href="https://jerryxf.net/expedite" />
            </Helmet>


            {/* Drag overlay */}
            <div ref={dragOverlayRef} className="expedite_drag-overlay" style={{opacity: 0, pointerEvents: "none"}}>
                <Upload size={48} strokeWidth={1} />
                <p>Drop file to upload</p>
            </div>

            <div
                className={[
                    "expedite_container",
                    view === "composing" && uploadSnapshot ? "expedite_container--wide" : "",
                    view === "landing" ? "expedite_container--landing" : "",
                    view === "p2p-send" || view === "p2p-receive" ? "expedite_container--p2p" : "",
                ].filter(Boolean).join(" ")}
            >
                <a href="/" className="expedite_home-link">
                    <ExternalLink size={13} />
                    <span>jerryxf.net</span>
                </a>
                <header className="expedite_header">
                    {view !== "landing" && (
                        <button className="expedite_back" onClick={reset}>
                            <ArrowLeft size={16} />
                            <span>Back</span>
                        </button>
                    )}
                    <h1>Expedite 📦{resolvedType ? ` (${resolvedType})` : ""}</h1>
                    {view === "landing" && (
                        <p className="caption-text">Share files and text snippets with instantaneous same-day shipping (guaranteed)!</p>
                    )}
                </header>

                {/* Views */}
                <div ref={viewRef}>
                    {view === "landing" && (
                        <LandingView
                            onSelect={handleSelect}
                            code={retrieveCode}
                            setCode={setRetrieveCode}
                            error={error}
                            loading={loading}
                            onRetrieve={() => retrieveDrop()}
                            p2pSupported={p2pSupported}
                        />
                    )}

                    {view === "composing" && (
                        <div className={`expedite_upload-layout ${uploadSnapshot ? "is-uploading" : ""}`}>
                            <UploadView
                                dropType={dropType}
                                textContent={textContent}
                                setTextContent={setTextContent}
                                selectedFile={selectedFile}
                                setSelectedFile={setSelectedFile}
                                settings={settings}
                                setSettings={setSettings}
                                maxViewsInput={maxViewsInput}
                                onMaxViewsChange={handleMaxViewsChange}
                                error={error}
                                loading={loading}
                                onUpload={handleUpload}
                                onCancel={loading ? cancelUpload : reset}
                            />
                            {uploadSnapshot && <UploadProgress snapshot={uploadSnapshot} />}
                        </div>
                    )}

                    {view === "created" && createdCode && (
                        <CreatedView
                            code={createdCode}
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                            onDone={reset}
                        />
                    )}

                    {view === "p2p-send" && (
                        <P2PSendView
                            selectedFile={selectedFile}
                            setSelectedFile={setSelectedFile}
                            useTurn={useTurn}
                            setUseTurn={setUseTurn}
                            code={p2pCode}
                            expiresAt={p2pExpiresAt}
                            status={p2pStatus}
                            snapshot={p2pSnapshot}
                            running={p2pRunning}
                            error={error}
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                            onStart={startP2PSend}
                            onCancel={reset}
                        />
                    )}

                    {view === "p2p-receive" && result && (
                        <P2PReceiveView
                            meta={result}
                            supported={p2pSupported}
                            useTurn={useTurn}
                            setUseTurn={setUseTurn}
                            status={p2pStatus}
                            snapshot={p2pSnapshot}
                            running={p2pRunning}
                            error={error}
                            onAccept={acceptP2PReceive}
                            onCancel={reset}
                        />
                    )}

                    {view === "result" && result && (
                        <ResultView
                            result={result}
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                            onDownload={handleDownload}
                            onDelete={handleDelete}
                        />
                    )}
                </div>
            </div>

            <div className="expedite_spacer" />
            {stats && (
                <div className="expedite_stats">
                    <span>{stats.activeDrops} active drop{stats.activeDrops !== 1 ? "s" : ""}</span>
                    <span>·</span>
                    <span>{stats.totalViews} view{stats.totalViews !== 1 ? "s" : ""}</span>
                    {stats.liveSessions != null && stats.liveSessions > 0 && (
                        <>
                            <span>·</span>
                            <span>{stats.liveSessions} live session{stats.liveSessions !== 1 ? "s" : ""}</span>
                        </>
                    )}
                    {stats.maxBytes != null && (
                        <>
                            <span>·</span>
                            <span>{formatBytes(stats.usedBytes ?? 0)} / {formatBytes(stats.maxBytes)} used</span>
                        </>
                    )}
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
