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
    GIVE_UP_MESSAGE,
    GIVE_UP_MS,
    isUp,
    OFFLINE_RETRY_MS,
    P2PError,
    type Pairing,
    postSignal,
    readSelectedPair,
    resolveChunkSize,
    RESTART_AFTER_MS,
    ROUND_TIMEOUT_MS,
    sleep,
    SNAPSHOT_INTERVAL_MS,
    totalCandidates,
    waitForDrain,
    waitForGathering,
    waitForRegathering,
    waitForSignal,
} from "./peer.ts";

/** How long to wait for the data channel after the answer arrives. */
const CHANNEL_TIMEOUT_MS = 30_000;

export interface SendOptions {
    file: globalThis.File;
    apiBaseUrl: string;
    /** Offer the relay beside the direct routes. Off only once the month's relay quota is spent. */
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
        // Record where a failure happened before the phase is overwritten, so
        // the UI can mark the ladder chip the transfer died on.
        if (patch.phase === "failed" && status.phase !== "failed" && status.failedAt == null) {
            patch.failedAt = status.phase;
        }
        Object.assign(status, patch);
        onStatus({...status, candidates: {...status.candidates}});
    };

    let pc: RTCPeerConnection | null = null;
    let code: string | null = null;
    let source: EventSource | null = null;
    // Once the channel is open and the session paired: what keeps the transfer going through a network switch.
    let reconnect: Reconnect | null = null;
    // The transfer's own signal: the page's cancel, or giving up on reconnecting.
    const transfer = new AbortController();
    const onCancel = (): void => transfer.abort();
    signal.addEventListener("abort", onCancel, {once: true});

    const teardown = (): void => {
        reconnect?.stop();
        signal.removeEventListener("abort", onCancel);
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

        // A candidate-less offer can never connect; publishing it would burn a
        // code and leave the receiver staring at a 30s channel timeout. Fail
        // here, where the reason is still knowable.
        if (totalCandidates(candidates) === 0) {
            throw new P2PError("No network routes gathered — check VPN, firewall, or this browser's Local Network permission");
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
        const initJson = await initRes.json();
        if (!initRes.ok) {
            throw new P2PError(initJson?.error?.message ?? `Session init failed (HTTP ${initRes.status})`);
        }

        code = initJson.data.code as string;
        onCode(code, initJson.data.expiresAt as string);
        // For reconnecting once paired. An older API gives none: the transfer then can't survive a network switch.
        const token = initJson.data.token as string | undefined;
        const pairing: Pairing | null = token ? {apiBaseUrl, code, token} : null;
        const gatherTimeout = useTurn && !turnError ? GATHER_TIMEOUT_TURN_MS : GATHER_TIMEOUT_MS;

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

        // The session is already consumed server-side, so if the answer carries
        // no candidates there is nothing to negotiate: fail now with the real
        // reason instead of grinding ICE to a timeout against an empty checklist.
        const remoteCandidates = countCandidates(result.answer);
        emit({remoteCandidates});
        if (totalCandidates(remoteCandidates) === 0) {
            throw new P2PError("Receiver sent no network routes — their browser gathered zero ICE candidates (VPN, firewall, or browser permissions on their side)");
        }

        await pc.setRemoteDescription({type: "answer", sdp: result.answer});

        watchIce(pc, status, emit, () => reconnect !== null);

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
        if (pairing) reconnect = keepConnected(pc, pairing, gatherTimeout, emit, transfer);

        // --- Transfer ---
        await pumpFile(file, channel, chunkSize, onSnapshot, transfer.signal, pc, emit, reconnect === null);

        emit({phase: "done", degraded: false, reconnecting: false, detail: `${file.name} delivered · ${formatBytesShort(file.size)}`});
        teardown();
        return "done";
    } catch (err: unknown) {
        const lost = reconnect?.lost ?? null;
        teardown();
        // Gave up on reconnecting: what stopped the transfer is the lost connection, not the abort that ended its waits.
        if (lost) {
            emit({phase: "failed", reconnecting: false, error: lost, detail: lost});
            throw new P2PError(lost);
        }
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
    emit: (patch: Partial<P2PStatus>) => void,
    reconnects: () => boolean
): void {
    pc.addEventListener("iceconnectionstatechange", () => {
        // Once the transfer can reconnect, keepConnected reports the state: a failure isn't final then, and a restart's
        // "checking" isn't the negotiation starting over.
        if (reconnects()) return;
        const state = pc.iceConnectionState;
        if (state === "checking") {
            emit({phase: "negotiating", detail: "ICE checking · probing candidate pairs"});
        } else if (state === "failed") {
            emit({phase: "failed", error: describeIceFailure(pc, status), detail: describeIceFailure(pc, status)});
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

// --- Reconnecting ---

interface Reconnect {
    /** Why it gave up, once it has. */
    readonly lost: string | null;

    stop(): void;
}

/**
 * Keeps a transfer going through a network switch (RESTART_AFTER_MS in peer.ts has the why). When the route goes down,
 * rounds: a new offer with an ICE restart, through the API to the receiver, and its answer back. A round that hasn't
 * reconnected within ROUND_TIMEOUT_MS is followed by another. Down for GIVE_UP_MS, it gives up: `lost` says why, and
 * aborting `transfer` ends what waits on the channel, which no route will drain now.
 */
function keepConnected(
    pc: RTCPeerConnection,
    pairing: Pairing,
    gatherTimeoutMs: number,
    emit: (patch: Partial<P2PStatus>) => void,
    transfer: AbortController
): Reconnect {
    let lost: string | null = null;
    let stopped = false;
    let running = false;
    let down = false;
    let graceTimer = 0;
    let giveUpTimer = 0;
    // The round in flight: back up, it stops.
    let current: AbortController | null = null;

    // Back up: the timers and the round in flight stop, and the status says so.
    const back = (): void => {
        window.clearTimeout(graceTimer);
        window.clearTimeout(giveUpTimer);
        graceTimer = giveUpTimer = 0;
        current?.abort();
        if (down) {
            down = false;
            emit({degraded: false, reconnecting: false, detail: "ICE reconnected"});
            void refreshPair(pc, emit);
        }
    };

    const onIce = (): void => {
        const state = pc.iceConnectionState;
        if (isUp(pc)) {
            back();
            return;
        }
        if (state !== "disconnected" && state !== "failed") return;
        if (!down) {
            down = true;
            emit({degraded: true, detail: "ICE disconnected · peer unreachable"});
        }
        if (!giveUpTimer) giveUpTimer = window.setTimeout(giveUp, GIVE_UP_MS);
        if (state === "failed") start();
        else if (!graceTimer && !running) graceTimer = window.setTimeout(start, RESTART_AFTER_MS);
    };

    function start(): void {
        window.clearTimeout(graceTimer);
        graceTimer = 0;
        if (running || stopped || isUp(pc)) return;
        running = true;
        void rounds().finally(() => {
            running = false;
        });
    }

    async function rounds(): Promise<void> {
        while (!stopped && !isUp(pc)) {
            const round = new AbortController();
            current = round;
            let timer = window.setTimeout(() => round.abort(), ROUND_TIMEOUT_MS);
            const onStop = (): void => round.abort();
            transfer.signal.addEventListener("abort", onStop, {once: true});
            try {
                emit({reconnecting: true, detail: "reconnecting · gathering new routes"});
                await pc.setLocalDescription(await pc.createOffer({iceRestart: true}));
                await waitForRegathering(pc, gatherTimeoutMs);
                const offer = pc.localDescription?.sdp ?? "";
                const candidates = countCandidates(offer);
                if (totalCandidates(candidates) === 0) {
                    emit({detail: "reconnecting · no network yet"});
                    await sleep(OFFLINE_RETRY_MS, round.signal);
                    continue;
                }
                emit({candidates});

                const posted = await postSignal<{ round: number }>(pairing, "/restart", {offer}, round.signal);
                // The session is gone (the receiver can't be reached through it any more), or not ours.
                if (posted.status === 403 || posted.status === 404) {
                    giveUp();
                    return;
                }
                if (!posted.data) throw new P2PError(`Restart refused (HTTP ${posted.status})`);
                const n = posted.data.round;
                emit({detail: `reconnecting · round ${n} · new offer sent`});

                const answer = await waitForSignal(pairing, n, round.signal);
                if (answer.kind === "gone") {
                    giveUp();
                    return;
                }
                await pc.setRemoteDescription({type: "answer", sdp: answer.sdp});
                // The checks get a full round of their own: an answer late in the round would otherwise see its new
                // route thrown away by the next round's restart, just as it was being found.
                window.clearTimeout(timer);
                timer = window.setTimeout(() => round.abort(), ROUND_TIMEOUT_MS);
                emit({remoteCandidates: countCandidates(answer.sdp), detail: `reconnecting · round ${n} · answer in, checking routes`});
                await waitForUp(pc, round.signal);
            } catch {
                // The API out of reach, a description refused: the next round, once the network has had a moment. A
                // round that ran out goes on at once; stopped, or back up, the loop ends.
                if (!stopped && !isUp(pc) && !round.signal.aborted) {
                    await sleep(OFFLINE_RETRY_MS, transfer.signal).catch(() => undefined);
                }
            } finally {
                window.clearTimeout(timer);
                transfer.signal.removeEventListener("abort", onStop);
                current = null;
            }
        }
        if (stopped) return;
        // Back up before a round's answer came: its offer is rolled back, so the old route's details stay in force.
        if (pc.signalingState === "have-local-offer") await pc.setLocalDescription({type: "rollback"}).catch(() => undefined);
        // Up without telling (no state event since): as if it had.
        back();
    }

    function giveUp(): void {
        if (stopped) return;
        lost = GIVE_UP_MESSAGE;
        stop();
        transfer.abort();
    }

    function stop(): void {
        stopped = true;
        window.clearTimeout(graceTimer);
        window.clearTimeout(giveUpTimer);
        current?.abort();
        pc.removeEventListener("iceconnectionstatechange", onIce);
    }

    pc.addEventListener("iceconnectionstatechange", onIce);
    return {
        get lost() {
            return lost;
        },
        stop,
    };
}

/** Resolve once ICE has a working route again; reject on abort. */
function waitForUp(pc: RTCPeerConnection, signal: AbortSignal): Promise<void> {
    if (isUp(pc)) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const cleanup = (): void => {
            pc.removeEventListener("iceconnectionstatechange", onIce);
            signal.removeEventListener("abort", onAbort);
        };
        const onIce = (): void => {
            if (!isUp(pc)) return;
            cleanup();
            resolve();
        };
        const onAbort = (): void => {
            cleanup();
            reject(new DOMException("Cancelled", "AbortError"));
        };
        if (signal.aborted) {
            onAbort();
            return;
        }
        pc.addEventListener("iceconnectionstatechange", onIce);
        signal.addEventListener("abort", onAbort);
    });
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
                reject(new P2PError(describeIceFailure(pc, status)));
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
            reject(new P2PError(describeIceFailure(pc, status)));
        }, CHANNEL_TIMEOUT_MS);
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
    emit: (patch: Partial<P2PStatus>) => void,
    iceIsFinal: boolean
): Promise<void> {
    // `queued` counts bytes handed to SCTP. What has actually reached the peer is
    // queued minus whatever is still sitting in the send buffer.
    let queued = 0;
    let chunks = 0;
    const meter = createRateMeter();
    let lastEmit = 0;
    const startedAt = Date.now();

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
            elapsedMs: at - startedAt,
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

            if (channel.readyState !== "open") throw closedMidTransfer(channel);

            // Backpressure: the SCTP buffer is not infinite, and blasting past it
            // stalls or kills the channel.
            if (channel.bufferedAmount > BUFFER_HIGH) {
                await waitForDrain(channel, signal);
                continue;
            }

            const slice = file.slice(queued, Math.min(queued + chunkSize, file.size));
            const buffer = await slice.arrayBuffer();
            // Again after the read, which takes a moment: a channel that closed meanwhile (the receiver gone) would make
            // send() throw the browser's own message ("Failed to execute 'send'...") instead of this one.
            if (channel.readyState !== "open") throw closedMidTransfer(channel);
            channel.send(buffer);

            queued += buffer.byteLength;
            chunks += 1;
            snapshot(); // self-throttling
        }

        snapshot(true);
        channel.send(CTRL_EOF);
        emit({phase: "transferring", detail: "all chunks sent · waiting for receiver ack"});

        await waitForAck(channel, pc, signal, iceIsFinal);

        // Buffer has drained and the receiver confirmed the write; pin to 100% rather than leaving the bar parked at 99.x.
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
    } finally {
        window.clearInterval(statsTimer);
    }
}

