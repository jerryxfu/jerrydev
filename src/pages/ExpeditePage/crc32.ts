// CRC-32 (the zip format's checksum, zlib's polynomial), 8 bytes at a time with eight tables: about 1 GB/s in a worker.
// Pass the last result back in to go on with the next piece of the same file.

const TABLES = (() => {
    const t = new Uint32Array(8 * 256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c;
    }
    for (let n = 0; n < 256; n++) {
        let c = t[n]!;
        for (let k = 1; k < 8; k++) {
            c = t[c & 0xff]! ^ (c >>> 8);
            t[k * 256 + n] = c;
        }
    }
    return t;
})();

// The tables' and the bytes' reads are all in bounds: the indexes are bytes, or below the length.
export function crc32(bytes: Uint8Array, crc = 0): number {
    const t = TABLES;
    let c = ~crc;
    let i = 0;
    for (const end = bytes.length - 8; i <= end; i += 8) {
        const a = c ^ (bytes[i]! | bytes[i + 1]! << 8 | bytes[i + 2]! << 16 | bytes[i + 3]! << 24);
        const b = bytes[i + 4]! | bytes[i + 5]! << 8 | bytes[i + 6]! << 16 | bytes[i + 7]! << 24;
        c = t[1792 + (a & 0xff)]! ^ t[1536 + ((a >>> 8) & 0xff)]! ^ t[1280 + ((a >>> 16) & 0xff)]! ^ t[1024 + (a >>> 24)]!
            ^ t[768 + (b & 0xff)]! ^ t[512 + ((b >>> 8) & 0xff)]! ^ t[256 + ((b >>> 16) & 0xff)]! ^ t[b >>> 24]!;
    }
    for (; i < bytes.length; i++) c = t[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
    return ~c >>> 0;
}
