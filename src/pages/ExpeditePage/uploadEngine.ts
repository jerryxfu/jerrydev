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
                    reject(new Error("Missing ETag: check that R2's CORS ExposeHeaders includes ETag"));
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
        // However it ends: the signal outlives this part, and would keep every part's request.
        xhr.onloadend = () => signal.removeEventListener("abort", onAbort);
        xhr.send(body);
    });
}

async function abortUpload(apiBaseUrl: string, code: string): Promise<void> {
    // No signal, this runs because the main signal aborted; must still reach the server, even from a page that's closing
    // (keepalive: Expedite aborts the upload when the tab closes).
    try {
        await fetch(`${apiBaseUrl}/expedite/drop/${code}`, {method: "DELETE", keepalive: true});
    } catch { /* best-effort; R2 lifecycle reaps orphaned parts anyway */
    }
}

async function finalize(
    apiBaseUrl: string, code: string,
    parts: { partNumber: number; etag: string }[],
    settings: DropSettings, sha256: string | null, signal: AbortSignal
): Promise<DropMeta> {
    const res = await fetch(`${apiBaseUrl}/expedite/drop/file/complete`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({code, parts, ttlMs: settings.ttlMs, ...(sha256 ? {sha256} : {})}),
        signal
    });
    // Null when the answer isn't the API's JSON (a proxy's error page).
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error?.message || `Failed to finalize upload (HTTP ${res.status})`);
    const d = json.data;
    return {
        code: d.code, type: "file",
        fileName: d.fileName, mimeType: d.mimeType, size: d.size,
        createdAt: d.createdAt, expiresAt: d.expiresAt,
        views: 0, maxViews: settings.maxViews ?? null, deletable: settings.deletable,
        ...(sha256 ? {sha256} : {}),
    } as DropMeta;
}

/**
 * Upload a file to Expedite. Handles both single-PUT (small) and multipart (large),
 * with a parallel pool, per-part retry, and brief-disconnect resilience.
 * onProgress fires throttled (~10/s) plus on every state change.
 * Pass an AbortSignal; aborting cancels in-flight parts and tells the server to clean up.
 * `hash`, when given, is awaited once the bytes are up: the file's SHA-256, or null if the sender skipped it.
 */
export async function uploadFile(
    file: File,
    settings: DropSettings,
    apiBaseUrl: string,
    onProgress: (s: UploadSnapshot) => void,
    signal: AbortSignal,
    hash?: () => Promise<string | null>
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
    const initJson = await initRes.json().catch(() => null);
    if (!initRes.ok) {
        throw new Error(initJson?.error?.message || `Failed to start upload (HTTP ${initRes.status})`);
    }
    const data = initJson.data;
    const code: string = data.code;

    try {
        const parts = await putToR2(file, data, onProgress, signal);
        return await finalize(apiBaseUrl, code, parts, settings, hash ? await hash() : null, signal);
    } catch (err) {
        // Any failure or cancellation: tell the server to abort + free the reservation
        await abortUpload(apiBaseUrl, code);
        throw err;
    }
}

/** How the API says a file goes up: one signed PUT, or a multipart upload's signed part links. */
export type UploadPlan =
    | { mode: "single"; uploadUrl: string }
    | { mode: "multipart"; partSize: number; partUrls: { partNumber: number; url: string }[] };

/**
 * Puts a file into R2 by the API's signed links: a file drop's, or a live room's file. Resolves with the parts' ETags
 * in order, which the API needs to finish a multipart upload (none for a single PUT). Telling the API it's done, or
 * that it was given up, is the caller's.
 */
export async function putToR2(
    file: File,
    plan: UploadPlan,
    onProgress: (s: UploadSnapshot) => void,
    signal: AbortSignal
): Promise<{ partNumber: number; etag: string }[]> {
    const contentType = file.type || "application/octet-stream";

    // progress plumbing
    const parts: PartProgress[] = [];
    let lastEmit = 0;
    const emit = (force = false) => {
        const now = Date.now();
        if (!force && now - lastEmit < 100) return;
        lastEmit = now;
        onProgress({
            mode: plan.mode,
            parts: parts.map((p) => ({...p})),
            uploadedBytes: parts.reduce((s, p) => s + p.loaded, 0),
            totalBytes: file.size
        });
    };

    if (plan.mode === "single") {
        const only: PartProgress = {partNumber: 1, state: "uploading", loaded: 0, total: file.size};
        parts.push(only);
        emit(true);
        await putWithProgress(plan.uploadUrl, file, contentType,
            (loaded) => {
                only.loaded = loaded;
                emit();
            }, signal);
        only.loaded = file.size;
        only.state = "done";
        emit(true);
        return [];
    }

    // multipart
    const {partSize, partUrls} = plan;
    const etags = new Map<number, string>();
    // Stops every part: the caller's cancel, or a part that failed for good (the others would go on sending, unseen, to
    // an upload the caller is about to give up).
    const stop = new AbortController();
    const upload = AbortSignal.any([signal, stop.signal]);

    for (const pu of partUrls) {
        const start = (pu.partNumber - 1) * partSize;
        const end = Math.min(start + partSize, file.size);
        parts.push({partNumber: pu.partNumber, state: "queued", loaded: 0, total: end - start});
    }
    emit(true);

    const uploadOne = async (pu: { partNumber: number; url: string }) => {
        const p = parts[pu.partNumber - 1];
        if (!p) throw new Error(`No progress slot for part ${pu.partNumber}`);
        const start = (pu.partNumber - 1) * partSize;
        const end = Math.min(start + partSize, file.size);
        const blob = file.slice(start, end);

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            if (upload.aborted) throw new DOMException("Aborted", "AbortError");
            try {
                p.state = "uploading";
                p.loaded = 0;
                emit(true);
                const etag = await putWithProgress(pu.url, blob, null,
                    (loaded) => {
                        p.loaded = loaded;
                        emit();
                    }, upload);
                p.loaded = end - start;
                p.state = "done";
                emit(true);
                etags.set(pu.partNumber, etag);
                return;
            } catch (err) {
                if (upload.aborted || (err as Error).name === "AbortError") throw err;
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
            if (upload.aborted) throw new DOMException("Aborted", "AbortError");
            const pu = partUrls[nextIdx++];
            if (!pu) return;
            await uploadOne(pu);
        }
    };
    try {
        await Promise.all(
            Array.from({length: Math.min(CONCURRENCY, partUrls.length)}, () => worker())
        );
    } finally {
        stop.abort();
    }

    return [...etags.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([partNumber, etag]) => ({partNumber, etag}));
}