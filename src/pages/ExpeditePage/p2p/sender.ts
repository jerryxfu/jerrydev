import {type P2PSnapshot, type P2PStatus} from "../types.ts";
import {formatBytes} from "../utils.ts";
import {
    BUFFER_HIGH,
    BUFFER_LOW,
    buildIceServers,
    CHANNEL_TIMEOUT_MS,
    countCandidates,
    createPeer,
    createRateMeter,
    CTRL_AT,
    CTRL_DONE,
    CTRL_EOF,
    describeCandidates,
    type Emit,
    errorText,
    GIVE_UP_MESSAGE,
    GIVE_UP_MS,
    iceFailure,
    type Link,
    type LinkWatch,
    OFFLINE_RETRY_MS,
    P2PError,
    type Pairing,
    postSignal,
    refreshPair,
    resolveChunkSize,
    SessionGone,
    sleep,
    SNAPSHOT_INTERVAL_MS,
    throwIfAborted,
    totalCandidates,
    trackStatus,
    waitForDrain,
    waitForGathering,
    waitForSignal,
    watchIce,
    watchLink,
    within,
} from "./peer.ts";

export interface SendOptions {
    file: globalThis.File;
    apiBaseUrl: string;
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
        // Best effort: the API reaps it regardless (10 min unclaimed, 24 h once paired).
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
    const {file, apiBaseUrl, onStatus, onCode, onSnapshot, signal} = opts;
    const {status, emit} = trackStatus(onStatus);

    // The current connection's: a reconnect replaces it.
    let pc: RTCPeerConnection | null = null;
    let statsTimer = 0;

    const teardown = (): void => {
        window.clearInterval(statsTimer);
        try {
            pc?.close();
        } catch {
            // already closed
        }
        pc = null;
    };

    try {
        emit({phase: "gathering", detail: "resolving ICE servers"});

        const {servers, turnError, gatherMs} = await buildIceServers(apiBaseUrl, signal);
        if (turnError) {
            emit({detail: `${turnError} · continuing with STUN only`});
        }

        pc = createPeer(servers);
        const channel = openChannel(pc);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        emit({phase: "gathering", detail: "gathering ICE candidates"});
        await waitForGathering(pc, gatherMs);
        throwIfAborted(signal);

        const localSdp = pc.localDescription?.sdp;
        if (!localSdp) throw new P2PError("Something went wrong while connecting. Try again.", "No local description after ICE gathering.");

        const candidates = countCandidates(localSdp);
        emit({candidates, detail: describeCandidates(candidates)});

        // A candidate-less offer can never connect; publishing it would burn a
        // code and leave the receiver staring at a 30s channel timeout. Fail
        // here, where the reason is still knowable.
        if (totalCandidates(candidates) === 0) {
            throw new P2PError(
                "This device found no way to connect. Check your connection, VPN or firewall, and on a Mac, this browser's Local Network permission.",
                "No ICE candidates gathered."
            );
        }

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
        // Null when the answer isn't the API's JSON (a proxy's error page).
        const initJson = await initRes.json().catch(() => null);
        if (!initRes.ok) {
            throw initJson?.error?.message
                ? new P2PError(initJson.error.message)
                : new P2PError("Couldn't create a code. Try again.", `Session init failed (HTTP ${initRes.status}).`);
        }

        const code = initJson.data.code as string;
        onCode(code, initJson.data.expiresAt as string);
        // For reconnecting once paired.
        const pairing: Pairing = {apiBaseUrl, code, token: initJson.data.token as string};

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
                    ? "session expired · rotating code"
                    : "session closed · rotating code",
            });
            teardown();
            return "expired";
        }

        emit({phase: "negotiating", detail: "answer received · applying remote description"});

        // The session is already consumed server-side, so if the answer carries
        // no candidates there is nothing to negotiate: fail now with the real
        // reason instead of grinding ICE to a timeout against an empty checklist.
        const remoteCandidates = countCandidates(result.answer);
        emit({remoteCandidates});
        if (totalCandidates(remoteCandidates) === 0) {
            throw new P2PError(
                "The receiver's device found no way to connect. A VPN, firewall or browser setting on their side may block it.",
                "Their answer has no ICE candidates."
            );
        }

        await pc.setRemoteDescription({type: "answer", sdp: result.answer});

        const stopWatchingIce = watchIce(pc, status, emit);

        // --- Channel open ---
        await waitForChannelOpen(channel, pc, status, signal);
        stopWatchingIce();
        throwIfAborted(signal);

        emit({phase: "connected", maxMessageSize: pc.sctp?.maxMessageSize ?? null, detail: "data channel open"});
        await refreshPair(pc, emit);

        // --- Transfer, through as many connections as it takes (STALL_MS in peer.ts has the why) ---
        const progress = createProgress(file, onSnapshot);
        // Periodic stats refresh so RTT and the selected pair stay live during transfer.
        statsTimer = window.setInterval(() => {
            if (pc) void refreshPair(pc, emit);
            progress.snapshot();
        }, 1000);

        let link: Link = {pc, channel};
        for (; ;) {
            const watch = watchLink(link.channel, signal);
            try {
                await sendOver(file, link, watch, progress, emit);
                break;
            } catch (err: unknown) {
                if (!watch.lost()) throw err;
            } finally {
                watch.stop();
            }
            link.pc.close();
            emit({degraded: true, reconnecting: true, detail: "connection lost · reconnecting"});
            link = await reconnect(pairing, status, emit, signal);
            pc = link.pc;
            emit({degraded: false, reconnecting: false, maxMessageSize: pc.sctp?.maxMessageSize ?? null, detail: "reconnected"});
            void refreshPair(pc, emit);
        }
        progress.finish();

        emit({phase: "done", degraded: false, reconnecting: false, detail: `${file.name} delivered · ${formatBytes(file.size)}`});
        teardown();
        return "done";
    } catch (err: unknown) {
        // The session is the page's to end (closeSession), cancelled or failed.
        teardown();
        if ((err as Error)?.name === "AbortError") throw err;
        const error = errorText(err);
        emit({phase: "failed", reconnecting: false, error, detail: error.technical ?? error.message});
        throw err;
    }
}

