import {EMPTY_P2P_STATUS, type P2PSnapshot, type P2PStatus} from "../types.ts";
import {
    buildIceServers,
    countCandidates,
    createPeer,
    createRateMeter,
    CTRL_DONE,
    CTRL_EOF,
    describeCandidates,
    describeIceFailure,
    GATHER_TIMEOUT_MS,
    GATHER_TIMEOUT_TURN_MS,
    P2PError,
    readSelectedPair,
    SNAPSHOT_INTERVAL_MS,
    totalCandidates,
    waitForGathering,
} from "./peer.ts";

export interface ReceiveOptions {
    code: string;
    offer: string;
    fileName: string;
    fileSize: number;
    /**
     * Acquired from showSaveFilePicker inside the click gesture, before this runs. Null where there's no picker (Firefox,
     * Safari): the file is kept in memory and handed back.
     */
    handle: FileSystemFileHandle | null;
    apiBaseUrl: string;
    /** Offer the relay beside the direct routes. Off only once the month's relay quota is spent. */
    useTurn: boolean;
    onStatus: (status: P2PStatus) => void;
    onSnapshot: (snapshot: P2PSnapshot) => void;
    signal: AbortSignal;
}

/** How long to wait for the sender's data channel after posting the answer. */
const CHANNEL_TIMEOUT_MS = 30_000;

/** How long CTRL_DONE gets to reach the sender before this side closes anyway. */
const DONE_GRACE_MS = 5_000;

/** In memory, the chunks are copied into a Blob every this many bytes. */
const MEMORY_BLOCK_BYTES = 16 * 1024 * 1024;

/** Where the file is written as it arrives: the picked file on disk, or memory. */
interface Sink {
    write(data: ArrayBuffer): Promise<void>;

    close(): Promise<void>;

    abort(): Promise<void>;
}

/**
 * Receive a file over a direct data channel, streaming straight to disk.
 *
 * With a handle, every chunk goes to a FileSystemWritableFileStream, so nothing
 * accumulates in memory and there is no practical size ceiling. Without one, the
 * file is kept in memory (memorySink) and returned once complete, for the page
 * to save; the page only does that up to P2P_MEMORY_MAX.
 */
