// Several files sent as one: a zip whose files are stored as they are (no compression), so its size is known before it's
// made and each file inside is one run of its bytes. Written as a File made of the files themselves with small headers
// between them: nothing is copied or held in memory, and the upload and the P2P sender slice it like any file (a part
// retried, a transfer going on from where the receiver is). Read back the same way, from a received copy or from a
// drop's link, a few KB at a time: the stack of files on the receiving side, each one shown or saved on its own.
// Format: PKWARE's APPNOTE.TXT, with Zip64 past 4 GB or 65,535 files (a File drop goes to 16 GB).

/** A file to put in the zip: where it goes (its name, or its path in a folder), and its CRC-32. */
export interface ZipInput {
    path: string;
    file: Blob;
    lastModified: number;
    crc: number;
}

/** A file in a zip, as its central directory describes it. */
export interface ZipEntry {
    path: string;
    /** Its size once out of the zip. */
    size: number;
    compressedSize: number;
    /** 0 stored, 8 deflated. */
    method: number;
    /** Where its local header starts: its bytes follow that header. */
    headerOffset: number;
    lastModified: number;
    /** Stored or deflated, and not encrypted: the page can take it out. */
    readable: boolean;
}

/** Where a zip's bytes are read from: a Blob here (a slice), or a link (a Range request). `end` is exclusive. */
export interface ZipSource {
    size: number;
    read: (start: number, end: number, onProgress?: (loaded: number) => void, signal?: AbortSignal) => Promise<Blob>;
}

const MAX16 = 0xFFFF;
const MAX32 = 0xFFFFFFFF;
const LOCAL = 0x04034b50;
const CENTRAL = 0x02014b50;
const END = 0x06054b50;
const END64 = 0x06064b50;
const LOCATOR64 = 0x07064b50;
const ZIP64_EXTRA = 0x0001;
// Bit 11: the names are UTF-8.
const UTF8 = 0x0800;
// Made by a Unix system (3), so the files' permissions mean something: a plain file, rw-r--r--.
const UNIX = 3 << 8;
const FILE_MODE = (0o100644 << 16) >>> 0;

// The time in a zip is a DOS one: local, to two seconds, from 1980 to 2107.
function dosTime(ms: number): { time: number; date: number } {
    const d = new Date(ms);
    const year = d.getFullYear();
    if (!Number.isFinite(year) || year < 1980) return {time: 0, date: (1 << 5) | 1};
    if (year > 2107) return {time: (23 << 11) | (59 << 5) | 29, date: (127 << 9) | (12 << 5) | 31};
    return {
        time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
        date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
    };
}

function fromDosTime(time: number, date: number): number {
    return new Date(1980 + (date >> 9), ((date >> 5) & 15) - 1, date & 31, time >> 11, (time >> 5) & 63, (time & 31) * 2).getTime();
}

