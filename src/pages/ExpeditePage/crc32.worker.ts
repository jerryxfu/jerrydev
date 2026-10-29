import {crc32} from "./crc32.ts";

// The CRC-32 of each file it's sent, 8 MB at a time, as sha256.worker.ts reads: what a zip's headers need before the
// zip can be put together (zip.ts). Reports the bytes read so far, across all the files, then the checksums in order.
const CHUNK = 8 * 1024 * 1024;

onmessage = async (event: MessageEvent<Blob[]>) => {
    // Sent rather than thrown, as in sha256.worker.ts: an async function's failure never reaches the page's onerror.
    try {
        const crcs: number[] = [];
        let done = 0;
        for (const blob of event.data) {
            let crc = 0;
            for (let at = 0; at < blob.size; at += CHUNK) {
                const piece = new Uint8Array(await blob.slice(at, at + CHUNK).arrayBuffer());
                crc = crc32(piece, crc);
                done += piece.length;
                postMessage({type: "progress", done});
            }
            crcs.push(crc);
        }
        postMessage({type: "done", crcs});
    } catch (error) {
        postMessage({type: "error", message: error instanceof Error ? error.message : String(error)});
    }
};
