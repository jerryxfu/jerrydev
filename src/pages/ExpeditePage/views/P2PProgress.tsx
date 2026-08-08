import {type P2PPhase, type P2PSnapshot, type P2PStatus} from "../types.ts";
import {totalCandidates} from "../p2p/peer.ts";
import {formatBytes, formatEta, formatSpeed} from "../utils.ts";
import "./P2PProgress.scss";

interface Props {
    status: P2PStatus;
    snapshot: P2PSnapshot | null;
    /** "send" shows outbound wording, "receive" inbound. */
    role: "send" | "receive";
    /**
     * The current attempt is the automatic relay fallback. Tacks a note onto the
     * headline so a red flash followed by a long amber wait reads as "working on
     * it" rather than "dead, abort now". Lives outside P2PStatus because the
     * engines overwrite `detail` on every phase change and would wipe it.
     */
    relayRetry?: boolean;
}

const PHASE_LABEL: Record<P2PPhase, string> = {
    idle: "Idle",
    gathering: "Gathering",
    signalling: "Signalling",
    "awaiting-peer": "Awaiting peer",
    negotiating: "Negotiating",
    connected: "Connected",
    transferring: "Transferring",
    done: "Done",
    failed: "Failed",
    expired: "Expired",
};

// Colour temperature of each phase: green for a working/finished connection,
// amber for anything still in flight or waiting, red for a dead one.
const PHASE_TONE: Record<P2PPhase, "idle" | "ok" | "warn" | "err"> = {
    idle: "idle",
    gathering: "warn",
    signalling: "warn",
    "awaiting-peer": "warn",
    negotiating: "warn",
    connected: "ok",
    transferring: "ok",
    done: "ok",
    failed: "err",
    expired: "warn",
};

/** Phases with no determinate progress to show — the bar idles in motion instead. */
const WAITING: P2PPhase[] = ["gathering", "signalling", "awaiting-peer", "negotiating"];

/** Phases that represent forward progress, in order. */
const LADDER: P2PPhase[] = [
    "gathering", "signalling", "awaiting-peer", "negotiating", "connected", "transferring", "done",
];