function openChannel(pc: RTCPeerConnection): RTCDataChannel {
    const channel = pc.createDataChannel("expedite", {ordered: true});
    channel.binaryType = "arraybuffer";
    channel.bufferedAmountLowThreshold = BUFFER_LOW;
    return channel;
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
                reject(new P2PError("Something went wrong while connecting. Try again.", "Malformed answer on the signalling stream."));
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

// --- Reconnecting ---

/**
 * A new connection to the receiver, through the paired session: an offer (`/reconnect`, the next round), the receiver's
 * answer, a data channel. An attempt that fails (no network yet, the API out of reach, a call, the answer or the channel
 * not there within ROUND_TIMEOUT_MS each) is followed by another, OFFLINE_RETRY_MS later. Without a connection for
 * GIVE_UP_MS, the transfer fails, and at once when the session is gone (the receiver ended it).
 */
async function reconnect(pairing: Pairing, status: P2PStatus, emit: Emit, signal: AbortSignal): Promise<Link> {
    const giveUpAt = Date.now() + GIVE_UP_MS;
    while (Date.now() < giveUpAt) {
        let pc: RTCPeerConnection | null = null;
        try {
            const {servers, gatherMs} = await buildIceServers(pairing.apiBaseUrl, within(signal));
            pc = createPeer(servers);
            const channel = openChannel(pc);
            await pc.setLocalDescription(await pc.createOffer());
            await waitForGathering(pc, gatherMs);
            const offer = pc.localDescription?.sdp ?? "";
            const candidates = countCandidates(offer);
            if (totalCandidates(candidates) === 0) throw new P2PError("No network routes yet");
            emit({candidates});

            const posted = await postSignal<{ round: number }>(pairing, "/reconnect", {offer}, within(signal));
            if (posted.status === 403 || posted.status === 404) throw new SessionGone("The receiver stopped the transfer.");
            if (!posted.data) throw new P2PError(`Offer refused (HTTP ${posted.status})`);
            const n = posted.data.round;
            emit({detail: `reconnecting · offer ${n} sent, waiting for the receiver`});

            const answer = await waitForSignal(pairing, n, within(signal));
            if (answer.kind === "gone") throw new SessionGone("The receiver stopped the transfer.");
            emit({remoteCandidates: countCandidates(answer.sdp), detail: `reconnecting · answer ${n} in, opening a channel`});
            await pc.setRemoteDescription({type: "answer", sdp: answer.sdp});
            await waitForChannelOpen(channel, pc, status, within(signal));
            return {pc, channel};
        } catch (err: unknown) {
            pc?.close();
            if (signal.aborted || err instanceof SessionGone) throw err;
            emit({detail: "reconnecting · trying again"});
            await sleep(OFFLINE_RETRY_MS, signal);
        }
    }
    throw new P2PError(GIVE_UP_MESSAGE);
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
            window.clearTimeout(timer);
        };
        const onOpen = (): void => {
            cleanup();
            resolve();
        };
        const onIce = (): void => {
            if (pc.iceConnectionState === "failed") {
                cleanup();
                reject(iceFailure(pc, status));
            }
        };
        const onAbort = (): void => {
            cleanup();
            reject(new DOMException("Cancelled", "AbortError"));
        };
        // ICE state alone is not a reliable exit: browsers can sit in
        // "disconnected" indefinitely without ever reaching "failed" —
        // especially when the peer has already torn down its side.
        const timer = window.setTimeout(() => {
            cleanup();
            reject(iceFailure(pc, status));
        }, CHANNEL_TIMEOUT_MS);
        channel.addEventListener("open", onOpen);
        pc.addEventListener("iceconnectionstatechange", onIce);
        signal.addEventListener("abort", onAbort);
    });
}

// --- Transfer ---

type Progress = ReturnType<typeof createProgress>;

