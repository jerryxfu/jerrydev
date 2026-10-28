import {EMPTY_P2P_STATUS, type P2PSnapshot, type P2PStatus} from "../types.ts";
import {
    buildIceServers,
    countCandidates,
    createPeer,
    createRateMeter,
    CTRL_AT,
    CTRL_DONE,
    CTRL_EOF,
    describeCandidates,
    describeIceFailure,
    GATHER_TIMEOUT_MS,
    GATHER_TIMEOUT_TURN_MS,
    GIVE_UP_MESSAGE,
    GIVE_UP_MS,
    type Link,
    OFFLINE_RETRY_MS,
    P2PError,
    type Pairing,
    postSignal,
    readSelectedPair,
    ROUND_TIMEOUT_MS,
    SessionGone,
    type SignalEvent,
    sleep,
    SNAPSHOT_INTERVAL_MS,
    totalCandidates,
    waitForGathering,
    waitForSignal,
    watchLink,
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

/** The receiver gives up on reconnecting this long after the sender would: the sender's last attempt can still come. */
const GIVE_UP_MARGIN_MS = 10_000;

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

    // The current connection's: a reconnect replaces it.
    let pc: RTCPeerConnection | null = null;
    let writable: Sink | null = null;
    let memory: ReturnType<typeof memorySink> | null = null;
    let statsTimer = 0;
    let reportTimer = 0;

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
        // For reconnecting once paired.
        const pairing: Pairing = {apiBaseUrl, code, token: json.data.token as string};

        emit({phase: "negotiating", detail: "answer posted · awaiting data channel"});
        const stopWatchingIce = watchIce(pc, status, emit);

        const channel = await channelPromise;
        stopWatchingIce();
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
            if (pc) void refreshPair(pc, emit);
            snapshot();
        }, 1000);

        // --- Transfer, through as many connections as it takes (STALL_MS in peer.ts has the why) ---
        const writes = {queue: Promise.resolve()};
        const onChunk = async (buffer: ArrayBuffer): Promise<void> => {
            await writable!.write(buffer);
            received += buffer.byteLength;
            chunks += 1;
            if (buffer.byteLength > observedChunkSize) observedChunkSize = buffer.byteLength;
            snapshot(); // self-throttling
        };
        let link: Link = {pc, channel};
        // The last reconnect offer answered: the next has to be newer.
        let round = 0;
        for (; ;) {
            const current = link.channel;
            // What's saved, now and every second: where the sender goes on from, and a sign this side is still here.
            const report = (): void => {
                if (current.readyState === "open") current.send(CTRL_AT + received);
            };
            const watch = watchLink(current, signal);
            report();
            reportTimer = window.setInterval(report, 1000);
            try {
                await drainChannel(current, {from: received, fileSize, signal: watch.signal, writes, onChunk});
                break;
            } catch (err: unknown) {
                if (!watch.lost()) throw err;
            } finally {
                watch.stop();
            }
            window.clearInterval(reportTimer);
            link.pc.close();
            emit({degraded: true, reconnecting: true, detail: "connection lost · waiting for the sender"});
            // Everything that arrived is written first: `received` is then where the sender goes on from.
            await writes.queue;
            ({link, round} = await answerReconnect(pairing, round, useTurn, status, emit, signal));
            pc = link.pc;
            emit({degraded: false, reconnecting: false, maxMessageSize: pc.sctp?.maxMessageSize ?? null, detail: "reconnected"});
            void refreshPair(pc, emit);
        }

        snapshot(true);
        await writable.close();
        writable = null;

        if (received !== fileSize) {
            throw new P2PError(`Size mismatch — expected ${fileSize} B, wrote ${received} B`);
        }

        // The reports went on while the file was being closed (a big one can take a while): the sender waits for this.
        if (link.channel.readyState === "open") link.channel.send(CTRL_DONE);
        window.clearInterval(reportTimer);

        emit({phase: "done", degraded: false, reconnecting: false, detail: `${fileName} written · ${received} B`});

        // Closing at once could cut CTRL_DONE off before it leaves, and the sender only counts the file delivered once
        // it hears it. The sender closes the channel when it does.
        await waitForClose(link.channel, DONE_GRACE_MS, signal);
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
            emit({phase: "failed", reconnecting: false, error: message, detail: message});
        }

        throw err;
    } finally {
        window.clearInterval(statsTimer);
        window.clearInterval(reportTimer);
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
    /** Bytes already in, through earlier connections. */
    from: number;
    fileSize: number;
    signal: AbortSignal;
    /** The writes, in order, across connections. */
    writes: { queue: Promise<void> };
    onChunk: (buffer: ArrayBuffer) => Promise<void>;
}

/**
 * Consume binary messages until EOF or the declared size is reached, then wait for the writes.
 *
 * Writes are serialised through a promise chain: `write()` is async and the
 * message events are not, so without this a fast sender would interleave writes
 * and scramble the file. The chain is the transfer's, not this channel's: a new
 * connection starts once the last one's writes are done.
 */