/** The zip of these files, named `name`. Their CRC-32s are needed first (crc32Of). */
export function buildZip(inputs: ZipInput[], name: string): File {
    const encoder = new TextEncoder();
    const parts: BlobPart[] = [];
    const central: Uint8Array[] = [];
    let offset = 0;
    let zip64 = inputs.length >= MAX16;

    for (const input of inputs) {
        const nameBytes = encoder.encode(input.path);
        const size = input.file.size;
        const big = size >= MAX32;
        const far = offset >= MAX32;
        zip64 ||= big || far;
        const needed = big || far ? 45 : 20;
        const {time, date} = dosTime(input.lastModified);

        // Local header: the sizes are known, so no data descriptor follows the bytes.
        const local = new DataView(new ArrayBuffer(30 + nameBytes.length + (big ? 20 : 0)));
        local.setUint32(0, LOCAL, true);
        local.setUint16(4, needed, true);
        local.setUint16(6, UTF8, true);
        local.setUint16(8, 0, true); // stored
        local.setUint16(10, time, true);
        local.setUint16(12, date, true);
        local.setUint32(14, input.crc, true);
        local.setUint32(18, big ? MAX32 : size, true);
        local.setUint32(22, big ? MAX32 : size, true);
        local.setUint16(26, nameBytes.length, true);
        local.setUint16(28, big ? 20 : 0, true);
        new Uint8Array(local.buffer).set(nameBytes, 30);
        if (big) {
            // In a local header, Zip64's field holds both sizes.
            const at = 30 + nameBytes.length;
            local.setUint16(at, ZIP64_EXTRA, true);
            local.setUint16(at + 2, 16, true);
            local.setBigUint64(at + 4, BigInt(size), true);
            local.setBigUint64(at + 12, BigInt(size), true);
        }
        parts.push(local.buffer, input.file);

        // Its entry in the central directory: in its Zip64 field, only the values too big for their own place.
        const extra = (big ? 16 : 0) + (far ? 8 : 0);
        const entry = new DataView(new ArrayBuffer(46 + nameBytes.length + (extra ? 4 + extra : 0)));
        entry.setUint32(0, CENTRAL, true);
        entry.setUint16(4, UNIX | needed, true);
        entry.setUint16(6, needed, true);
        entry.setUint16(8, UTF8, true);
        entry.setUint16(10, 0, true);
        entry.setUint16(12, time, true);
        entry.setUint16(14, date, true);
        entry.setUint32(16, input.crc, true);
        entry.setUint32(20, big ? MAX32 : size, true);
        entry.setUint32(24, big ? MAX32 : size, true);
        entry.setUint16(28, nameBytes.length, true);
        entry.setUint16(30, extra ? 4 + extra : 0, true);
        entry.setUint16(32, 0, true); // no comment
        entry.setUint16(34, 0, true); // disk 0
        entry.setUint16(36, 0, true);
        entry.setUint32(38, FILE_MODE, true);
        entry.setUint32(42, far ? MAX32 : offset, true);
        new Uint8Array(entry.buffer).set(nameBytes, 46);
        if (extra) {
            let at = 46 + nameBytes.length;
            entry.setUint16(at, ZIP64_EXTRA, true);
            entry.setUint16(at + 2, extra, true);
            at += 4;
            if (big) {
                entry.setBigUint64(at, BigInt(size), true);
                entry.setBigUint64(at + 8, BigInt(size), true);
                at += 16;
            }
            if (far) entry.setBigUint64(at, BigInt(offset), true);
        }
        central.push(new Uint8Array(entry.buffer));

        offset += local.byteLength + size;
    }

    const cdOffset = offset;
    const cdSize = central.reduce((sum, entry) => sum + entry.length, 0);
    zip64 ||= cdOffset >= MAX32 || cdSize >= MAX32;
    parts.push(...central.map((entry) => entry.buffer as ArrayBuffer));

    if (zip64) {
        const end64 = new DataView(new ArrayBuffer(56 + 20));
        end64.setUint32(0, END64, true);
        end64.setBigUint64(4, 44n, true); // the size of the rest of this record
        end64.setUint16(12, UNIX | 45, true);
        end64.setUint16(14, 45, true);
        end64.setUint32(16, 0, true);
        end64.setUint32(20, 0, true);
        end64.setBigUint64(24, BigInt(inputs.length), true);
        end64.setBigUint64(32, BigInt(inputs.length), true);
        end64.setBigUint64(40, BigInt(cdSize), true);
        end64.setBigUint64(48, BigInt(cdOffset), true);
        // Its locator, which the end record is found by.
        end64.setUint32(56, LOCATOR64, true);
        end64.setUint32(60, 0, true);
        end64.setBigUint64(64, BigInt(cdOffset + cdSize), true);
        end64.setUint32(72, 1, true);
        parts.push(end64.buffer);
    }

    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, END, true);
    end.setUint16(4, 0, true);
    end.setUint16(6, 0, true);
    end.setUint16(8, Math.min(inputs.length, MAX16), true);
    end.setUint16(10, Math.min(inputs.length, MAX16), true);
    end.setUint32(12, Math.min(cdSize, MAX32), true);
    end.setUint32(16, Math.min(cdOffset, MAX32), true);
    end.setUint16(20, 0, true);
    parts.push(end.buffer);

    return new File(parts, name, {type: "application/zip", lastModified: Date.now()});
}

/**
 * The CRC-32 of each file, in a worker (crc32.worker.ts), reading them once. `onProgress` gets how far it's got, 0 to 1,
 * at most ten times a second. Rejects with an AbortError once `signal` aborts.
 */
