import {gridFor} from "./grids.ts";
import {bestFound} from "./solver.ts";

// Makes the grid of the name it's sent, sends it, then searches for the best found and sends that: about a second, off
// the page's thread, while you play. One worker per grid (the page ends it for another one).
onmessage = (event: MessageEvent<string>) => {
    const board = gridFor(event.data);
    postMessage({type: "grid", board});
    const best = bestFound(board);
    postMessage({type: "best", saved: best.saved, walls: best.walls});
};
