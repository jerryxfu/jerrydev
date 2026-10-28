export type DropType = "text" | "file" | "p2p" | "live";
export type ViewMode = "landing" | "composing" | "created" | "result" | "p2p-send" | "p2p-receive" | "live";

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
    /** A text drop sent as code: its highlighting language (Shiki's id). */
    language?: string;
    fileName?: string;
    mimeType?: string;
    fileUrl?: string;
    /** The same file, answered as an attachment under its name: what a big file is downloaded with. */
    downloadUrl?: string;
    /** The file's SHA-256 (hex) as the sender's browser computed it while uploading; absent if skipped. */
    sha256?: string;
    offer?: string; // (p2p only, SDP offer from the sender)
}

// --- Live rooms ---

/** Someone in a live room, as everyone in it sees them. */
export interface LiveMember {
    id: string;
    name: string;
    /** Their box's colour, 0 to the room's seats - 1: unique in the room. */
    color: number;
    /** They have the room open. */
    online: boolean;
}

/** What someone put in their box: a text, or a file (coming in while it's "pending"). */
export interface LiveItem {
    id: string;
    memberId: string;
    kind: "text" | "file";
    status: "pending" | "complete";
    size: number;
    createdAt: string;
    /** A text recognized as code: its highlighting language (Shiki's id). */
    language?: string;
    text?: string;
    fileName?: string | null;
    mimeType?: string | null;
    /** A finished file's links, signed until the room ends. */
    fileUrl?: string;
    downloadUrl?: string;
}

/** A room as the page opens it: the room, and who you are in it (your token, when the API just gave it). */
export interface LiveRoom {
    code: string;
    createdAt: string;
    expiresAt: string;
    seats: number;
    ownerId: string;
    members: LiveMember[];
    me: { id: string; token?: string };
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

/** The receiver's check of a copy of the file, picked on the device, against the SHA-256 the sender's browser stored. */
export type DownloadCheck = { state: "checking"; progress: number } | { state: "match" } | { state: "mismatch" };

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
    /** Candidates in the peer's SDP, by type. Null until their SDP arrives. */
    remoteCandidates: Record<CandidateType, number> | null;
    /** The ladder phase the transfer was in when it failed. Null while healthy. */
    failedAt: P2PPhase | null;
    /** The peer unreachable: ICE says so while connecting, or the connection was lost mid-transfer. */
    degraded: boolean;
    /** The connection was lost mid-transfer and the two sides are making a new one. */
    reconnecting: boolean;
    /** e.g. "srflx <-> srflx" once a pair is nominated. */
    pair: string | null;
    /** True when the nominated pair goes through a TURN relay. */
    relayed: boolean;
    /** Round-trip time on the nominated pair, ms. */
    rttMs: number | null;
    /** Negotiated SCTP max message size, bytes. Null until the channel opens. */
    maxMessageSize: number | null;
    /** Populated when phase is "failed". */
    error: P2PErrorText | null;
}

/** An error as shown: what happened in plain words, then the precise reason when there's one (in italics). */
export interface P2PErrorText {
    message: string;
    technical: string | null;
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
    /** Wall clock since the first byte moved, ms. Used to calculate average speed */
    elapsedMs: number;
}

export const EMPTY_P2P_STATUS: P2PStatus = {
    phase: "idle",
    detail: "",
    candidates: {host: 0, srflx: 0, prflx: 0, relay: 0},
    remoteCandidates: null,
    failedAt: null,
    degraded: false,
    reconnecting: false,
    pair: null,
    relayed: false,
    rttMs: null,
    maxMessageSize: null,
    error: null,
};

/** The most a Direct P2P drop received in memory can be. */
export const P2P_MEMORY_MAX = 1024 ** 3;

/**
 * How this browser receives a Direct P2P drop. "disk": straight to a file picked first, with showSaveFilePicker (Chromium
 * on a computer). "memory": kept in the tab, up to P2P_MEMORY_MAX, and saved to the downloads once complete (Firefox,
 * Safari). "none": phones and tablets (a finger for main pointer), which pause a page when the screen locks or another
 * app comes up, and close a tab that holds too much.
 */
export type P2PReceiveMode = "disk" | "memory" | "none";

export function p2pReceiveMode(): P2PReceiveMode {
    if (typeof window === "undefined") return "none";
    if ("showSaveFilePicker" in window) return "disk";
    return window.matchMedia("(pointer: coarse)").matches ? "none" : "memory";
}