export function crc32Of(files: Blob[], onProgress: (fraction: number) => void, signal: AbortSignal): Promise<number[]> {
    const total = files.reduce((sum, file) => sum + file.size, 0);
    const worker = new Worker(new URL("./crc32.worker.ts", import.meta.url), {type: "module"});
    let lastReport = 0;

    return new Promise<number[]>((resolve, reject) => {
        const stop = () => {
            worker.terminate();
            reject(new DOMException("Aborted", "AbortError"));
        };
        if (signal.aborted) return stop();
        signal.addEventListener("abort", stop, {once: true});
        const finish = () => {
            worker.terminate();
            signal.removeEventListener("abort", stop);
        };

        worker.onmessage = (event: MessageEvent<
            { type: "progress"; done: number } | { type: "done"; crcs: number[] } | { type: "error"; message: string }
        >) => {
            const data = event.data;
            if (data.type === "progress") {
                const now = performance.now();
                if (now - lastReport > 100) {
                    lastReport = now;
                    onProgress(total ? data.done / total : 1);
                }
                return;
            }
            finish();
            if (data.type === "error") reject(new Error(data.message || "Couldn't read the files"));
            else resolve(data.crcs);
        };
        worker.onerror = (event) => {
            finish();
            reject(new Error(event.message || "Couldn't read the files"));
        };
        worker.postMessage(files);
    });
}

/** The zip of these files: each one read once for its CRC-32 first, then put together (nothing is copied). */
export async function zipFiles(
    files: { file: File; path: string }[], name: string, onProgress: (fraction: number) => void, signal: AbortSignal,
): Promise<File> {
    const crcs = await crc32Of(files.map((f) => f.file), onProgress, signal);
    return buildZip(files.map((f, i) => ({path: f.path, file: f.file, lastModified: f.file.lastModified, crc: crcs[i]!})), name);
}

// --- Reading ---

/** A zip, by its name or its type: the receiving side shows the files in it. */
export const isZip = (name: string, mimeType?: string | null) =>
    /\.zip$/i.test(name) || mimeType === "application/zip" || mimeType === "application/x-zip-compressed";

/** A zip here: read by slicing it. */
export function blobSource(blob: Blob): ZipSource {
    return {size: blob.size, read: (start, end) => Promise.resolve(blob.slice(start, end))};
}

/**
 * A zip behind a link (a drop's, signed by R2): read a run at a time with Range requests, which need no extra permission.
 * `onProgress` gets the bytes read so far.
 */
export function urlSource(url: string, size: number): ZipSource {
    return {
        size,
        read: async (start, end, onProgress, signal) => {
            if (end <= start) return new Blob([]);
            const res = await fetch(url, {headers: {Range: `bytes=${start}-${end - 1}`}, signal});
            // A whole file (200) instead of the run asked for would be read wrong: only a 206 is the run.
            if (res.status !== 206 || !res.body) throw new Error(`The zip couldn't be read (HTTP ${res.status})`);
            const reader = res.body.getReader();
            const chunks: Uint8Array<ArrayBuffer>[] = [];
            let loaded = 0;
            for (; ;) {
                const {done, value} = await reader.read();
                if (done) break;
                chunks.push(value);
                loaded += value.length;
                onProgress?.(loaded);
            }
            if (loaded !== end - start) throw new Error("The zip couldn't be read: its download was cut short");
            return new Blob(chunks);
        },
    };
}

const bytesOf = async (blob: Blob) => new DataView(await blob.arrayBuffer());
const u64 = (view: DataView, at: number) => Number(view.getBigUint64(at, true));

// A name in UTF-8: the flag says so, and macOS's own zips are UTF-8 without it. Anything else is taken as Latin-1, near
// enough to the old DOS code page for a name.
function decodeName(bytes: Uint8Array): string {
    try {
        return new TextDecoder("utf-8", {fatal: true}).decode(bytes);
    } catch {
        return new TextDecoder("windows-1252").decode(bytes);
    }
}

/**
 * The files in a zip, from its central directory at its end: two or three reads of a few KB. Folders and macOS's
 * __MACOSX copies are left out. Null when it isn't a zip the page can read.
 */
