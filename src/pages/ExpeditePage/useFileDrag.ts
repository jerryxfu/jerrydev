import {type DragEvent, useRef, useState} from "react";
import {fromDrop, type PickedFile} from "./files.ts";

// Files dragged over an element: whether one is over it now, and the handlers to put on it. Only files: text dragged
// into a text box goes there as usual. With `onFiles` the element takes the dropped files, a folder's with their paths;
// without, it refuses files, so the browser doesn't open one in place of the page (Expedite's root, which leaves the
// drop zones inside it alone).

const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files");

export function useFileDrag(onFiles?: (files: PickedFile[]) => void) {
    const [over, setOver] = useState(false);
    // dragenter and dragleave come for every element crossed inside it, the next one's enter before the last one's
    // leave: a file is over it while the count is above 0.
    const inside = useRef(0);
    const out = () => {
        inside.current = 0;
        setOver(false);
    };

    const handlers = {
        onDragEnter: (e: DragEvent) => {
            if (!hasFiles(e)) return;
            inside.current++;
            setOver(true);
        },
        onDragLeave: (e: DragEvent) => {
            if (hasFiles(e) && --inside.current <= 0) out();
        },
        onDragOver: (e: DragEvent) => {
            // Already taken by a drop zone inside this one.
            if (!hasFiles(e) || e.nativeEvent.defaultPrevented) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = onFiles ? "copy" : "none";
        },
        onDrop: (e: DragEvent) => {
            if (!hasFiles(e)) return;
            const taken = e.nativeEvent.defaultPrevented;
            e.preventDefault();
            out();
            if (!onFiles || taken) return;
            void fromDrop(e.dataTransfer).then((files) => {
                if (files.length) onFiles(files);
            }).catch(() => undefined); // a folder that can't be read: nothing taken
        },
        // No mouse moves come during a drag: one after it means the drag is over, if a leave was ever missed.
        onMouseMove: () => {
            if (inside.current) out();
        },
    };

    return {over, handlers};
}
