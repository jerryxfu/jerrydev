import {type CandidateType, EMPTY_P2P_STATUS, type P2PErrorText, type P2PStatus} from "../types.ts";

/**
 * Shared WebRTC code for Direct P2P.
 *
 * Non-trickle: both sides wait for ICE gathering to complete before
 * handing their SDP to the signalling server, so the whole exchange is three
 * messages rather than a candidate stream. Costs 1-3s up front and buys a much simpler server.
 */

/**
 * Two operators on unrelated domains. STUN is a single point of failure for
 * srflx, and DNS filtering (Pi-hole and friends resolve blocklisted names to
 * 0.0.0.0) can silently kill one hostname; the second still answers.
 */
export const STUN_URLS = [
    "stun:stun.cloudflare.com:3478",
    "stun:stun.l.google.com:19302",
];

/**
 * Control messages exchanged as strings alongside the binary chunks. The leading
 * NUL keeps them from ever colliding with real payload, which is always binary.
 */
export const CTRL_EOF = "\u0000expedite:eof";
export const CTRL_DONE = "\u0000expedite:done";
/** From the receiver, with the bytes it has saved: when a channel opens (where to start), then every second. */
export const CTRL_AT = "\u0000expedite:at:";

/** Conservative interop ceiling; clamped further by the negotiated SCTP limit. */
export const DEFAULT_CHUNK_SIZE = 64 * 1024;

/**
 * Minimum gap between progress emissions. At 64 KB chunks a fast transfer fires
 * tens of updates a second; every one is a React render, and the CSS width
 * transition restarts before it can finish, so the bar visibly chases a target
 * it never reaches. 100ms is smooth to the eye and a fraction of the churn.
 */
export const SNAPSHOT_INTERVAL_MS = 100;

/** Pause sending above this much buffered, resume below the low threshold. */
export const BUFFER_HIGH = 8 * 1024 * 1024;
export const BUFFER_LOW = 1 * 1024 * 1024;

/**
 * ICE gathering is abandoned after this long; whatever was collected is used.
 * Relay allocation costs an extra round trip (plus TLS for turns:), so the
 * ceiling is raised when TURN is in play.
 */
export const GATHER_TIMEOUT_MS = 5000;
export const GATHER_TIMEOUT_TURN_MS = 9000;

/**
 * A transfer outlives its connections. A connection dies when either side changes network: both sides then drop it and
 * make a fresh one through the API's paired session, and the receiver says how much it has saved (CTRL_AT), where the
 * sender goes on from. A fresh connection rather than an ICE restart of the old one, because browsers carry an old
 * connection through a network change each their own way: Firefox closes the channel at once, Chromium and Safari bring
 * the old route back from a new port, and Firefox never moves to it. Every browser makes a new connection the same way.
 *
 * Lost: the channel closed, or nothing from the other side for this long (the receiver reports every second, the
 * sender's chunks keep coming).
 */
export const STALL_MS = 5000;
/**
 * A reconnect attempt gives each of its calls to the API this long (on a network that drops packets without a word, a
 * call would otherwise wait past GIVE_UP_MS), then waits as long for the other side's answer, and again for the channel.
 */
export const ROUND_TIMEOUT_MS = 15_000;
/** The first connection waits this long for its data channel once the two SDPs are swapped. */
export const CHANNEL_TIMEOUT_MS = 30_000;
/** Without a connection this long, the transfer fails: time for a phone to join another network. */
export const GIVE_UP_MS = 90_000;
/** Still offline (nothing gathered, the API out of reach): how long before trying again. */
export const OFFLINE_RETRY_MS = 3000;
export const GIVE_UP_MESSAGE = "Lost the connection and couldn't get it back.";

/**
 * Once the first relay candidate is in, how long the others get. They come within a few hundred ms of each other (the
 * TLS ones last), and one server can take 40 s to give up: on a network that drops IPv4 UDP to port 443, Cloudflare's
 * turn:...:443?transport=udp does, and gathering never completes before it.
 */
const RELAY_GRACE_MS = 1000;

/**
 * Rolling throughput meter.
 *
 * Never drops below two samples, so it keeps reporting a rate even when updates
 * arrive far apart (a starved timer degrades the accuracy rather than blanking
 * the number entirely).
 */
