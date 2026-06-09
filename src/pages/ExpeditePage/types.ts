export type DropType = "text" | "file";
export type ViewMode = "idle" | "uploading" | "created" | "retrieving" | "result";

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