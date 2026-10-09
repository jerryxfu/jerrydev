// SHA-256 of a file or a download, in a worker (sha256.worker.ts). Used twice: the sender's file while it uploads, stored
// with the drop; and the receiver's download, checked against it.

export interface Hashing {
    /** The hash, lowercase hex. Rejects with an AbortError once cancelled. */
    result: Promise<string>;
    cancel: () => void;
}

export function hashBlob(blob: Blob, onProgress?: (fraction: number) => void): Hashing {
    const worker = new Worker(new URL("./sha256.worker.ts", import.meta.url), {type: "module"});
    let cancel = () => worker.terminate();
    // Progress arrives every 8 MB: passed on at most ten times a second, so a big file doesn't re-render the page 2,000 times.
    let lastReport = 0;

    const result = new Promise<string>((resolve, reject) => {
        worker.onmessage = (event: MessageEvent<{ type: "progress"; done: number } | { type: "done"; hex: string }>) => {
            const data = event.data;
            if (data.type === "progress") {
                const now = performance.now();
                if (onProgress && (now - lastReport > 100 || data.done === blob.size)) {
                    lastReport = now;
                    onProgress(blob.size ? data.done / blob.size : 1);
                }
                return;
            }
            worker.terminate();
            resolve(data.hex);
        };
        worker.onerror = (event) => {
            worker.terminate();
            reject(new Error(event.message || "Hashing failed"));
        };
        cancel = () => {
            worker.terminate();
            reject(new DOMException("Aborted", "AbortError"));
        };
    });

    // Cancelling rejects; a caller that never asked for the result (an upload that failed first) shouldn't log it.
    result.catch(() => undefined);
    worker.postMessage(blob);
    return {result, cancel: () => cancel()};
}
