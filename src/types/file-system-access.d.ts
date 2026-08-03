/**
 * showSaveFilePicker is part of the File System Access API, which is a WICG
 * spec rather than a WHATWG one — lib.dom.d.ts ships the OPFS half
 * (FileSystemFileHandle, FileSystemWritableFileStream) but not the local-disk
 * pickers. Only the picker is declared here; the handle and stream types come
 * from lib.dom.
 *
 * Used by Expedite's Direct P2P receiver to stream a transfer straight to disk.
 * Chromium desktop only — call sites must feature-detect first
 * (see isP2PReceiveSupported in pages/ExpeditePage/types.ts).
 */

interface SaveFilePickerAcceptType {
    description?: string;
    accept: Record<string, string | string[]>;
}

interface SaveFilePickerOptions {
    suggestedName?: string;
    excludeAcceptAllOption?: boolean;
    types?: SaveFilePickerAcceptType[];
    id?: string;
    startIn?: FileSystemHandle | "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
}

interface Window {
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
}
