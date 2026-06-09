import {type DropMeta, type DropSettings, type PartProgress, type UploadSnapshot} from "./types.ts";

const CONCURRENCY = 4;
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [2000, 5000, 10000];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Resolve when back online (or after maxMs) to gives brief-disconnect recovery
function waitForOnline(maxMs: number): Promise<void> {
    if (navigator.onLine) return Promise.resolve();
    return new Promise((resolve) => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            window.removeEventListener("online", finish);
            clearTimeout(timer);
            resolve();
        };
        const timer = setTimeout(finish, maxMs);
        window.addEventListener("online", finish);
    });
}

// PUT a blob to a presigned URL with upload-progress; resolves with the part's ETag
function putWithProgress(
    url: string, body: Blob, contentType: string | null,
    onLoaded: (n: number) => void, signal: AbortSignal
): Promise<string> {
    return new Promise((resolve, reject) => {
        if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));

        const xhr = new XMLHttpRequest();
        xhr.open("PUT", url);
        if (contentType) xhr.setRequestHeader("Content-Type", contentType);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onLoaded(e.loaded);
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const etag = xhr.getResponseHeader("ETag");
                if (!etag) {
                    reject(new Error("Missing ETag — check R2 CORS ExposeHeaders includes ETag"));
                    return;
                }
                resolve(etag);
            } else {
                reject(new Error(`Upload failed: HTTP ${xhr.status}`));
            }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.ontimeout = () => reject(new Error("Timed out"));
        xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));

        const onAbort = () => xhr.abort();
        signal.addEventListener("abort", onAbort, {once: true});
        xhr.send(body);
    });
}

async function abortUpload(apiBaseUrl: string, code: string): Promise<void> {
    // No signal, this runs because the main signal aborted; must still reach the server
    try {
        await fetch(`${apiBaseUrl}/expedite/drop/${code}`, {method: "DELETE"});
    } catch { /* best-effort; R2 lifecycle reaps orphaned parts anyway */
    }
}

async function finalize(
    apiBaseUrl: string, code: string,
    parts: { partNumber: number; etag: string }[],
    settings: DropSettings, signal: AbortSignal
): Promise<DropMeta> {
    const res = await fetch(`${apiBaseUrl}/expedite/drop/file/complete`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({code, parts, ttlMs: settings.ttlMs}),
        signal
    });
    const json = await res.json();
    if (!res.ok || !json._success) throw new Error(json?.error?.message || "Failed to finalize upload");
    const d = json.data;
    return {
        code: d.code, type: "file",
        fileName: d.fileName, mimeType: d.mimeType, size: d.size,
        createdAt: d.createdAt, expiresAt: d.expiresAt,
        views: 0, maxViews: settings.maxViews ?? null, deletable: settings.deletable
    } as DropMeta;
}

/**
 * Upload a file to Expedite. Handles both single-PUT (small) and multipart (large),
 * with a parallel pool, per-part retry, and brief-disconnect resilience.
 * onProgress fires throttled (~10/s) plus on every state change.
 * Pass an AbortSignal; aborting cancels in-flight parts and tells the server to clean up.
 */
export async function uploadFile(
    file: File,
    settings: DropSettings,
    apiBaseUrl: string,
    onProgress: (s: UploadSnapshot) => void,
    signal: AbortSignal
): Promise<DropMeta> {
    const contentType = file.type || "application/octet-stream";

    // 1. init — reserve space, get upload instructions
    const initRes = await fetch(`${apiBaseUrl}/expedite/drop/file/init`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            mimeType: contentType,
            deletable: settings.deletable,
            maxViews: settings.maxViews,
            ttlMs: settings.ttlMs
        }),
        signal
    });
    const initJson = await initRes.json();
    if (!initRes.ok || !initJson._success) {
        throw new Error(initJson?.error?.message || "Failed to start upload");
    }
    const data = initJson.data;
    const code: string = data.code;

    // progress plumbing
    const parts: PartProgress[] = [];
    let lastEmit = 0;
    const emit = (force = false) => {
        const now = Date.now();
        if (!force && now - lastEmit < 100) return;
        lastEmit = now;
        onProgress({
            mode: data.mode,
            parts: parts.map((p) => ({...p})),
            uploadedBytes: parts.reduce((s, p) => s + p.loaded, 0),
            totalBytes: file.size
        });
    };

    try {
        if (data.mode === "single") {
            parts.push({partNumber: 1, state: "uploading", loaded: 0, total: file.size});
            emit(true);
            await putWithProgress(data.uploadUrl, file, contentType,
                (loaded) => {
                    parts[0].loaded = loaded;
                    emit();
                }, signal);
            parts[0].loaded = file.size;
            parts[0].state = "done";
            emit(true);
            return await finalize(apiBaseUrl, code, [], settings, signal);
        }

        // multipart
        const partSize: number = data.partSize;
        const partUrls: { partNumber: number; url: string }[] = data.partUrls;
        const etags = new Map<number, string>();

        for (const pu of partUrls) {
            const start = (pu.partNumber - 1) * partSize;
            const end = Math.min(start + partSize, file.size);
            parts.push({partNumber: pu.partNumber, state: "queued", loaded: 0, total: end - start});
        }
        emit(true);

        const uploadOne = async (pu: { partNumber: number; url: string }) => {
            const p = parts[pu.partNumber - 1];
            const start = (pu.partNumber - 1) * partSize;
            const end = Math.min(start + partSize, file.size);
            const blob = file.slice(start, end);

            for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                if (signal.aborted) throw new DOMException("Aborted", "AbortError");
                try {
                    p.state = "uploading";
                    p.loaded = 0;
                    emit(true);
                    const etag = await putWithProgress(pu.url, blob, null,
                        (loaded) => {
                            p.loaded = loaded;
                            emit();
                        }, signal);
                    p.loaded = end - start;
                    p.state = "done";
                    emit(true);
                    etags.set(pu.partNumber, etag);
                    return;
                } catch (err) {
                    if (signal.aborted || (err as Error).name === "AbortError") throw err;
                    if (attempt === MAX_ATTEMPTS) {
                        p.state = "failed";
                        emit(true);
                        throw err;
                    }
                    p.state = "retrying";
                    p.loaded = 0;
                    emit(true);
                    if (!navigator.onLine) await waitForOnline(30_000);
                    await sleep(BACKOFF_MS[attempt - 1] ?? 10_000);
                }
            }
        };

        // parallel pool (shared cursor; single-threaded JS so nextIdx++ is safe)
        let nextIdx = 0;
        const worker = async () => {
            while (true) {
                if (signal.aborted) throw new DOMException("Aborted", "AbortError");
                const i = nextIdx++;
                if (i >= partUrls.length) return;
                await uploadOne(partUrls[i]);
            }
        };
        await Promise.all(
            Array.from({length: Math.min(CONCURRENCY, partUrls.length)}, () => worker())
        );

        const ordered = [...etags.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([partNumber, etag]) => ({partNumber, etag}));
        return await finalize(apiBaseUrl, code, ordered, settings, signal);

    } catch (err) {
        // Any failure or cancellation: tell the server to abort + free the reservation
        await abortUpload(apiBaseUrl, code);
        throw err;
    }
}