export function createRateMeter(windowMs = 5000) {
    const samples: { t: number; v: number }[] = [];

    return {
        push(v: number, t: number = Date.now()): void {
            samples.push({t, v});
            while (samples.length > 2 && t - samples[0]!.t > windowMs) samples.shift();
        },
        get bps(): number {
            const first = samples[0];
            const last = samples.at(-1);
            if (samples.length < 2 || !first || !last) return 0;
            const dt = (last.t - first.t) / 1000;
            if (dt <= 0) return 0;
            return Math.max(0, (last.v - first.v) / dt);
        },
    };
}

/** `message` says what happened in plain words; `technical`, when there's something to add, the precise reason. */
export class P2PError extends Error {
    readonly technical: string | null;

    constructor(message: string, technical: string | null = null) {
        super(message);
        this.name = "P2PError";
        this.technical = technical;
    }
}

/** Any error, as the page shows it. */
export function errorText(err: unknown): P2PErrorText {
    if (err instanceof P2PError) return {message: err.message, technical: err.technical};
    return {message: err instanceof Error ? err.message : String(err), technical: null};
}

/** The paired session is gone (the other side ended the transfer): there's no one to reconnect to. */
export class SessionGone extends P2PError {
}

/** `signal`, and ROUND_TIMEOUT_MS (or `ms`) from now: one step of a reconnect. */
export function within(signal: AbortSignal, ms = ROUND_TIMEOUT_MS): AbortSignal {
    return AbortSignal.any([signal, AbortSignal.timeout(ms)]);
}

export function throwIfAborted(signal: AbortSignal): void {
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
}

export type Emit = (patch: Partial<P2PStatus>) => void;

/**
 * A transfer's status, and `emit`, which changes it and hands `onStatus` a copy. A failure records the ladder step it
 * happened at before the phase is overwritten, so the UI can mark the chip the transfer died on.
 */
export function trackStatus(onStatus: (status: P2PStatus) => void): { status: P2PStatus; emit: Emit } {
    const status: P2PStatus = {...EMPTY_P2P_STATUS, candidates: {...EMPTY_P2P_STATUS.candidates}};
    const emit: Emit = (patch) => {
        if (patch.phase === "failed" && status.phase !== "failed" && status.failedAt == null) {
            patch.failedAt = status.phase;
        }
        Object.assign(status, patch);
        onStatus({...status, candidates: {...status.candidates}});
    };
    return {status, emit};
}