export default function P2PProgress({status, snapshot, role, relayRetry = false}: Props) {
    // Throughput is measured in the transfer engine and arrives on the snapshot.
    const speed = snapshot?.speedBps ?? 0;

    const pct = snapshot && snapshot.totalBytes > 0
        ? (snapshot.transferredBytes / snapshot.totalBytes) * 100
        : 0;
    const remaining = snapshot ? snapshot.totalBytes - snapshot.transferredBytes : 0;
    const eta = speed > 0 ? remaining / speed : Infinity;

    // Once it's over, report the whole-transfer average and how long it actually took instead.
    const finished = status.phase === "done";
    const elapsedSecs = (snapshot?.elapsedMs ?? 0) / 1000;
    const avgSpeed = snapshot && elapsedSecs > 0 ? snapshot.transferredBytes / elapsedSecs : 0;

    const ladderIndex = LADDER.indexOf(status.phase);
    const isError = status.phase === "failed" || status.phase === "expired";
    // "Disconnected" is the connection announcing it is probably dying —
    // paint everything red without waiting for the formal failure.
    const tone = status.degraded && !isError ? "err" : PHASE_TONE[status.phase];
    const waiting = WAITING.includes(status.phase);

    // Where the transfer died, recorded by the engines; a retry resets it.
    const failIdx = status.failedAt ? LADDER.indexOf(status.failedAt) : -1;

    return (
        <div className="expedite_p2p-progress">
            {/* Phase ladder */}
            <div className="expedite_p2p-ladder">
                {LADDER.map((phase, i) => {
                    // On failure: the chip where it died turns red, everything
                    // else resets to gray. A retry walks the ladder again and
                    // overwrites the red with normal progression.
                    const state = status.phase === "failed"
                        ? (i === failIdx ? "failed" : "idle")
                        : isError
                            ? "idle"
                            : i < ladderIndex ? "past" : i === ladderIndex ? "current" : "idle";
                    return (
                        <span
                            key={phase}
                            className={`expedite_p2p-step state-${state}${state === "current" ? ` tone-${tone}` : ""}`}
                        >
                            {PHASE_LABEL[phase]}
                        </span>
                    );
                })}
            </div>

            <div className={`expedite_p2p-headline${isError ? " is-error" : ""}`}>
                <span className="expedite_p2p-phase">{PHASE_LABEL[status.phase]}</span>
                {/* The note rides along only while the connection is still being
                    built. Once it's up (or genuinely dead) it drops off on its
                    own, so nothing upstream has to remember to clear the flag. */}
                {(status.detail || (relayRetry && waiting)) && (
                    <span className="expedite_p2p-detail">
                        {status.detail}
                        {relayRetry && waiting && (
                            <span className="expedite_p2p-detail-retry">
                                {status.detail ? " · " : ""}retrying using TURN...
                            </span>
                        )}
                    </span>
                )}
            </div>

            {/* Waiting: no bytes to count yet, so the bar idles in motion instead */}
            {!snapshot && waiting && (
                <div className={`expedite_p2p-transfer${status.degraded ? " is-degraded" : ""}`}>
                    <div className="expedite_progress-bar is-indeterminate">
                        <div className="expedite_progress-fill" />
                    </div>
                </div>
            )}

            {/* Transfer bar */}
            {snapshot && (
                <div className={`expedite_p2p-transfer${status.degraded ? " is-degraded" : ""}`}>
                    <div className="expedite_progress-bar">
                        <div className="expedite_progress-fill" style={{width: `${pct}%`}} />
                    </div>
                    <div className="expedite_progress-meta">
                        <span>{pct.toFixed(1)}%</span>
                        <span>{formatBytes(snapshot.transferredBytes)} / {formatBytes(snapshot.totalBytes)}</span>
                        <span>{finished ? `${formatSpeed(avgSpeed)} avg` : formatSpeed(speed)}</span>
                        <span>{finished ? `took ${formatEta(elapsedSecs)}` : `ETA ${formatEta(eta)}`}</span>
                    </div>
                </div>
            )}

            {/* Connection readout */}
            <dl className="expedite_p2p-stats">
                <div className="expedite_p2p-stat">
                    <dt>
                        <span className="expedite_p2p-stat-name">Candidates</span>
                        <span className="expedite_p2p-stat-desc">The routes ICE gathered</span>
                    </dt>
                    <dd>
                        {status.candidates.host} host · {status.candidates.srflx} srflx · {status.candidates.relay} relay
                        {status.remoteCandidates && <> · peer {totalCandidates(status.remoteCandidates)}</>}
                    </dd>
                </div>

                <div className="expedite_p2p-stat">
                    <dt>
                        <span className="expedite_p2p-stat-name">Pair</span>
                        <span className="expedite_p2p-stat-desc">The route the data is taking</span>
                    </dt>
                    <dd>
                        {status.pair ? `${status.pair} ${status.relayed ? "(relayed)" : "(direct)"}` : "—"}
                    </dd>
                </div>

                <div className="expedite_p2p-stat">
                    <dt>
                        <span className="expedite_p2p-stat-name">RTT</span>
                        <span className="expedite_p2p-stat-desc">The round trip time to the peer</span>
                    </dt>
                    <dd>{status.rttMs != null ? `${status.rttMs} ms` : "—"}</dd>
                </div>

                <div className="expedite_p2p-stat">
                    <dt>
                        <span className="expedite_p2p-stat-name">SCTP max</span>
                        <span className="expedite_p2p-stat-desc">largest message the channel accepts</span>
                    </dt>
                    <dd>{status.maxMessageSize != null ? `${status.maxMessageSize} B` : "—"}</dd>
                </div>

                {snapshot && (
                    <>
                        <div className="expedite_p2p-stat">
                            <dt>
                                <span className="expedite_p2p-stat-name">Chunks</span>
                                <span className="expedite_p2p-stat-desc">
                                    {role === "send" ? "pieces handed to the channel" : "pieces written to disk"}
                                </span>
                            </dt>
                            <dd>
                                {snapshot.chunks.toLocaleString()}
                                {snapshot.chunkSize > 0 ? ` × ${formatBytes(snapshot.chunkSize)}` : ""}
                            </dd>
                        </div>

                        {role === "send" && (
                            <div className="expedite_p2p-stat">
                                <dt>
                                    <span className="expedite_p2p-stat-name">Buffer</span>
                                    <span className="expedite_p2p-stat-desc">Queued, not yet delivered</span>
                                </dt>
                                <dd>{formatBytes(snapshot.bufferedAmount)}</dd>
                            </div>
                        )}
                    </>
                )}
            </dl>

            {status.error && <p className="expedite_error">{status.error}</p>}
        </div>
    );
}
