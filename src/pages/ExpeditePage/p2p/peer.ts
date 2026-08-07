import type {CandidateType, P2PStatus} from "../types.ts";

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

export class P2PError extends Error {
    /** True for ICE/connectivity failures — the class of error a relay retry can fix. */
    readonly ice: boolean;

    constructor(message: string, ice = false) {
        super(message);
        this.name = "P2PError";
        this.ice = ice;
    }
}

/**
 * Build the ICE server list. TURN is opt-in ,if the credential mint fails the caller is told,
 * so the UI can say "TURN unavailable, STUN only" instead of leaving someone to wonder why a relay never appeared.
 */
export async function buildIceServers(
    apiBaseUrl: string,
    useTurn: boolean,
    signal?: AbortSignal
): Promise<{ servers: RTCIceServer[]; turnError: string | null }> {
    const servers: RTCIceServer[] = [{urls: STUN_URLS}];
    if (!useTurn) return {servers, turnError: null};

    try {
        const res = await fetch(`${apiBaseUrl}/expedite/p2p/turn`, {method: "POST", signal});
        if (!res.ok) {
            const json = await res.json().catch(() => null);
            return {servers, turnError: json?.error?.message ?? `TURN mint failed (HTTP ${res.status})`};
        }
        const json = await res.json();
        const iceServers = json?.data?.iceServers;
        if (!Array.isArray(iceServers) || iceServers.length === 0) {
            return {servers, turnError: "TURN mint returned no servers"};
        }
        servers.push(...iceServers);
        return {servers, turnError: null};
    } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") throw err;
        return {servers, turnError: `TURN mint unreachable: ${(err as Error).message}`};
    }
}

export function createPeer(servers: RTCIceServer[]): RTCPeerConnection {
    return new RTCPeerConnection({
        iceServers: servers,
        // Pre-warming a couple of pools shaves a little off gathering time.
        iceCandidatePoolSize: 2,
    });
}

/**
 * Resolve once ICE gathering finishes, or after the timeout.
 *
 * The timeout matters: a blocked STUN server leaves gathering in "gathering"
 * indefinitely. Host candidates alone can carry a same-LAN transfer, but only
 * when the peer manages to resolve their mDNS (.local) obfuscation — not a given.
 */
export function waitForGathering(pc: RTCPeerConnection, timeoutMs = GATHER_TIMEOUT_MS): Promise<void> {
    if (pc.iceGatheringState === "complete") return Promise.resolve();

    return new Promise((resolve) => {
        let settled = false;
        const done = (): void => {
            if (settled) return;
            settled = true;
            pc.removeEventListener("icegatheringstatechange", onChange);
            window.clearTimeout(timer);
            resolve();
        };
        const onChange = (): void => {
            if (pc.iceGatheringState === "complete") done();
        };
        const timer = window.setTimeout(done, timeoutMs);
        pc.addEventListener("icegatheringstatechange", onChange);
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
 * Read the nominated candidate pair out of getStats().
 *
 * This is what makes the TURN toggle legible. Reports whether the transfer
 * is actually direct or being relayed, rather than leaving the switch a mystery.
 */
export async function readSelectedPair(pc: RTCPeerConnection): Promise<PairInfo | null> {
    let report: RTCStats | undefined;
    const stats = await pc.getStats();

    stats.forEach((s) => {
        const r = s as RTCStats & { state?: string; nominated?: boolean; selected?: boolean };
        if (r.type !== "candidate-pair") return;
        if (r.state !== "succeeded") return;
        // Firefox uses `selected`; Chromium uses `nominated`.
        if (r.nominated || r.selected) report = s;
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
            reject(new P2PError(`Data channel closed mid-transfer (state ${dc.readyState})`));
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

/** Human-readable ICE failure text. */
export function describeIceFailure(pc: RTCPeerConnection, status: P2PStatus): string {
    const {candidates, remoteCandidates, relayed} = status;
    const local = totalCandidates(candidates);
    if (local === 0) {
        return "ICE failed — no local candidates gathered (network blocked or offline)";
    }
    // The empty checklist case: our candidates are irrelevant if the peer sent none.
    if (remoteCandidates && totalCandidates(remoteCandidates) === 0) {
        return "ICE failed — peer sent no network routes (their VPN, firewall, or browser permissions)";
    }
    if (candidates.relay === 0 && !relayed) {
        const remote = remoteCandidates ? `, ${totalCandidates(remoteCandidates)} remote` : "";
        return `ICE failed — no viable pair from ${local} local${remote} candidates, 0 relay (TURN off)`;
    }
    return `ICE failed — connection state ${pc.iceConnectionState}, no pair nominated`;
}
