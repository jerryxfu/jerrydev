import React, {useEffect, useRef, useState} from "react";
import {ArrowLeft, File as FileIcon, FileText, type LucideIcon, Radio, Users} from "lucide-react";
import gsap from "gsap";
import {apiBaseUrl} from "../../main.tsx";
import "@fontsource-variable/jetbrains-mono/index.css";
import "./Expedite.scss";

import {
    DEFAULT_SETTINGS,
    type DownloadCheck,
    type DropMeta,
    type DropSettings,
    type DropType,
    EMPTY_P2P_STATUS,
    P2P_MEMORY_MAX,
    p2pReceiveMode,
    type P2PSnapshot,
    type P2PStatus,
    type UploadSnapshot,
    type ViewMode
} from "./types.ts";
import {formatBytes, saveBlob} from "./utils.ts";
import {copyText} from "@/utils.ts";
import LandingView from "./views/LandingView.tsx";
import UploadView from "./views/UploadView.tsx";
import CreatedView, {type CreatedInfo} from "./views/CreatedView.tsx";
import ResultView from "./views/ResultView.tsx";
import P2PSendView from "./views/P2PSendView.tsx";
import P2PReceiveView from "./views/P2PReceiveView.tsx";
import LiveView, {LiveBar} from "./views/LiveView.tsx";
import {useLiveRoom} from "./live/useLiveRoom.ts";
import {uploadFile} from "./uploadEngine.ts";
import {hashBlob, type Hashing} from "./sha256.ts";
import {resolveLanguage} from "./highlight.ts";
import {useFileDrag} from "./useFileDrag.ts";
import UploadProgress from "./views/UploadProgress.tsx";
import {closeSession, sendP2P} from "./p2p/sender.ts";
import {receiveP2P} from "./p2p/receiver.ts";
import Navbar from "@/components/Nav/Navbar.tsx";

// --- GSAP transition helpers ---
// With reduced motion there's none: the screen just changes.
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function animateIn(el: HTMLElement | null, delay = 0) {
    if (!el) return;
    if (reducedMotion()) {
        gsap.set(el, {opacity: 1, y: 0});
        return;
    }
    void gsap.fromTo(el,
        {opacity: 0, y: 16},
        {opacity: 1, y: 0, duration: 0.33, delay, ease: "power2.out"}
    );
}

function animateOut(el: HTMLElement | null): Promise<void> {
    if (!el || reducedMotion()) return Promise.resolve();
    return new Promise((resolve) => {
        void gsap.to(el, {
            opacity: 0, y: -12, duration: 0.2, ease: "power2.in",
            onComplete: resolve
        });
    });
}

