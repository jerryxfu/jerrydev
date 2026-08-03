import {type P2PPhase, type P2PSnapshot, type P2PStatus} from "../types.ts";
import {formatBytes, formatEta, formatSpeed} from "../utils.ts";
import "./P2PProgress.scss";

interface Props {
    status: P2PStatus;
    snapshot: P2PSnapshot | null;
    /** "send" shows outbound wording, "receive" inbound. */
    role: "send" | "receive";
}

const PHASE_LABEL: Record<P2PPhase, string> = {
    idle: "idle",
    gathering: "gathering",
    signalling: "signalling",
    "awaiting-peer": "awaiting peer",
    negotiating: "negotiating",
    connected: "connected",
    transferring: "transferring",
    done: "done",
    failed: "failed",
    expired: "expired",
};

/** Phases that represent forward progress, in order. */
const LADDER: P2PPhase[] = [
    "gathering", "signalling", "awaiting-peer", "negotiating", "connected", "transferring", "done",
];

export default function P2PProgress({status, snapshot, role}: Props) {
    // Throughput is measured in the transfer engine and arrives on the snapshot.
    const speed = snapshot?.speedBps ?? 0;

    const pct = snapshot && snapshot.totalBytes > 0
        ? (snapshot.transferredBytes / snapshot.totalBytes) * 100
        : 0;
    const remaining = snapshot ? snapshot.totalBytes - snapshot.transferredBytes : 0;
    const eta = speed > 0 ? remaining / speed : Infinity;

    const ladderIndex = LADDER.indexOf(status.phase);
    const isError = status.phase === "failed" || status.phase === "expired";

    return (
        <div className="expedite_p2p-progress">
            {/* Phase ladder */}
            <div className="expedite_p2p-ladder">
                {LADDER.map((phase, i) => {
                    const state = isError
                        ? (i < ladderIndex ? "past" : "idle")
                        : i < ladderIndex ? "past" : i === ladderIndex ? "current" : "idle";
                    return (
                        <span key={phase} className={`expedite_p2p-step state-${state}`}>
                            {PHASE_LABEL[phase]}
                        </span>
                    );
                })}
            </div>

            <div className={`expedite_p2p-headline${isError ? " is-error" : ""}`}>
                <span className="expedite_p2p-phase">{PHASE_LABEL[status.phase]}</span>
                {status.detail && <span className="expedite_p2p-detail">{status.detail}</span>}
            </div>

            {/* Transfer bar */}
            {snapshot && (
                <div className="expedite_p2p-transfer">
                    <div className="expedite_progress-bar">
                        <div className="expedite_progress-fill" style={{width: `${pct}%`}} />
                    </div>
                    <div className="expedite_progress-meta">
                        <span>{pct.toFixed(1)}%</span>
                        <span>{formatBytes(snapshot.transferredBytes)} / {formatBytes(snapshot.totalBytes)}</span>
                        <span>{formatSpeed(speed)}</span>
                        <span>ETA {formatEta(eta)}</span>
                    </div>
                </div>
            )}

            {/* Connection readout */}
            <dl className="expedite_p2p-stats">
                <div className="expedite_p2p-stat">
                    <dt>
                        <span className="expedite_p2p-stat-name">Candidates</span>
                        <span className="expedite_p2p-stat-desc">The local routes ICE gathered</span>
                    </dt>
                    <dd>
                        {status.candidates.host} host · {status.candidates.srflx} srflx · {status.candidates.relay} relay
                    </dd>
                </div>

                <div className="expedite_p2p-stat">
                    <dt>
                        <span className="expedite_p2p-stat-name">Pair</span>
                        <span className="expedite_p2p-stat-desc">The route the data is taking</span>
                    </dt>
                    <dd>
                        {status.pair
                            ? `${status.pair} ${status.relayed ? "(relayed)" : "(direct)"}`
                            : "—"}
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