/**
 * The sender's progress, across connections. What has reached the receiver is what was handed to the current channel
 * (from where the receiver said it was), minus whatever still sits in its send buffer. Not reported without an open
 * channel, so a lost connection's buffer isn't counted as delivered.
 */
function createProgress(file: globalThis.File, onSnapshot: (snapshot: P2PSnapshot) => void) {
    const meter = createRateMeter();
    const startedAt = Date.now();
    let channel: RTCDataChannel | null = null;
    let queued = 0;
    let chunks = 0;
    let chunkSize = 0;
    let lastEmit = 0;

    const snapshot = (force = false): void => {
        if (channel?.readyState !== "open") return;
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
            elapsedMs: at - startedAt,
        });
    };

    return {
        snapshot,
        /** A new connection, going on from `offset`. */
        use(next: RTCDataChannel, offset: number, size: number): void {
            channel = next;
            queued = offset;
            chunkSize = size;
            snapshot(true);
        },
        add(bytes: number): void {
            queued += bytes;
            chunks += 1;
            snapshot(); // self-throttling
        },
        /** The receiver confirmed the write: pinned to 100% rather than parked at 99.x. */
        finish(): void {
            onSnapshot({
                fileName: file.name,
                transferredBytes: file.size,
                totalBytes: file.size,
                chunks,
                chunkSize,
                bufferedAmount: 0,
                speedBps: 0,
                // Measured to the receiver's ack, so this is true end-to-end delivery
                // time rather than "time spent handing bytes to SCTP".
                elapsedMs: Date.now() - startedAt,
            });
        },
    };
}

/**
 * Sends the file over one connection: from where the receiver says it is (its first CTRL_AT on this channel), to its
 * CTRL_DONE. Only that counts as delivered: the receiver sends it once the file is saved, so a full disk or a closed
 * tab after the last byte isn't taken for success. No timeout: writing the last of a big file can take a while, and
 * the receiver reports every second until then. Rejects once `watch` aborts: the connection lost, or a cancel.
 */
async function sendOver(
    file: globalThis.File,
    link: Link,
    watch: LinkWatch,
    progress: Progress,
    emit: Emit
): Promise<void> {
    const {pc, channel} = link;
    const offset = await nextMessage(channel, watch.signal, (data) => {
        if (!data.startsWith(CTRL_AT)) return null;
        const at = Number(data.slice(CTRL_AT.length));
        return Number.isSafeInteger(at) && at >= 0 && at <= file.size ? at : null;
    });
    const chunkSize = resolveChunkSize(pc);
    progress.use(channel, offset, chunkSize);
    emit({
        phase: "transferring",
        detail: offset === 0
            ? `streaming ${formatBytes(file.size)} in ${formatBytes(chunkSize)} chunks`
            : `going on from ${formatBytes(offset)} · ${formatBytes(chunkSize)} chunks`,
    });

    for (let queued = offset; queued < file.size;) {
        throwIfAborted(watch.signal);
        if (channel.readyState !== "open") throw closedMidTransfer(channel);

        // Backpressure: the SCTP buffer is not infinite, and blasting past it
        // stalls or kills the channel.
        if (channel.bufferedAmount > BUFFER_HIGH) {
            await waitForDrain(channel, watch.signal);
            continue;
        }

        const slice = file.slice(queued, Math.min(queued + chunkSize, file.size));
        const buffer = await slice.arrayBuffer();
        // Again after the read, which takes a moment: a channel that closed meanwhile would make send() throw the
        // browser's own message ("Failed to execute 'send'...") instead of this one.
        if (channel.readyState !== "open") throw closedMidTransfer(channel);
        channel.send(buffer);
        queued += buffer.byteLength;
        progress.add(buffer.byteLength);
    }

    channel.send(CTRL_EOF);
    emit({detail: "all chunks sent · waiting for receiver ack"});
    await nextMessage(channel, watch.signal, (data) => data === CTRL_DONE ? true : null);
}

/** The first string message `match` turns into a value; rejects on abort. */
function nextMessage<T>(channel: RTCDataChannel, signal: AbortSignal, match: (data: string) => T | null): Promise<T> {
    return new Promise((resolve, reject) => {
        const cleanup = (): void => {
            channel.removeEventListener("message", onMessage);
            signal.removeEventListener("abort", onAbort);
        };
        const onMessage = (ev: MessageEvent): void => {
            if (typeof ev.data !== "string") return;
            const value = match(ev.data);
            if (value === null) return;
            cleanup();
            resolve(value);
        };
        const onAbort = (): void => {
            cleanup();
            reject(new DOMException("Cancelled", "AbortError"));
        };
        if (signal.aborted) {
            onAbort();
            return;
        }
        channel.addEventListener("message", onMessage);
        signal.addEventListener("abort", onAbort);
    });
}

// --- Helpers ---

function closedMidTransfer(channel: RTCDataChannel): P2PError {
    return new P2PError("The connection broke during the transfer.", `Data channel closed (state ${channel.readyState}).`);
}

function formatSdpSize(sdp: string): string {
    return `${(new Blob([sdp]).size / 1024).toFixed(1)} KB`;
}