function drainChannel(channel: RTCDataChannel, opts: DrainOptions): Promise<void> {
    const {from, fileSize, signal, writes, onChunk} = opts;

    return new Promise((resolve, reject) => {
        let total = from;
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
            writes.queue.then(resolve, reject);
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
            writes.queue = writes.queue.then(() => onChunk(buffer)).catch((err: Error) => {
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

/** ICE's state, until the channel opens: from then on, the transfer watches the connection itself (watchLink). */
function watchIce(
    pc: RTCPeerConnection,
    status: P2PStatus,
    emit: (patch: Partial<P2PStatus>) => void
): () => void {
    const onChange = (): void => {
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
    };
    pc.addEventListener("iceconnectionstatechange", onChange);
    return () => pc.removeEventListener("iceconnectionstatechange", onChange);
}

async function refreshPair(
    pc: RTCPeerConnection,
    emit: (patch: Partial<P2PStatus>) => void
): Promise<void> {
    // A connection closed meanwhile (lost, its replacement on the way) has no stats to give.
    const info = await readSelectedPair(pc).catch(() => null);
    if (!info) return;
    emit({pair: info.pair, relayed: info.relayed, rttMs: info.rttMs});
}

// --- Reconnecting ---

/**
 * The receiver's side of a reconnect (the sender's is `reconnect` in sender.ts): waits through the API for the sender's
 * next offer (above `round`, the last one answered), and answers it from a new connection, with routes from wherever
 * this device now is, until the sender's channel opens on it. One that can't be answered (no network yet, a newer offer
 * already) is tried again OFFLINE_RETRY_MS later; one answered but with no channel within ROUND_TIMEOUT_MS gives way to
 * the sender's next. Without a connection a little longer than the sender would wait, the transfer fails, and at once
 * when the session is gone (the sender ended it).
 */
async function answerReconnect(
    pairing: Pairing,
    round: number,
    useTurn: boolean,
    status: P2PStatus,
    emit: (patch: Partial<P2PStatus>) => void,
    signal: AbortSignal
): Promise<{ link: Link; round: number }> {
    const giveUpAt = Date.now() + GIVE_UP_MS + GIVE_UP_MARGIN_MS;
    for (; ;) {
        let offer: SignalEvent;
        try {
            offer = await waitForSignal(pairing, round, AbortSignal.any([signal, AbortSignal.timeout(Math.max(0, giveUpAt - Date.now()))]));
        } catch (err: unknown) {
            if (signal.aborted) throw err;
            throw new P2PError(GIVE_UP_MESSAGE);
        }
        if (offer.kind === "gone") throw new SessionGone("The sender stopped the transfer");
        emit({remoteCandidates: countCandidates(offer.sdp), detail: `reconnecting · offer ${offer.round} in`});

        const attempt = new AbortController();
        const onCancel = (): void => attempt.abort();
        signal.addEventListener("abort", onCancel, {once: true});
        let timer = 0;
        let pc: RTCPeerConnection | null = null;
        try {
            const {servers, turnError} = await buildIceServers(pairing.apiBaseUrl, useTurn, signal);
            pc = createPeer(servers);
            // Before the answer goes out, so the sender's channel can't arrive unseen.
            const opened = waitForRemoteChannel(pc, status, attempt.signal);
            opened.catch(() => undefined);
            await pc.setRemoteDescription({type: "offer", sdp: offer.sdp});
            await pc.setLocalDescription(await pc.createAnswer());
            await waitForGathering(pc, useTurn && !turnError ? GATHER_TIMEOUT_TURN_MS : GATHER_TIMEOUT_MS);
            const answer = pc.localDescription?.sdp ?? "";
            const candidates = countCandidates(answer);
            if (totalCandidates(candidates) === 0) throw new P2PError("No network routes yet");
            emit({candidates});

            const posted = await postSignal(pairing, "/restart/answer", {answer, round: offer.round}, signal);
            if (posted.status === 403 || posted.status === 404) throw new SessionGone("The sender stopped the transfer");
            // A 409: a newer offer is waiting.
            if (posted.status >= 300) throw new P2PError(`Answer refused (HTTP ${posted.status})`);
            round = offer.round;
            emit({detail: `reconnecting · answer ${round} sent, waiting for the channel`});
            timer = window.setTimeout(() => attempt.abort(), ROUND_TIMEOUT_MS);
            return {link: {pc, channel: await opened}, round};
        } catch (err: unknown) {
            pc?.close();
            if (signal.aborted || err instanceof SessionGone) throw err;
            if (round !== offer.round) await sleep(OFFLINE_RETRY_MS, signal);
        } finally {
            window.clearTimeout(timer);
            attempt.abort();
            signal.removeEventListener("abort", onCancel);
        }
    }
}

function throwIfAborted(signal: AbortSignal): void {
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
}