/** ICE's state, until the channel opens: from then on, the transfer watches the connection itself (watchLink). */
export function watchIce(pc: RTCPeerConnection, status: P2PStatus, emit: Emit): () => void {
    const onChange = (): void => {
        const state = pc.iceConnectionState;
        if (state === "checking") {
            emit({phase: "negotiating", detail: "ICE checking · probing candidate pairs"});
        } else if (state === "failed") {
            const error = errorText(iceFailure(pc, status));
            emit({phase: "failed", error, detail: error.technical ?? error.message});
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

/** The route the data goes through, and its RTT, into the status. */
export async function refreshPair(pc: RTCPeerConnection, emit: Emit): Promise<void> {
    // A connection closed meanwhile (lost, its replacement on the way) has no stats to give.
    const info = await readSelectedPair(pc).catch(() => null);
    if (!info) return;
    emit({pair: info.pair, relayed: info.relayed, rttMs: info.rttMs});
}

/** One connection of a transfer. */
export interface Link {
    pc: RTCPeerConnection;
    channel: RTCDataChannel;
}

export interface LinkWatch {
    /** Aborts once the connection is lost, or the transfer cancelled. */
    signal: AbortSignal;

    /** Lost (closed, or silent STALL_MS), not cancelled. */
    lost(): boolean;

    stop(): void;
}

/** Watches one connection for loss (STALL_MS has what counts), until it's lost, `cancel` aborts, or stop(). */
export function watchLink(channel: RTCDataChannel, cancel: AbortSignal): LinkWatch {
    const controller = new AbortController();
    let heard = Date.now();
    const onMessage = (): void => {
        heard = Date.now();
    };
    const lose = (): void => controller.abort();
    const timer = window.setInterval(() => {
        if (Date.now() - heard > STALL_MS) lose();
    }, 1000);
    const stop = (): void => {
        window.clearInterval(timer);
        channel.removeEventListener("message", onMessage);
        channel.removeEventListener("close", lose);
        cancel.removeEventListener("abort", lose);
    };
    channel.addEventListener("message", onMessage);
    channel.addEventListener("close", lose);
    cancel.addEventListener("abort", lose);
    controller.signal.addEventListener("abort", stop, {once: true});
    if (cancel.aborted) lose();
    return {
        signal: controller.signal,
        lost: () => !cancel.aborted && (controller.signal.aborted || channel.readyState !== "open"),
        stop,
    };
}

/**
 * Build the ICE server list. The relay (TURN) is offered from the start, beside the direct routes: ICE ranks direct pairs
 * above relayed ones, so it only carries the file when no direct route answers, and there is no failed attempt to wait
 * out first. The API gives none once the month's relay quota is spent. Without it the caller is told (`turnError`), so
 * the UI can say "STUN only" instead of leaving someone to wonder why a relay never appeared, and how long gathering may
 * take with these servers (`gatherMs`).
 */
export async function buildIceServers(
    apiBaseUrl: string,
    signal?: AbortSignal
): Promise<{ servers: RTCIceServer[]; turnError: string | null; gatherMs: number }> {
    const servers: RTCIceServer[] = [{urls: STUN_URLS}];
    const without = (turnError: string) => ({servers, turnError, gatherMs: GATHER_TIMEOUT_MS});

    try {
        const res = await fetch(`${apiBaseUrl}/expedite/p2p/turn`, {method: "POST", signal});
        const json = await res.json().catch(() => null);
        if (!res.ok) return without(json?.error?.message ?? `TURN mint failed (HTTP ${res.status})`);
        const iceServers = json?.data?.iceServers;
        if (!Array.isArray(iceServers) || iceServers.length === 0) return without("TURN mint returned no servers");
        servers.push(...iceServers);
        return {servers, turnError: null, gatherMs: GATHER_TIMEOUT_TURN_MS};
    } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") throw err;
        return without(`TURN mint unreachable: ${(err as Error).message}`);
    }
}

export function createPeer(servers: RTCIceServer[]): RTCPeerConnection {
    return new RTCPeerConnection({iceServers: servers});
}

/**
 * Resolve once ICE gathering finishes, RELAY_GRACE_MS after the first relay
 * candidate, or after the timeout.
 *
 * The timeout matters: a blocked STUN server leaves gathering in "gathering"
 * indefinitely. Host candidates alone can carry a same-LAN transfer, but only
 * when the peer manages to resolve their mDNS (.local) obfuscation — not a given.
 */
export function waitForGathering(pc: RTCPeerConnection, timeoutMs = GATHER_TIMEOUT_MS): Promise<void> {
    if (pc.iceGatheringState === "complete") return Promise.resolve();

    return new Promise((resolve) => {
        let settled = false;
        let grace = 0;
        const done = (): void => {
            if (settled) return;
            settled = true;
            pc.removeEventListener("icegatheringstatechange", onChange);
            pc.removeEventListener("icecandidate", onCandidate);
            window.clearTimeout(timer);
            window.clearTimeout(grace);
            resolve();
        };
        const onChange = (): void => {
            if (pc.iceGatheringState === "complete") done();
        };
        const startGrace = (): void => {
            if (!grace) grace = window.setTimeout(done, RELAY_GRACE_MS);
        };
        const onCandidate = (e: RTCPeerConnectionIceEvent): void => {
            if (e.candidate?.type === "relay") startGrace();
        };
        const timer = window.setTimeout(done, timeoutMs);
        pc.addEventListener("icegatheringstatechange", onChange);
        pc.addEventListener("icecandidate", onCandidate);
        // A pooled relay candidate can already be in the description.
        if (pc.localDescription?.sdp.includes(" typ relay")) startGrace();
    });
}

/** A paired session, for reconnecting: its code and this side's token. */
export interface Pairing {
    apiBaseUrl: string;
    code: string;
    token: string;
}

/** A POST to the paired session (`/reconnect`, `/reconnect/answer`), with this side's token. Throws when offline. */
export async function postSignal<T>(pairing: Pairing, path: string, body: unknown, signal: AbortSignal): Promise<{
    status: number;
    data: T | null
}> {
    const res = await fetch(`${pairing.apiBaseUrl}/expedite/p2p/${pairing.code}${path}`, {
        method: "POST",
        headers: {"Content-Type": "application/json", "X-P2P-Token": pairing.token},
        body: JSON.stringify(body),
        signal,
    });
    const json = await res.json().catch(() => null);
    return {status: res.status, data: res.ok ? json?.data as T : null};
}

export type SignalEvent =
    | { kind: "offer" | "answer"; round: number; sdp: string }
    | { kind: "gone" };

/**
 * One event from the API's reconnect stream: for the receiver, the next round's offer (above `round`); for the sender,
 * the answer to `round`; `gone` once the session is over (the other side ended it). Until then, or until `signal` aborts.
 *
 * Through a network that's still down too: a stream that can't reach the server at all (a laptop between two Wi-Fi
 * networks) closes for good, as EventSource does when no connection can be made, so it's opened again every
 * OFFLINE_RETRY_MS. Only the API's `gone` ends the wait early: a closed stream once read as gone made the side whose
 * network was changing give up at once.
 */
export function waitForSignal(pairing: Pairing, round: number, signal: AbortSignal): Promise<SignalEvent> {
    return new Promise((resolve, reject) => {
        const {apiBaseUrl, code, token} = pairing;
        const url = `${apiBaseUrl}/expedite/p2p/${code}/reconnect/events?token=${encodeURIComponent(token)}&round=${round}`;
        let source: EventSource | null = null;
        let retry = 0;

        const cleanup = (): void => {
            source?.close();
            window.clearTimeout(retry);
            signal.removeEventListener("abort", onAbort);
        };
        const finish = (event: SignalEvent): void => {
            cleanup();
            resolve(event);
        };
        const onAbort = (): void => {
            cleanup();
            reject(new DOMException("Cancelled", "AbortError"));
        };

        const open = (): void => {
            const stream = new EventSource(url);
            source = stream;
            for (const kind of ["offer", "answer"] as const) {
                stream.addEventListener(kind, (ev) => {
                    try {
                        const data = JSON.parse((ev as MessageEvent<string>).data);
                        finish({kind, round: data.round as number, sdp: data[kind] as string});
                    } catch {
                        // Malformed: the round times out and the next one goes.
                    }
                });
            }
            stream.addEventListener("gone", () => finish({kind: "gone"}));
            stream.onerror = () => {
                if (stream.readyState !== EventSource.CLOSED) return;
                stream.close();
                retry = window.setTimeout(open, OFFLINE_RETRY_MS);
            };
        };

        if (signal.aborted) {
            onAbort();
            return;
        }
        signal.addEventListener("abort", onAbort);
        open();
    });
}

/** Resolve after `ms`, or reject on abort. */
export function sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const done = (): void => {
            signal.removeEventListener("abort", onAbort);
            resolve();
        };
        const onAbort = (): void => {
            window.clearTimeout(timer);
            reject(new DOMException("Cancelled", "AbortError"));
        };
        if (signal.aborted) {
            onAbort();
            return;
        }
        const timer = window.setTimeout(done, ms);
        signal.addEventListener("abort", onAbort, {once: true});
    });
}