// Each kind of drop's heading, with its icon (as on the landing page's tiles): the sender's, then the receiver's.
const TITLES: Record<DropType, { icon: LucideIcon; send: string; receive: string }> = {
    text: {icon: FileText, send: "Send text", receive: "Receive text"},
    file: {icon: FileIcon, send: "Send a file", receive: "Receive a file"},
    p2p: {icon: Radio, send: "Send directly (P2P)", receive: "Receive directly (P2P)"},
    live: {icon: Users, send: "Live room", receive: "Live room"},
};

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
    // A text drop sent as code: its highlighting language (Shiki's id), or null for plain text.
    const [textLanguage, setTextLanguage] = useState<string | null>(null);
    const [textContent, setTextContent] = useState("");
    const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
    const [result, setResult] = useState<DropMeta | null>(null);
    const [createdCode, setCreatedCode] = useState<string | null>(null);
    // What the drop just created will do, for the summary under its code.
    const [createdInfo, setCreatedInfo] = useState<CreatedInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [settings, setSettings] = useState<DropSettings>({...DEFAULT_SETTINGS});
    const [maxViewsInput, setMaxViewsInput] = useState("");

    const [uploadSnapshot, setUploadSnapshot] = useState<UploadSnapshot | null>(null);
    const uploadAbortRef = useRef<AbortController | null>(null);
    // The file's SHA-256 while it uploads: how far it's got (0 to 1), and how to stop waiting for it.
    const [hashProgress, setHashProgress] = useState<number | null>(null);
    const skipHashRef = useRef<(() => void) | null>(null);
    // A downloaded file checked against that hash.
    const [downloadCheck, setDownloadCheck] = useState<DownloadCheck | null>(null);
    const checkRef = useRef<Hashing | null>(null);

    // --- Direct P2P ---
    const [p2pStatus, setP2pStatus] = useState<P2PStatus>(freshStatus);
    const [p2pSnapshot, setP2pSnapshot] = useState<P2PSnapshot | null>(null);
    const [p2pCode, setP2pCode] = useState<string | null>(null);
    const [p2pExpiresAt, setP2pExpiresAt] = useState<string | null>(null);
    const [p2pRunning, setP2pRunning] = useState(false);
    const p2pAbortRef = useRef<AbortController | null>(null);
    const p2pCodeRef = useRef<string | null>(null);
    const p2pMode = p2pReceiveMode();
    // A drop received in memory (no save picker), kept to save again until leaving it.
    const [p2pReceived, setP2pReceived] = useState<Blob | null>(null);

    // --- Live room ---
    const live = useLiveRoom();

    const [stats, setStats] = useState<{
        activeDrops: number;
        totalViews: number;
        usedBytes?: number;
        maxBytes?: number;
        turnUsage?: { egressBytes: number; capBytes: number } | null;
    } | null>(null);

    // Once the month's Cloudflare TURN free tier is spent, the P2P screens say the relay is off. The API itself stops
    // handing out its credentials (POST /p2p/turn), so transfers go direct only. Direct transfers still work.
    const relayBlocked = stats?.turnUsage != null
        && stats.turnUsage.egressBytes >= stats.turnUsage.capBytes;

    const viewRef = useRef<HTMLDivElement>(null);
    const hasInitialized = useRef(false);

    // Animate view transitions
    useEffect(() => {
        animateIn(viewRef.current);
    }, [view, createdCode, result]);

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

    // Leaving Expedite stops whatever runs, as Cancel or Back would: an upload and its hashing (the server is told, so it
    // frees the drop), a P2P transfer, and its session (else a sender's keeps handing out an offer nobody is listening
    // for until its TTL runs out, and the other side waits to reconnect until it gives up), a download's hash check.
    // When the page goes (a closed tab, another site) as when the site moves on to another of its pages (the logo, a
    // link). The server calls use keepalive to outlive a closing page; sendBeacon can't be used because it only issues
    // POSTs. pagehide rather than beforeunload: phones often skip that.
    useEffect(() => {
        const stop = (): void => {
            uploadAbortRef.current?.abort();
            p2pAbortRef.current?.abort();
            checkRef.current?.cancel();
            if (p2pCodeRef.current) closeSession(apiBaseUrl, p2pCodeRef.current);
            p2pCodeRef.current = null;
        };
        window.addEventListener("pagehide", stop);
        return () => {
            window.removeEventListener("pagehide", stop);
            stop();
        };
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
        setP2pReceived(null);

        await animateOut(viewRef.current);
        // Out of a live room, once it has faded: the seat stays yours until the room ends, and its link opens it again.
        live.close();
        setDropType("text");
        setTextContent("");
        setTextLanguage(null);
        setSelectedFile(null);
        setRetrieveCode("");
        setResult(null);
        checkRef.current?.cancel();
        checkRef.current = null;
        setDownloadCheck(null);
        setCreatedCode(null);
        setCreatedInfo(null);
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
        if (type === "live") {
            await openRoom(live.create);
            return;
        }
        setDropType(type);
        await transitionTo(type === "p2p" ? "p2p-send" : "composing");
    };

    // A live room, made (the Live tile) or joined (its code or link): you're in it, its stream open, before it shows.
    const openRoom = async (enter: () => Promise<void>) => {
        setLoading(true);
        try {
            await enter();
            setDropType("live");
            await transitionTo("live");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Couldn't open the room");
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        setLoading(true);
        setError(null);

        // Text: inline JSON
        if (dropType === "text") {
            try {
                const res = await fetch(`${apiBaseUrl}/expedite/drop/text`, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        text: textContent,
                        // Sent as code: Auto is resolved to what it sees in the text now.
                        ...(textLanguage ? {language: resolveLanguage(textLanguage, textContent)} : {}),
                        deletable: settings.deletable,
                        maxViews: settings.maxViews,
                        ttlMs: settings.ttlMs,
                    })
                });

                // Null when the answer isn't the API's JSON (a proxy's error page).
                const json = await res.json().catch(() => null);

                if (!res.ok) {
                    setError(json?.error?.message || `Upload failed (HTTP ${res.status})`);
                    return;
                }
                setCreatedCode(json.data.code);
                setCreatedInfo({type: "text", expiresAt: json.data.expiresAt, maxViews: settings.maxViews, deletable: settings.deletable});
                await transitionTo("created");
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Upload failed");
            } finally {
                setLoading(false);
            }
            return;
        }

        // File: the presigned engine (single or multipart), straight to R2
        if (!selectedFile) {
            setError("No file selected");
            setLoading(false);
            return;
        }
        const controller = new AbortController();
        uploadAbortRef.current = controller;
        setUploadSnapshot(null);
        // The file's SHA-256, alongside the upload. The upload waits for it at the end, unless the sender skips it.
        setHashProgress(0);
        const hashing = hashBlob(selectedFile, setHashProgress);
        let skip = () => {
        };
        const skipped = new Promise<null>((resolve) => {
            skip = () => resolve(null);
        });
        skipHashRef.current = () => {
            hashing.cancel();
            skip();
        };
        controller.signal.addEventListener("abort", () => hashing.cancel());
        const hash = () => Promise.race([hashing.result.catch(() => null), skipped]);
        try {
            const meta = await uploadFile(selectedFile, settings, apiBaseUrl, setUploadSnapshot, controller.signal, hash);
            setCreatedCode(meta.code);
            setCreatedInfo({type: "file", expiresAt: meta.expiresAt, maxViews: meta.maxViews, deletable: meta.deletable});
            await transitionTo("created");
        } catch (err: unknown) {
            // AbortError = user cancelled; stay on the form silently
            if ((err as Error).name !== "AbortError") {
                setError(err instanceof Error ? err.message : "Upload failed");
            }
        } finally {
            hashing.cancel();
            skipHashRef.current = null;
            setHashProgress(null);
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
            // Null when the answer isn't the API's JSON (a proxy's error page): its 404s always are.
            const json = await res.json().catch(() => null);

            if (!res.ok) {
                setError(json?.error?.message || `Expedite didn't answer (HTTP ${res.status}). Try again.`);
                return;
            }

            const meta = json.data as DropMeta;
            if (meta.type === "live") {
                setLoading(false);
                await openRoom(() => live.join(meta.code));
                return;
            }
            setResult(meta);
            setDownloadCheck(null);
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
        } catch {
            // A failure is shown in the progress (the status's error, with its technical part), so not here as well.
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
        if (!result?.offer || p2pMode === "none" || (p2pMode === "memory" && result.size > P2P_MEMORY_MAX)) return;
        setError(null);
        const fileName = result.fileName ?? `expedite-${result.code}`;

        // showSaveFilePicker must be the first await in this handler for the user gesture, and any prior await would spend it.
        // Without it (Firefox, Safari), the file is kept in memory and saved once complete.
        let handle: FileSystemFileHandle | null = null;
        if (window.showSaveFilePicker) {
            try {
                handle = await window.showSaveFilePicker({suggestedName: fileName});
            } catch (err: unknown) {
                // Dismissing the picker isn't an error worth reporting.
                if ((err as Error).name !== "AbortError") {
                    setError(err instanceof Error ? err.message : "Could not open save location");
                }
                return;
            }
        }

        setP2pSnapshot(null);
        setP2pStatus(freshStatus());
        setP2pRunning(true);

        const controller = new AbortController();
        p2pAbortRef.current = controller;
        // Ended when this side stops, as the sender's is: the sender's reconnect then finds no session and stops at once.
        p2pCodeRef.current = result.code;

        try {
            const received = await receiveP2P({
                code: result.code,
                offer: result.offer,
                fileName,
                fileSize: result.size,
                handle,
                apiBaseUrl,
                signal: controller.signal,
                onStatus: setP2pStatus,
                onSnapshot: setP2pSnapshot,
            });
            // Received in memory: to the downloads, as any download (Safari may ask first). Kept for Save again.
            if (received) {
                setP2pReceived(received);
                saveBlob(received, fileName);
            }
        } catch {
            // A failure is shown in the progress (the status's error, with its technical part), so not here as well.
        } finally {
            p2pAbortRef.current = null;
            if (p2pCodeRef.current) {
                closeSession(apiBaseUrl, p2pCodeRef.current);
                p2pCodeRef.current = null;
            }
        }
    };

    const handleDownload = async () => {
        if (!result) return;

        // Text: build blob locally
        if (result.type === "text" && result.text) {
            saveBlob(new Blob([result.text], {type: "text/plain"}), `expedite-${result.code}.txt`);
            return;
        }

        if (!result.fileUrl) return;

        // A file: the browser's own downloader takes it (to disk, with its progress), from the link R2 answers as an
        // attachment under the file's name. Its first byte is read here first, to know the link still works: after the
        // drop expires, or once it's deleted, R2 answers with an error page, which the browser would show or save.
        setError(null);
        try {
            const res = await fetch(result.fileUrl, {headers: {Range: "bytes=0-0"}});
            if (!res.ok) {
                setError("This file is no longer available: the drop has expired or was deleted.");
                return;
            }
        } catch { /* not reachable from the page (offline, CORS): the browser tries for itself */
        }
        if (result.downloadUrl) {
            const a = document.createElement("a");
            a.href = result.downloadUrl;
            a.click();
        } else {
            window.open(result.fileUrl, "_blank"); // an API without the attachment link
        }
    };

    // A copy of the file, picked on this device, checked against the drop's SHA-256. A new check replaces one under way.
    const checkCopy = (blob: Blob) => {
        const expected = result?.sha256;
        if (!expected) return;
        checkRef.current?.cancel();
        const hashing = hashBlob(blob, (progress) => {
            if (checkRef.current === hashing) setDownloadCheck({state: "checking", progress});
        });
        checkRef.current = hashing;
        setDownloadCheck({state: "checking", progress: 0});
        hashing.result
            .then((hex) => {
                if (checkRef.current === hashing) setDownloadCheck({state: hex === expected ? "match" : "mismatch"});
            })
            .catch(() => {
                if (checkRef.current === hashing) setDownloadCheck(null);
            });
    };

    const handleDelete = async () => {
        if (!result || !result.deletable) return;
        setError(null);
        try {
            const res = await fetch(`${apiBaseUrl}/expedite/drop/${result.code}`, {method: "DELETE"});
            // Already gone (404: it expired, or someone deleted it first) is as good as deleted. Anything else failed,
            // and saying nothing would pass the drop for deleted.
            if (!res.ok && res.status !== 404) {
                setError("The drop couldn't be deleted. Try again.");
                return;
            }
            await reset();
        } catch {
            setError("The drop couldn't be deleted. Check your connection and try again.");
        }
    };

    const copyToClipboard = async (text: string, field: string, e?: React.MouseEvent) => {
        // Read before waiting: React clears it once the click is handled.
        const btn = e?.currentTarget as HTMLElement | null;
        // Green and "Copied" only once it's really copied.
        if (!await copyText(text)) return;

        if (btn) {
            btn.classList.add("expedite_btn--success");
            setTimeout(() => btn.classList.remove("expedite_btn--success"), 1500);
        }
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleMaxViewsChange = (val: string) => {
        setMaxViewsInput(val);
        const num = parseInt(val, 10);
        setSettings(s => ({...s, maxViews: (num > 0) ? num : null}));
    };

    // Files are taken where they're dropped on purpose: the landing's File and Direct P2P tiles, and the file zones on
    // those screens. Anywhere else the page refuses them, or the browser would open the file in place of Expedite (and a
    // stray drop used to switch screens, even mid-transfer). While one is dragged over the page, the landing shows
    // where it can go. In a live room, the whole page takes them, for your box.
    const pageDrag = useFileDrag(view === "live" ? (_, files) => live.postFiles(files) : undefined);

    // A file dropped on the landing's File or Direct P2P tile: that screen, with the file chosen.
    const handleDropFile = async (type: "file" | "p2p", file: globalThis.File) => {
        setSelectedFile(file);
        await handleSelect(type);
    };

    // Someone receiving a drop came for it, not for the site: no navbar on those screens. Nor in a live room, which wants
    // the screen's height for its boxes.
    const receiving = view === "result" || view === "p2p-receive";
    const bare = receiving || view === "live";
    // The kind of drop on screen, whose heading it shows: the sender's while it's written and once it's made, the
    // receiver's when it's received. The landing page is Expedite itself.
    const kind: DropType | null =
        view === "composing" || view === "created" ? dropType
            : view === "p2p-send" ? "p2p"
                : view === "live" ? "live"
                    : receiving && result ? result.type
                        : null;
    const title = kind ? TITLES[kind] : null;

    return (
        <div
            className={`expedite${bare ? " expedite--bare" : ""}${view === "live" ? " expedite--live" : ""}`}
            {...pageDrag.handlers}
        >
            {!bare && (
                <>
                    <Navbar isShrunk={true} />
                    <div className="nav-spacer" />
                </>
            )}

            {/* A P2P session under way is one column, at the narrower width it always had (Jerry: much better so). A live
                room is wider, for five boxes side by side. */}
            <div
                className={`expedite_container${(view === "p2p-send" || view === "p2p-receive") && p2pRunning ? " expedite_container--narrow" : ""}${view === "live" ? " expedite_container--wide" : ""}`}>
                {/* A live room's bar is part of the header: beside the title on a laptop, under it on a phone. */}
                <header className={`expedite_header${view === "live" ? " expedite_header--live" : ""}`}>
                    {view !== "landing" && (
                        <button className="expedite_back" onClick={reset}>
                            <ArrowLeft size={16} />
                            <span>Back</span>
                        </button>
                    )}
                    {title ? (
                        <h1 className="expedite_title" data-kind={kind ?? undefined}>
                            <title.icon size={30} strokeWidth={1.6} aria-hidden />
                            {receiving ? title.receive : title.send}
                        </h1>
                    ) : (
                        <h1>Expedite 📦</h1>
                    )}
                    {view === "live" && <LiveBar live={live} copiedField={copiedField} onCopy={copyToClipboard} onExit={reset} />}
                    {view === "landing" && (
                        <p className="caption-text">
                            Share files and text snippets instantaneously! Pick an option below, or drop a file on this page. Terminal
                            commands work too.
                        </p>
                    )}
                </header>

                {/* Views */}
                <div ref={viewRef}>
                    {view === "landing" && (
                        <LandingView
                            onSelect={handleSelect}
                            onDropFile={handleDropFile}
                            dragging={pageDrag.over}
                            code={retrieveCode}
                            setCode={setRetrieveCode}
                            error={error}
                            loading={loading}
                            onRetrieve={() => retrieveDrop()}
                            p2pMode={p2pMode}
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                        />
                    )}

                    {view === "composing" && (
                        <UploadView
                            dropType={dropType}
                            textContent={textContent}
                            setTextContent={setTextContent}
                            language={textLanguage}
                            setLanguage={setTextLanguage}
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
                            progress={uploadSnapshot && (
                                <UploadProgress
                                    snapshot={uploadSnapshot}
                                    hashProgress={hashProgress}
                                    onSkipHash={() => skipHashRef.current?.()}
                                />
                            )}
                        />
                    )}

                    {view === "created" && createdCode && (
                        <CreatedView
                            code={createdCode}
                            info={createdInfo}
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                            onDone={reset}
                        />
                    )}

                    {view === "p2p-send" && (
                        <P2PSendView
                            selectedFile={selectedFile}
                            setSelectedFile={setSelectedFile}
                            code={p2pCode}
                            expiresAt={p2pExpiresAt}
                            status={p2pStatus}
                            snapshot={p2pSnapshot}
                            running={p2pRunning}
                            error={error}
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                            relayDisabled={relayBlocked}
                            onStart={() => void startP2PSend()}
                            onCancel={reset}
                        />
                    )}

                    {view === "p2p-receive" && result && (
                        <P2PReceiveView
                            meta={result}
                            mode={p2pMode}
                            status={p2pStatus}
                            snapshot={p2pSnapshot}
                            running={p2pRunning}
                            error={error}
                            relayDisabled={relayBlocked}
                            onAccept={acceptP2PReceive}
                            onSave={p2pReceived ? () => saveBlob(p2pReceived, result.fileName ?? `expedite-${result.code}`) : undefined}
                            onCancel={reset}
                        />
                    )}

                    {view === "live" && (
                        <LiveView live={live} copiedField={copiedField} onCopy={copyToClipboard} onExit={reset} dragging={pageDrag.over} />
                    )}

                    {view === "result" && result && (
                        <ResultView
                            result={result}
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                            error={error}
                            downloadCheck={downloadCheck}
                            onDownload={handleDownload}
                            onCheckCopy={checkCopy}
                            onDelete={handleDelete}
                        />
                    )}
                </div>
            </div>

            <div className="expedite_spacer" />
            {/* Not in a live room: its boxes take the room. */}
            {stats && view !== "live" && (
                <div className="expedite_stats">
                    <span>{stats.activeDrops} active drop{stats.activeDrops !== 1 ? "s" : ""}</span>
                    <span>·</span>
                    <span>{stats.totalViews} view{stats.totalViews !== 1 ? "s" : ""}</span>
                    {stats.maxBytes != null && (
                        <>
                            <span>·</span>
                            <span>{formatBytes(stats.usedBytes ?? 0)}&#8239;/&#8239;{formatBytes(stats.maxBytes)} used</span>
                        </>
                    )}
                    {stats.turnUsage != null && (
                        <>
                            <span>·</span>
                            {/* Decimal GB, matching how Cloudflare meters the free tier */}
                            <span>
                                {(stats.turnUsage.egressBytes / 1e9).toFixed(1)}&#8239;/&#8239;{(stats.turnUsage.capBytes / 1e9).toFixed(0)}&#8239;GB relayed
                            </span>
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
