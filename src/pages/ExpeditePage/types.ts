export type DropType = "text" | "file" | "p2p";
export type ViewMode = "landing" | "composing" | "created" | "result" | "p2p-send" | "p2p-receive";

export interface DropSettings {
    deletable: boolean;
    maxViews: number | null; // null = infinite
    ttlMs: number;           // 60_000 to 86_400_000
}

export interface DropMeta {
    code: string;
    type: DropType;
    size: number;
    createdAt: string;
    expiresAt: string;
    views: number;
    maxViews: number | null;
    deletable: boolean;
    text?: string;
    fileName?: string;
    mimeType?: string;
    encoding?: string;
    fileUrl?: string;
    offer?: string; // (p2p only, SDP offer from the sender)
}

export const DEFAULT_SETTINGS: DropSettings = {
    deletable: true,
    maxViews: null,
    ttlMs: 43_200_000, // 12h
};

export const TTL_PRESETS = [
    {label: "5 min", value: 300_000},
    {label: "30 min", value: 1_800_000},
    {label: "1 hr", value: 3_600_000},
    {label: "6 hr", value: 21_600_000},
    {label: "12 hr", value: 43_200_000},
    {label: "24 hr", value: 86_400_000},
];

export type PartState = "queued" | "uploading" | "done" | "failed" | "retrying";

export interface PartProgress {
    partNumber: number;
    state: PartState;
    loaded: number;  // bytes uploaded for this part
    total: number;   // part size (last part is smaller)
}

export interface UploadSnapshot {
    mode: "single" | "multipart";
    parts: PartProgress[];
    uploadedBytes: number;  // sum of loaded across parts
    totalBytes: number;     // file size
}

// --- Direct P2P ---

/**
 * Connection lifecycle. Ordered roughly as they occur, though `failed` and
 * `expired` can arrive from any state.
 */
export type P2PPhase =
    | "idle"
    | "gathering"        // local ICE candidates being collected (non-trickle)
    | "signalling"       // POSTing the SDP / fetching the peer's
    | "awaiting-peer"    // sender only: code is live, SSE open, nobody has answered
    | "negotiating"      // remote description applied, DTLS/ICE handshake underway
    | "connected"        // data channel open, no bytes moved yet
    | "transferring"
    | "done"
    | "failed"
    | "expired";         // session TTL elapsed without a peer; sender rotates the code

export type CandidateType = "host" | "srflx" | "prflx" | "relay";

export interface P2PStatus {
    phase: P2PPhase;
    /** one-liner description. */
    detail: string;
    /** Local candidates gathered, by type. */
    candidates: Record<CandidateType, number>;
    /** e.g. "srflx <-> srflx" once a pair is nominated. */
    pair: string | null;
    /** True when the nominated pair goes through a TURN relay. */
    relayed: boolean;
    /** Round-trip time on the nominated pair, ms. */
    rttMs: number | null;
    /** Negotiated SCTP max message size, bytes. Null until the channel opens. */
    maxMessageSize: number | null;
    /** Populated when phase is "failed". */
    error: string | null;
}

export interface P2PSnapshot {
    fileName: string;
    transferredBytes: number;
    totalBytes: number;
    chunks: number;
    chunkSize: number;
    /** Bytes sitting in the SCTP send buffer (the backpressure signal). */
    bufferedAmount: number;
    /** Throughput measured inside the transfer engine. */
    speedBps: number;
}

export const EMPTY_P2P_STATUS: P2PStatus = {
    phase: "idle",
    detail: "",
    candidates: {host: 0, srflx: 0, prflx: 0, relay: 0},
    pair: null,
    relayed: false,
    rttMs: null,
    maxMessageSize: null,
    error: null,
};

/** Receiving streams to disk via showSaveFilePicker. */
export function isP2PReceiveSupported(): boolean {
    return typeof window !== "undefined" && "showSaveFilePicker" in window;
}