/** Count local candidates by type straight out of the SDP. */
export function countCandidates(sdp: string): Record<CandidateType, number> {
    const counts: Record<CandidateType, number> = {host: 0, srflx: 0, prflx: 0, relay: 0};
    for (const line of sdp.split(/\r?\n/)) {
        if (!line.startsWith("a=candidate:")) continue;
        const match = / typ (host|srflx|prflx|relay)/.exec(line);
        if (match) counts[match[1] as CandidateType] += 1;
    }
    return counts;
}

export function totalCandidates(counts: Record<CandidateType, number>): number {
    return counts.host + counts.srflx + counts.prflx + counts.relay;
}

export function describeCandidates(counts: Record<CandidateType, number>): string {
    return `${counts.host} host, ${counts.srflx} srflx, ${counts.relay} relay`;
}

export interface PairInfo {
    pair: string;
    relayed: boolean;
    rttMs: number | null;
}

/**
 * Read the candidate pair the data goes through out of getStats().
 *
 * Reports whether the transfer is actually direct or being relayed, since the
 * relay is always on offer and the browser picks.
 */
export async function readSelectedPair(pc: RTCPeerConnection): Promise<PairInfo | null> {
    let report: RTCStats | undefined;
    const stats = await pc.getStats();

    // The pair the data goes through: the transport names it (Chromium, Safari), Firefox marks it `selected`. Not the
    // last nominated one: after a reconnect, the earlier routes' pairs are still in the report.
    stats.forEach((s) => {
        const r = s as RTCStats & { selectedCandidatePairId?: string; selected?: boolean };
        if (r.type === "transport" && r.selectedCandidatePairId) report = stats.get(r.selectedCandidatePairId);
        else if (r.type === "candidate-pair" && r.selected && !report) report = s;
    });

    if (!report) return null;

    const pairStats = report as RTCStats & {
        localCandidateId?: string;
        remoteCandidateId?: string;
        currentRoundTripTime?: number;
    };
    const local = pairStats.localCandidateId
        ? (stats.get(pairStats.localCandidateId) as (RTCStats & { candidateType?: string }) | undefined)
        : undefined;
    const remote = pairStats.remoteCandidateId
        ? (stats.get(pairStats.remoteCandidateId) as (RTCStats & { candidateType?: string }) | undefined)
        : undefined;

    const localType = local?.candidateType ?? "?";
    const remoteType = remote?.candidateType ?? "?";
    const relayed = localType === "relay" || remoteType === "relay";

    return {
        pair: `${localType} ↔ ${remoteType}`,
        relayed,
        // Firefox may report 0 on the offering side.
        // Zero is unreachable over a relay, so treat it as "not measured" rather than rendering a misleading "0 ms".
        rttMs: typeof pairStats.currentRoundTripTime === "number" && pairStats.currentRoundTripTime > 0
            ? Math.round(pairStats.currentRoundTripTime * 1000)
            : null,
    };
}