export async function receiveP2P(opts: ReceiveOptions): Promise<Blob | null> {
    const {
        code, offer, fileName, fileSize, handle,
        apiBaseUrl, useTurn, onStatus, onSnapshot, signal,
    } = opts;

    const status: P2PStatus = {...EMPTY_P2P_STATUS, candidates: {...EMPTY_P2P_STATUS.candidates}};
    const emit = (patch: Partial<P2PStatus>): void => {
        // Record where a failure happened before the phase is overwritten, so
        // the UI can mark the ladder chip the transfer died on.
        if (patch.phase === "failed" && status.phase !== "failed" && status.failedAt == null) {
            patch.failedAt = status.phase;
        }
        Object.assign(status, patch);
        onStatus({...status, candidates: {...status.candidates}});
    };

    let pc: RTCPeerConnection | null = null;
    let writable: Sink | null = null;
    let memory: ReturnType<typeof memorySink> | null = null;
    let statsTimer = 0;

    let received = 0;
    let chunks = 0;
    let observedChunkSize = 0;

    const meter = createRateMeter();
    let lastEmit = 0;
    let startedAt = 0;

    const snapshot = (force = false): void => {
        const at = Date.now();
        if (!force && at - lastEmit < SNAPSHOT_INTERVAL_MS) return;
        lastEmit = at;

        meter.push(received, at);
        onSnapshot({
            fileName,
            transferredBytes: received,
            totalBytes: fileSize,
            chunks,
            chunkSize: observedChunkSize,
            // Receiving writes straight through to disk; nothing is held back.
            bufferedAmount: 0,
            speedBps: meter.bps,
            elapsedMs: startedAt ? at - startedAt : 0,
        });
    };

    try {
        // A candidate-less offer can never connect, so refuse it before minting
        // TURN credentials or gathering anything of our own.
        const remoteCandidates = countCandidates(offer);
        emit({remoteCandidates});
        if (totalCandidates(remoteCandidates) === 0) {
            throw new P2PError("Sender's offer contains no network routes — ask them to retry (their browser gathered zero ICE candidates)");
        }

        emit({phase: "gathering", detail: "resolving ICE servers"});

        const {servers, turnError} = await buildIceServers(apiBaseUrl, useTurn, signal);
        if (turnError) emit({detail: `${turnError} — continuing with STUN only`});

        pc = createPeer(servers);

        // Channel arrives from the sender; capture it before the answer goes out
        // so there is no window where it could fire unobserved.
        const channelPromise = waitForRemoteChannel(pc, status, signal);

        await pc.setRemoteDescription({type: "offer", sdp: offer});

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        emit({phase: "gathering", detail: "gathering ICE candidates"});
        // Relay allocation is slower than host/srflx; only wait longer when a
        // relay is actually expected.
        await waitForGathering(pc, useTurn && !turnError ? GATHER_TIMEOUT_TURN_MS : GATHER_TIMEOUT_MS);
        throwIfAborted(signal);

        const localSdp = pc.localDescription?.sdp;
        if (!localSdp) throw new P2PError("No local description after ICE gathering");

        const candidates = countCandidates(localSdp);
        emit({candidates, detail: describeCandidates(candidates)});

        // Claiming the session is first-answer-wins and consumes the code, so
        // an unusable answer must never be posted: abort before the claim and
        // the sender's code stays live for a receiver that can actually connect.
        if (totalCandidates(candidates) === 0) {
            throw new P2PError("No network routes gathered — check VPN, firewall, or this browser's Local Network permission");
        }

        // --- Publish the answer ---
        emit({phase: "signalling", detail: `POST /p2p/${code}/answer`});

        const res = await fetch(`${apiBaseUrl}/expedite/p2p/${code}/answer`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({answer: localSdp}),
            signal,
        });
        const json = await res.json();
        if (!res.ok) {
            throw new P2PError(json?.error?.message ?? `Answer rejected (HTTP ${res.status})`);
        }

        emit({phase: "negotiating", detail: "answer posted · awaiting data channel"});
        watchIce(pc, status, emit);

        const channel = await channelPromise;
        throwIfAborted(signal);

        emit({
            phase: "connected",
            maxMessageSize: pc.sctp?.maxMessageSize ?? null,
            detail: `data channel open · writing to ${fileName}`,
        });
        await refreshPair(pc, emit);

        // Open the sink only once bytes are actually about to flow, so a failed
        // negotiation doesn't leave a zero-byte file sitting on disk.
        writable = handle ? await handle.createWritable() : (memory = memorySink());

        emit({phase: "transferring", detail: `receiving ${fileName}`});
        startedAt = Date.now();
        snapshot(true);

        statsTimer = window.setInterval(() => {
            void refreshPair(pc!, emit);
            snapshot();
        }, 1000);

        await drainChannel(channel, {
            fileSize,
            signal,
            onChunk: async (buffer) => {
                await writable!.write(buffer);
                received += buffer.byteLength;
                chunks += 1;
                if (buffer.byteLength > observedChunkSize) observedChunkSize = buffer.byteLength;
                snapshot(); // self-throttling
            },
        });

        snapshot(true);
        await writable.close();
        writable = null;

        if (received !== fileSize) {
            throw new P2PError(`Size mismatch — expected ${fileSize} B, wrote ${received} B`);
        }

        if (channel.readyState === "open") channel.send(CTRL_DONE);

        emit({phase: "done", degraded: false, detail: `${fileName} written · ${received} B`});

        // Closing at once could cut CTRL_DONE off before it leaves, and the sender only counts the file delivered once
        // it hears it. The sender closes the channel when it does.
        await waitForClose(channel, DONE_GRACE_MS, signal);
        return memory?.blob() ?? null;
    } catch (err: unknown) {
        // Abort the sink so a partial file is discarded rather than left behind
        // looking like a complete download.
        if (writable) {
            try {
                await writable.abort();
            } catch {
                // nothing useful to do
            }
        }

        if ((err as Error)?.name !== "AbortError") {
            const message = err instanceof Error ? err.message : String(err);
            emit({phase: "failed", error: message, detail: message});
        }

        throw err;
    } finally {
        if (statsTimer) window.clearInterval(statsTimer);
        try {
            pc?.close();
        } catch {
            // already closed
        }
    }
}

// --- Channel handling ---

function waitForRemoteChannel(pc: RTCPeerConnection, status: P2PStatus, signal: AbortSignal): Promise<RTCDataChannel> {
    return new Promise((resolve, reject) => {
        const cleanup = (): void => {
            pc.removeEventListener("datachannel", onChannel);
            pc.removeEventListener("iceconnectionstatechange", onIce);
            signal.removeEventListener("abort", onAbort);
            window.clearTimeout(timer);
        };
        // ICE failure is definitive: reject now rather than sitting out the
        // 30s channel timeout on a connection that can no longer produce one.
        const onIce = (): void => {
            if (pc.iceConnectionState === "failed") {
                cleanup();
                reject(new P2PError(describeIceFailure(pc, status)));
            }
        };
        const onChannel = (ev: RTCDataChannelEvent): void => {
            const channel = ev.channel;
            channel.binaryType = "arraybuffer";
            if (channel.readyState === "open") {
                cleanup();
                resolve(channel);
                return;
            }
            channel.addEventListener("open", () => {
                cleanup();
                resolve(channel);
            }, {once: true});
        };
        const onAbort = (): void => {
            cleanup();
            reject(new DOMException("Cancelled", "AbortError"));
        };
        const timer = window.setTimeout(() => {
            cleanup();
            reject(new P2PError(`No data channel after ${CHANNEL_TIMEOUT_MS / 1000}s — sender unreachable`));
        }, CHANNEL_TIMEOUT_MS);

        pc.addEventListener("datachannel", onChannel);
        pc.addEventListener("iceconnectionstatechange", onIce);
        signal.addEventListener("abort", onAbort);
    });
}

