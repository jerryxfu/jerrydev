// A PDF's first page as a picture, drawn by pdf.js (Mozilla's, the viewer inside Firefox): in a stack's rows and in a
// live room's cards. Loaded the first time a PDF shows (about 450 KB, and a 1.2 MB worker), never on a page without one.
// One PDF is drawn at a time, through one worker, so a stack of them doesn't start a dozen.

type PdfJs = typeof import("pdfjs-dist");

let library: Promise<{ lib: PdfJs; worker: InstanceType<PdfJs["PDFWorker"]> }> | null = null;

function load() {
    library ??= Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")])
        .then(([lib, src]) => {
            lib.GlobalWorkerOptions.workerSrc = src.default;
            return {lib, worker: new lib.PDFWorker()};
        });
    // A load that failed (offline) is tried again the next time.
    library.catch(() => {
        library = null;
    });
    return library;
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Draws page 1 of this PDF into the canvas, `width` CSS pixels wide at the screen's density (its height follows the
 * page). From its bytes, all of them: pdf.js reads every page's object when it opens a PDF that isn't linearized (most
 * aren't), which can be spread all through it, so reading only page 1's parts saves nothing.
 */
export function drawPdfPage(pdf: Blob, canvas: HTMLCanvasElement, width: number): Promise<void> {
    const run = queue.then(async () => {
        const {lib, worker} = await load();
        const task = lib.getDocument({data: new Uint8Array(await pdf.arrayBuffer()), worker, verbosity: 0});
        const doc = await task.promise;
        try {
            const page = await doc.getPage(1);
            const scale = width * Math.min(window.devicePixelRatio || 1, 3) / page.getViewport({scale: 1}).width;
            const viewport = page.getViewport({scale});
            canvas.width = Math.round(viewport.width);
            canvas.height = Math.round(viewport.height);
            await page.render({canvas, viewport}).promise;
        } finally {
            // The document's memory, in the worker too. The worker stays, for the next PDF.
            void task.destroy();
        }
    });
    queue = run.catch(() => undefined);
    return run;
}