/** Effective chunk size once the negotiated SCTP limit is known. */
export function resolveChunkSize(pc: RTCPeerConnection): number {
    const max = pc.sctp?.maxMessageSize;
    if (typeof max !== "number" || !Number.isFinite(max) || max <= 0) return DEFAULT_CHUNK_SIZE;
    // Leave headroom under the advertised ceiling.
    return Math.max(16 * 1024, Math.min(DEFAULT_CHUNK_SIZE, Math.floor(max * 0.75)));
}

/**
 * Resolve when the data channel drains below its low-water mark.
 *
 * Also rejects if the channel dies while waiting: a dead connection never
 * fires bufferedamountlow, and a full buffer is exactly when a failing link
 * gets stuck, so without these exits the sender hangs until a manual cancel.
 */
export function waitForDrain(dc: RTCDataChannel, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const cleanup = (): void => {
            dc.removeEventListener("bufferedamountlow", onLow);
            dc.removeEventListener("close", onDead);
            dc.removeEventListener("error", onDead);
            signal?.removeEventListener("abort", onAbort);
        };
        const onLow = (): void => {
            cleanup();
            resolve();
        };
        const onDead = (): void => {
            cleanup();
            reject(new P2PError("The connection broke during the transfer.", `Data channel closed (state ${dc.readyState}).`));
        };
        const onAbort = (): void => {
            cleanup();
            reject(new DOMException("Transfer cancelled", "AbortError"));
        };
        if (signal?.aborted) {
            reject(new DOMException("Transfer cancelled", "AbortError"));
            return;
        }
        dc.addEventListener("bufferedamountlow", onLow);
        dc.addEventListener("close", onDead);
        dc.addEventListener("error", onDead);
        signal?.addEventListener("abort", onAbort);
    });
}

/** Why ICE failed. */
export function iceFailure(pc: RTCPeerConnection, status: P2PStatus): P2PError {
    const {candidates, remoteCandidates, relayed} = status;
    const local = totalCandidates(candidates);
    if (local === 0) {
        return new P2PError(
            "Couldn't connect: this device found no network route. Check your connection, VPN or firewall.",
            "ICE failed, no local candidates."
        );
    }
    // The empty checklist case: our candidates are irrelevant if the peer sent none.
    if (remoteCandidates && totalCandidates(remoteCandidates) === 0) {
        return new P2PError(
            "Couldn't connect: the other device found no network route. A VPN, firewall or browser setting on their side may block it.",
            "ICE failed, no remote candidates."
        );
    }
    // No relay of our own: TURN off, or offered and never answered.
    if (candidates.relay === 0 && !relayed) {
        const remote = remoteCandidates ? ` and ${totalCandidates(remoteCandidates)} remote` : "";
        return new P2PError(
            "Couldn't connect to the other device. A VPN or firewall on either side can block it.",
            `ICE failed, no working pair among ${local} local${remote} candidates, and no relay candidate.`
        );
    }
    return new P2PError("Couldn't connect to the other device.", `ICE failed (state ${pc.iceConnectionState}), no pair nominated.`);
}