/**
 * The file kept in memory, where there's no save picker. The chunks are copied into a Blob every MEMORY_BLOCK_BYTES, so
 * they can go: memory stays near the file's size, where one Blob of every chunk at the end would briefly hold it twice.
 */
function memorySink(): Sink & { blob: () => Blob } {
    const blocks: Blob[] = [];
    let chunks: ArrayBuffer[] = [];
    let bytes = 0;
    const flush = (): void => {
        if (chunks.length === 0) return;
        blocks.push(new Blob(chunks));
        chunks = [];
        bytes = 0;
    };
    return {
        write: async (data) => {
            chunks.push(data);
            bytes += data.byteLength;
            if (bytes >= MEMORY_BLOCK_BYTES) flush();
        },
        close: async () => flush(),
        abort: async () => {
            blocks.length = 0;
            chunks = [];
        },
        // A Blob of Blobs refers to them, without copying.
        blob: () => new Blob(blocks),
    };
}

/** Resolve once the channel closes, after `ms`, or on abort, whichever comes first. */
function waitForClose(channel: RTCDataChannel, ms: number, signal: AbortSignal): Promise<void> {
    if (channel.readyState === "closed") return Promise.resolve();

    return new Promise((resolve) => {
        const done = (): void => {
            window.clearTimeout(timer);
            channel.removeEventListener("close", done);
            signal.removeEventListener("abort", done);
            resolve();
        };
        const timer = window.setTimeout(done, ms);
        channel.addEventListener("close", done);
        signal.addEventListener("abort", done);
    });
}

interface DrainOptions {
    fileSize: number;
    signal: AbortSignal;
    onChunk: (buffer: ArrayBuffer) => Promise<void>;
}

/**
 * Consume binary messages until EOF or the declared size is reached.
 *
 * Writes are serialised through a promise chain: `write()` is async and the
 * message events are not, so without this a fast sender would interleave writes
 * and scramble the file.
 */
function drainChannel(channel: RTCDataChannel, opts: DrainOptions): Promise<void> {
    const {fileSize, signal, onChunk} = opts;

    return new Promise((resolve, reject) => {
        let queue: Promise<void> = Promise.resolve();
        let total = 0;
        let settled = false;

        const cleanup = (): void => {
            channel.removeEventListener("message", onMessage);
            channel.removeEventListener("error", onError);
            channel.removeEventListener("close", onClose);
            signal.removeEventListener("abort", onAbort);
        };
        const finish = (): void => {
            if (settled) return;
            settled = true;
            cleanup();
            queue.then(resolve, reject);
        };
        const fail = (err: Error): void => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(err);
        };

        const onMessage = (ev: MessageEvent): void => {
            if (typeof ev.data === "string") {
                if (ev.data === CTRL_EOF) finish();
                return;
            }
            const buffer = ev.data as ArrayBuffer;
            total += buffer.byteLength;
            queue = queue.then(() => onChunk(buffer)).catch((err: Error) => {
                fail(err);
                throw err;
            });
            // The size check is the real terminator; EOF is belt and braces in case the sentinel is lost.
            if (total >= fileSize) finish();
        };
        const onError = (): void => fail(new P2PError("Data channel error during transfer"));
        const onClose = (): void => {
            if (total >= fileSize) finish();
            else fail(new P2PError(`Channel closed early — ${total} of ${fileSize} B received`));
        };
        const onAbort = (): void => fail(new DOMException("Cancelled", "AbortError"));

        channel.addEventListener("message", onMessage);
        channel.addEventListener("error", onError);
        channel.addEventListener("close", onClose);
        signal.addEventListener("abort", onAbort);
    });
}

// --- Connection observation ---

function watchIce(
    pc: RTCPeerConnection,
    status: P2PStatus,
    emit: (patch: Partial<P2PStatus>) => void
): void {
    pc.addEventListener("iceconnectionstatechange", () => {
        const state = pc.iceConnectionState;
        if (state === "checking") {
            emit({phase: "negotiating", detail: "ICE checking · probing candidate pairs"});
        } else if (state === "failed") {
            const message = describeIceFailure(pc, status);
            emit({phase: "failed", error: message, detail: message});
        } else if (state === "disconnected") {
            emit({degraded: true, detail: "ICE disconnected · peer unreachable"});
        } else if (state === "connected" || state === "completed") {
            // Disconnections can heal (a transient network blip); un-flag.
            if (status.degraded) emit({degraded: false, detail: "ICE reconnected"});
        }
    });
}

async function refreshPair(
    pc: RTCPeerConnection,
    emit: (patch: Partial<P2PStatus>) => void
): Promise<void> {
    const info = await readSelectedPair(pc);
    if (!info) return;
    emit({pair: info.pair, relayed: info.relayed, rttMs: info.rttMs});
}

function throwIfAborted(signal: AbortSignal): void {
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
}