/**
 * Wait for the receiver to confirm it finished writing to disk. Only its CTRL_DONE counts: a channel that closes first,
 * or a connection that fails, means it stopped before the file was saved (a full disk, a closed tab), even with every
 * byte sent. No timeout: writing the last of a big file can take a while, and a dead peer fails ICE on its own. Where
 * the transfer can reconnect (`iceIsFinal` false), a failed ICE starts a reconnect instead, and giving up aborts.
 */
function waitForAck(channel: RTCDataChannel, pc: RTCPeerConnection, signal: AbortSignal, iceIsFinal: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
        const cleanup = (): void => {
            channel.removeEventListener("message", onMessage);
            channel.removeEventListener("close", onClose);
            pc.removeEventListener("iceconnectionstatechange", onIce);
            signal.removeEventListener("abort", onAbort);
        };
        const onMessage = (ev: MessageEvent): void => {
            if (ev.data === CTRL_DONE) {
                cleanup();
                resolve();
            }
        };
        const onClose = (): void => {
            cleanup();
            reject(new P2PError("The receiver closed before confirming the file was saved"));
        };
        const onIce = (): void => {
            if (pc.iceConnectionState !== "failed") return;
            cleanup();
            reject(new P2PError("Connection lost before the receiver confirmed the file was saved"));
        };
        const onAbort = (): void => {
            cleanup();
            reject(new DOMException("Cancelled", "AbortError"));
        };

        channel.addEventListener("message", onMessage);
        channel.addEventListener("close", onClose);
        if (iceIsFinal) pc.addEventListener("iceconnectionstatechange", onIce);
        signal.addEventListener("abort", onAbort);
    });
}

// --- Helpers ---

function throwIfAborted(signal: AbortSignal): void {
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
}

function closedMidTransfer(channel: RTCDataChannel): P2PError {
    return new P2PError(`Data channel closed mid-transfer (state ${channel.readyState})`);
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
