import {EMPTY_P2P_STATUS, type P2PSnapshot, type P2PStatus} from "../types.ts";
import {
    BUFFER_HIGH,
    BUFFER_LOW,
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
    resolveChunkSize,
    SNAPSHOT_INTERVAL_MS,
    waitForDrain,
    waitForGathering,
} from "./peer.ts";

export interface SendOptions {
    file: globalThis.File;
    apiBaseUrl: string;
    useTurn: boolean;
    onStatus: (status: P2PStatus) => void;
    onCode: (code: string, expiresAt: string) => void;
    onSnapshot: (snapshot: P2PSnapshot) => void;
    signal: AbortSignal;
}

type SessionOutcome = "done" | "expired";

/** Fire-and-forget session teardown; survives page unload. */
export function closeSession(apiBaseUrl: string, code: string): void {
    try {
        void fetch(`${apiBaseUrl}/expedite/p2p/${code}`, {
            method: "DELETE",
            keepalive: true,
        });
    } catch {
        // Best effort, the 10 min TTL reaps it regardless.
    }
}

/**
 * Send a file over a direct data channel.
 *
 * Loops on session expiry: if nobody claims the code within its TTL, the peer
 * connection is torn down and a brand new offer is published under a new code.
 * Reusing the old offer would not work because its ICE candidates reference NAT
 * bindings that have long since lapsed without keepalive traffic, so the
 * connection would fail at the checking stage with nothing to show for it.
 */
export async function sendP2P(opts: SendOptions): Promise<void> {
    const {signal} = opts;

    for (; ;) {
        if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
        const outcome = await runSession(opts);
        if (outcome === "done") return;
        // "expired" -> rotate and publish a fresh offer.
    }
}

async function runSession(opts: SendOptions): Promise<SessionOutcome> {
    const {file, apiBaseUrl, useTurn, onStatus, onCode, onSnapshot, signal} = opts;

    const status: P2PStatus = {...EMPTY_P2P_STATUS, candidates: {...EMPTY_P2P_STATUS.candidates}};
    const emit = (patch: Partial<P2PStatus>): void => {
        Object.assign(status, patch);
        onStatus({...status, candidates: {...status.candidates}});
    };

    let pc: RTCPeerConnection | null = null;
    let code: string | null = null;
    let source: EventSource | null = null;

    const teardown = (): void => {
        source?.close();
        source = null;
        try {
            pc?.close();
        } catch {
            // already closed
        }
        pc = null;
    };

    try {
        emit({phase: "gathering", detail: "resolving ICE servers"});

        const {servers, turnError} = await buildIceServers(apiBaseUrl, useTurn, signal);
        if (turnError) {
            emit({detail: `${turnError} — continuing with STUN only`});
        }

        pc = createPeer(servers);
        const channel = pc.createDataChannel("expedite", {ordered: true});
        channel.binaryType = "arraybuffer";
        channel.bufferedAmountLowThreshold = BUFFER_LOW;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        emit({phase: "gathering", detail: "gathering ICE candidates"});
        // Relay allocation is slower than host/srflx; only wait longer when a
        // relay is actually expected.
        await waitForGathering(pc, useTurn && !turnError ? GATHER_TIMEOUT_TURN_MS : GATHER_TIMEOUT_MS);
        throwIfAborted(signal);

        const localSdp = pc.localDescription?.sdp;
        if (!localSdp) throw new P2PError("No local description after ICE gathering");

        const candidates = countCandidates(localSdp);
        emit({candidates, detail: describeCandidates(candidates)});

        // --- Publish the offer ---
        emit({phase: "signalling", detail: `POST /p2p/init · ${formatSdpSize(localSdp)} SDP`});

        const initRes = await fetch(`${apiBaseUrl}/expedite/p2p/init`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                offer: localSdp,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type || "application/octet-stream",
            }),
            signal,
        });
        const initJson = await initRes.json();
        if (!initRes.ok) {
            throw new P2PError(initJson?.error?.message ?? `Session init failed (HTTP ${initRes.status})`);
        }

        code = initJson.data.code as string;
        onCode(code, initJson.data.expiresAt as string);

        emit({
            phase: "awaiting-peer",
            detail: `code ${code} live · SSE open · waiting for a receiver`,
        });

        // --- Wait for the answer ---
        const result = await waitForAnswer(apiBaseUrl, code, signal, (d) => emit({detail: d}));
        if (result.kind !== "answer") {
            emit({
                phase: "expired",
                detail: result.kind === "expired"
                    ? "session expired — rotating code"
                    : "session closed — rotating code",
            });
            teardown();
            return "expired";
        }

        emit({phase: "negotiating", detail: "answer received · applying remote description"});
        await pc.setRemoteDescription({type: "answer", sdp: result.answer});

        watchIce(pc, status, emit);

        // --- Channel open ---
        await waitForChannelOpen(channel, pc, status, signal);
        throwIfAborted(signal);

        const chunkSize = resolveChunkSize(pc);
        emit({
            phase: "connected",
            maxMessageSize: pc.sctp?.maxMessageSize ?? null,
            detail: `data channel open · ${formatBytesShort(chunkSize)} chunks`,
        });
        await refreshPair(pc, emit);

        // --- Transfer ---
        await pumpFile(file, channel, chunkSize, onSnapshot, signal, pc, emit);

        emit({phase: "done", detail: `${file.name} delivered · ${formatBytesShort(file.size)}`});
        teardown();
        return "done";
    } catch (err: unknown) {
        teardown();
        if (code && (err as Error)?.name === "AbortError") closeSession(apiBaseUrl, code);
        if ((err as Error)?.name === "AbortError") throw err;
        const message = err instanceof Error ? err.message : String(err);
        emit({phase: "failed", error: message, detail: message});
        throw err;
    }
}