export async function readZip(source: ZipSource): Promise<ZipEntry[] | null> {
    try {
        // The end record is the last 22 bytes, unless the zip has a comment (65,535 bytes at most); Zip64's records
        // sit just before it.
        const tailStart = Math.max(0, source.size - (22 + MAX16 + 76));
        const tail = await bytesOf(await source.read(tailStart, source.size));
        let endAt = -1;
        for (let at = tail.byteLength - 22; at >= 0; at--) {
            if (tail.getUint32(at, true) === END && at + 22 + tail.getUint16(at + 20, true) === tail.byteLength) {
                endAt = at;
                break;
            }
        }
        if (endAt < 0) return null;

        let count = tail.getUint16(endAt + 10, true);
        let cdSize = tail.getUint32(endAt + 12, true);
        let cdOffset = tail.getUint32(endAt + 16, true);
        if (endAt >= 20 && tail.getUint32(endAt - 20, true) === LOCATOR64) {
            const end64At = u64(tail, endAt - 20 + 8);
            const end64 = end64At >= tailStart
                ? new DataView(tail.buffer, end64At - tailStart, 56)
                : await bytesOf(await source.read(end64At, end64At + 56));
            if (end64.getUint32(0, true) !== END64) return null;
            count = u64(end64, 32);
            cdSize = u64(end64, 40);
            cdOffset = u64(end64, 48);
        }
        if (cdOffset + cdSize > source.size) return null;

        const cd = cdOffset >= tailStart
            ? new DataView(tail.buffer, cdOffset - tailStart, cdSize)
            : await bytesOf(await source.read(cdOffset, cdOffset + cdSize));
        const entries: ZipEntry[] = [];
        let at = 0;
        for (let i = 0; i < count; i++) {
            if (at + 46 > cd.byteLength || cd.getUint32(at, true) !== CENTRAL) return null;
            const flags = cd.getUint16(at + 8, true);
            const method = cd.getUint16(at + 10, true);
            let compressedSize = cd.getUint32(at + 20, true);
            let size = cd.getUint32(at + 24, true);
            const nameLength = cd.getUint16(at + 28, true);
            const extraLength = cd.getUint16(at + 30, true);
            const commentLength = cd.getUint16(at + 32, true);
            let headerOffset = cd.getUint32(at + 42, true);
            const lastModified = fromDosTime(cd.getUint16(at + 12, true), cd.getUint16(at + 14, true));
            const path = decodeName(new Uint8Array(cd.buffer, cd.byteOffset + at + 46, nameLength));

            // Zip64's field: the values too big for their own place, in this order.
            for (let x = at + 46 + nameLength, extraEnd = x + extraLength; x + 4 <= extraEnd;) {
                const id = cd.getUint16(x, true);
                const length = cd.getUint16(x + 2, true);
                if (id === ZIP64_EXTRA) {
                    let v = x + 4;
                    if (size === MAX32) size = u64(cd, (v += 8) - 8);
                    if (compressedSize === MAX32) compressedSize = u64(cd, (v += 8) - 8);
                    if (headerOffset === MAX32) headerOffset = u64(cd, v);
                }
                x += 4 + length;
            }
            at += 46 + nameLength + extraLength + commentLength;

            if (path.endsWith("/") || path.startsWith("__MACOSX/")) continue;
            entries.push({
                path, size, compressedSize, method, headerOffset, lastModified,
                readable: !(flags & 1) && (method === 0 || method === 8),
            });
        }
        return entries;
    } catch {
        return null;
    }
}

/** A file out of the zip: its bytes after its local header (whose length only it knows), inflated if they were deflated. */
export async function entryData(
    source: ZipSource, entry: ZipEntry, onProgress?: (fraction: number) => void, signal?: AbortSignal,
): Promise<Blob> {
    if (!entry.readable) throw new Error("This file can't be taken out of the zip here");
    const header = await bytesOf(await source.read(entry.headerOffset, entry.headerOffset + 30, undefined, signal));
    if (header.getUint32(0, true) !== LOCAL) throw new Error("The zip is damaged");
    const start = entry.headerOffset + 30 + header.getUint16(26, true) + header.getUint16(28, true);
    const data = await source.read(start, start + entry.compressedSize,
        (loaded) => onProgress?.(entry.compressedSize ? loaded / entry.compressedSize : 1), signal);
    if (entry.method === 0) return data;
    return new Response(data.stream().pipeThrough(new DecompressionStream("deflate-raw"))).blob();
}
