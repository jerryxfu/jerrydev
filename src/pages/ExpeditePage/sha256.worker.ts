import {sha256} from "@noble/hashes/sha2.js";
import {bytesToHex} from "@noble/hashes/utils.js";

// Hashes the file it's sent, 8 MB at a time: the browser's own SHA-256 (crypto.subtle) wants the whole file in memory at
// once, which a 16 GB drop can't be. Off the page's thread, so the page stays responsive. Reports how far it's got after
// each piece, then the hash.
const CHUNK = 8 * 1024 * 1024;

onmessage = async (event: MessageEvent<Blob>) => {
    // A failure here (the file changed or went away while it was read) never reaches the page's onerror, being in an
    // async function: it's sent instead, or the page would wait for the hash forever.
    try {
        const blob = event.data;
        const hash = sha256.create();
        for (let at = 0; at < blob.size; at += CHUNK) {
            hash.update(new Uint8Array(await blob.slice(at, at + CHUNK).arrayBuffer()));
            postMessage({type: "progress", done: Math.min(at + CHUNK, blob.size)});
        }
        postMessage({type: "done", hex: bytesToHex(hash.digest())});
    } catch (error) {
        postMessage({type: "error", message: error instanceof Error ? error.message : String(error)});
    }
};
