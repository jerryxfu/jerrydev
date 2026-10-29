// The files picked to send, on the File and Direct P2P screens: one goes as it is, several as a zip (zip.ts).

/** A file to send, and where it goes in the zip: its name, or its path in a folder ("Photos/2026/a.jpg"). */
export interface PickedFile {
    file: File;
    path: string;
}

/** The zip's name before the API adds the code to it (12_files_ABCDE.zip): an older API keeps this one. */
export const stackName = (count: number) => `${count}_files.zip`;

/** One file, or several: "photo.jpg", "12 files". */
export const stackLabel = (files: PickedFile[]) => files.length === 1 ? files[0]!.file.name : `${files.length} files`;

export const stackSize = (files: PickedFile[]) => files.reduce((sum, f) => sum + f.file.size, 0);

// What a Mac leaves in every folder: no one means to send it.
const JUNK = new Set([".DS_Store"]);

/** Files from a file input: with their folder's path when a folder was picked (webkitdirectory). */
export function fromInput(list: FileList | null): PickedFile[] {
    return [...(list ?? [])]
        .filter((file) => !JUNK.has(file.name))
        .map((file) => ({file, path: file.webkitRelativePath || file.name}));
}

/**
 * Files dropped: a folder's, with their paths, read from its entries (webkitGetAsEntry, in every browser). The entries
 * must be taken during the drop event itself; reading them can come after.
 */
export function fromDrop(data: DataTransfer): Promise<PickedFile[]> {
    const entries = [...data.items].map((item) => item.webkitGetAsEntry());
    // No entries (an old browser): the files alone.
    if (!entries.some(Boolean)) return Promise.resolve(fromInput(data.files));
    return Promise.all(entries.map((entry) => entry ? walk(entry) : [])).then((lists) => lists.flat());
}

async function walk(entry: FileSystemEntry): Promise<PickedFile[]> {
    const path = entry.fullPath.replace(/^\/+/, "");
    if (entry.isFile) {
        if (JUNK.has(entry.name)) return [];
        const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
        return [{file, path}];
    }
    if (!entry.isDirectory) return [];
    // A folder gives its entries a batch at a time (100 in Chromium), until an empty one.
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const children: FileSystemEntry[] = [];
    for (; ;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
        if (!batch.length) break;
        children.push(...batch);
    }
    const lists = await Promise.all(children.map(walk));
    return lists.flat();
}

/**
 * The stack with these files added after it. The same file picked twice is there once; another one under a name
 * already taken gets a number, "a (2).jpg", as a zip can't hold two files at one path.
 */
export function addFiles(stack: PickedFile[], added: PickedFile[]): PickedFile[] {
    const result = [...stack];
    const taken = new Set(stack.map((f) => f.path));
    for (const picked of added) {
        // One way to write "é" in every name (a Mac's names come decomposed), or a zip opened on Windows shows two.
        const wanted = picked.path.normalize("NFC");
        const same = result.some((f) => f.path === wanted && f.file.size === picked.file.size
            && f.file.lastModified === picked.file.lastModified);
        if (same) continue;
        const dot = wanted.lastIndexOf(".");
        const named = dot > wanted.lastIndexOf("/") + 1;
        let path = wanted;
        for (let n = 2; taken.has(path); n++) {
            path = named ? `${wanted.slice(0, dot)} (${n})${wanted.slice(dot)}` : `${wanted} (${n})`;
        }
        taken.add(path);
        result.push({file: picked.file, path});
    }
    return result;
}

/** The file whose preview shows under the form: the only one, or the one opened in the stack. */
export function shownFile(files: PickedFile[], open: string | null): PickedFile | null {
    return files.length === 1 ? files[0]! : files.find((f) => f.path === open) ?? null;
}
