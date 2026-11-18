// What's pasted in Expedite, from the keys (a paste event) or from a Paste button (the clipboard, read by the page).

/** A paste, by kind: its files (pictures too), and its text. */
export interface Pasted {
    text: string;
    files: File[];
}

/**
 * Reading the clipboard from a click: Chromium and Safari, Firefox from 127 (which shows its own small Paste prompt
 * first). A phone's way to paste a picture, as it has no keys.
 */
export const CAN_READ_CLIPBOARD = typeof navigator !== "undefined" && typeof navigator.clipboard?.read === "function";

/**
 * The clipboard, read by the page: its pictures as files, else its text. Only pictures come as files this way: a
 * browser doesn't give a page the files copied in a folder (their names come as text), where a paste by the keys does.
 * Throws when the browser, or the person at its prompt, refuses.
 */
export async function readClipboard(): Promise<Pasted> {
    const files: File[] = [];
    let text = "";
    for (const item of await navigator.clipboard.read()) {
        const image = item.types.find((type) => type.startsWith("image/"));
        if (image) {
            const blob = await item.getType(image);
            files.push(new File([blob], `pasted.${image.split("/")[1]?.replace("+xml", "") ?? "png"}`, {type: image}));
        } else if (item.types.includes("text/plain")) {
            text += await (await item.getType("text/plain")).text();
        }
    }
    return {text, files};
}

/** What a paste by the keys holds. */
export function pastedBy(e: ClipboardEvent): Pasted {
    return {files: [...(e.clipboardData?.files ?? [])], text: e.clipboardData?.getData("text/plain") ?? ""};
}