// --- Signalling ---

type AnswerResult =
    | { kind: "answer"; answer: string }
    | { kind: "expired" }
    | { kind: "gone" };

/**
 * Hold the SSE stream open until the server reports an answer, expiry, or a
 * vanished session. EventSource reconnects on its own after a transport blip,
 * so a network error is surfaced as a detail line rather than a failure.
 */
function waitForAnswer(
    apiBaseUrl: string,
    code: string,
    signal: AbortSignal,
    onDetail: (detail: string) => void
): Promise<AnswerResult> {
    return new Promise((resolve, reject) => {
        const source = new EventSource(`${apiBaseUrl}/expedite/p2p/${code}/events`);

        const finish = (result: AnswerResult): void => {
            cleanup();
            resolve(result);
        };
        const cleanup = (): void => {
            source.close();
            signal.removeEventListener("abort", onAbort);
        };
        const onAbort = (): void => {
            cleanup();
            reject(new DOMException("Cancelled", "AbortError"));
        };

        if (signal.aborted) {
            onAbort();
            return;
        }
        signal.addEventListener("abort", onAbort);

        source.addEventListener("answer", (ev) => {
            try {
                const data = JSON.parse((ev as MessageEvent<string>).data);
                finish({kind: "answer", answer: data.answer as string});
            } catch {
                cleanup();
                reject(new P2PError("Malformed answer payload on signalling stream"));
            }
        });

        source.addEventListener("expired", () => finish({kind: "expired"}));
        source.addEventListener("gone", () => finish({kind: "gone"}));

        source.onerror = () => {
            // readyState CONNECTING means the browser is already retrying.
            if (source.readyState === EventSource.CONNECTING) {
                onDetail(`code ${code} live · signalling stream reconnecting`);
            }
        };
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
            emit({phase: "failed", error: describeIceFailure(pc, status), detail: describeIceFailure(pc, status)});
        } else if (state === "disconnected") {
            emit({detail: "ICE disconnected · peer unreachable"});
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

function waitForChannelOpen(
    channel: RTCDataChannel,
    pc: RTCPeerConnection,
    status: P2PStatus,
    signal: AbortSignal
): Promise<void> {
    if (channel.readyState === "open") return Promise.resolve();

    return new Promise((resolve, reject) => {
        const cleanup = (): void => {
            channel.removeEventListener("open", onOpen);
            pc.removeEventListener("iceconnectionstatechange", onIce);
            signal.removeEventListener("abort", onAbort);
        };
        const onOpen = (): void => {
            cleanup();
            resolve();
        };
        const onIce = (): void => {
            if (pc.iceConnectionState === "failed") {
                cleanup();
                reject(new P2PError(describeIceFailure(pc, status)));
            }
        };
        const onAbort = (): void => {
            cleanup();
            reject(new DOMException("Cancelled", "AbortError"));
        };
        channel.addEventListener("open", onOpen);
        pc.addEventListener("iceconnectionstatechange", onIce);
        signal.addEventListener("abort", onAbort);
    });
}

// --- Transfer ---

async function pumpFile(
    file: globalThis.File,
    channel: RTCDataChannel,
    chunkSize: number,
    onSnapshot: (snapshot: P2PSnapshot) => void,
    signal: AbortSignal,
    pc: RTCPeerConnection,
    emit: (patch: Partial<P2PStatus>) => void
): Promise<void> {
    // `queued` counts bytes handed to SCTP. What has actually reached the peer is
    // queued minus whatever is still sitting in the send buffer.
    let queued = 0;
    let chunks = 0;
    const meter = createRateMeter();
    let lastEmit = 0;

    const snapshot = (force = false): void => {
        const at = Date.now();
        if (!force && at - lastEmit < SNAPSHOT_INTERVAL_MS) return;
        lastEmit = at;

        const buffered = channel.bufferedAmount;
        const delivered = Math.max(0, queued - buffered);
        meter.push(delivered);
        onSnapshot({
            fileName: file.name,
            transferredBytes: delivered,
            totalBytes: file.size,
            chunks,
            chunkSize,
            bufferedAmount: buffered,
            speedBps: meter.bps,
        });
    };

    emit({phase: "transferring", detail: `streaming ${formatBytesShort(file.size)} in ${formatBytesShort(chunkSize)} chunks`});
    snapshot(true);

    // Periodic stats refresh so RTT and the selected pair stay live during transfer.
    const statsTimer = window.setInterval(() => {
        void refreshPair(pc, emit);
        snapshot();
    }, 1000);

    try {
        while (queued < file.size) {
            throwIfAborted(signal);

            if (channel.readyState !== "open") {
                throw new P2PError(`Data channel closed mid-transfer (state ${channel.readyState})`);
            }

            // Backpressure: the SCTP buffer is not infinite, and blasting past it
            // stalls or kills the channel.
            if (channel.bufferedAmount > BUFFER_HIGH) {
                await waitForDrain(channel, signal);
                continue;
            }

            const slice = file.slice(queued, Math.min(queued + chunkSize, file.size));
            const buffer = await slice.arrayBuffer();
            channel.send(buffer);

            queued += buffer.byteLength;
            chunks += 1;
            snapshot(); // self-throttling
        }

        snapshot(true);
        channel.send(CTRL_EOF);
        emit({phase: "transferring", detail: "all chunks sent · waiting for receiver ack"});

        await waitForAck(channel, signal);

        // Buffer has drained and the receiver confirmed the write; pin to 100% rather than leaving the bar parked at 99.x.
        onSnapshot({
            fileName: file.name,
            transferredBytes: file.size,
            totalBytes: file.size,
            chunks,
            chunkSize,
            bufferedAmount: 0,
            speedBps: 0,
        });
    } finally {
        window.clearInterval(statsTimer);
    }
}

/** Wait for the receiver to confirm it finished writing to disk. */
function waitForAck(channel: RTCDataChannel, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const cleanup = (): void => {
            channel.removeEventListener("message", onMessage);
            channel.removeEventListener("close", onClose);
            signal.removeEventListener("abort", onAbort);
            window.clearTimeout(timer);
        };
        const onMessage = (ev: MessageEvent): void => {
            if (ev.data === CTRL_DONE) {
                cleanup();
                resolve();
            }
        };

        // A clean close after EOF means the receiver is done; treat it as an ack.
        const onClose = (): void => {
            cleanup();
            resolve();
        };
        const onAbort = (): void => {
            cleanup();
            reject(new DOMException("Cancelled", "AbortError"));
        };
        // Don't hang forever if the ack is lost; the bytes are already delivered.
        const timer = window.setTimeout(() => {
            cleanup();
            resolve();
        }, 30_000);

        channel.addEventListener("message", onMessage);
        channel.addEventListener("close", onClose);
        signal.addEventListener("abort", onAbort);
    });
}

// --- Helpers ---

function throwIfAborted(signal: AbortSignal): void {
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
}

function formatSdpSize(sdp: string): string {
    return `${(new Blob([sdp]).size / 1024).toFixed(1)} KB`;
}

function formatBytesShort(bytes: number): string {
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
}
