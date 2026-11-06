// Firebreak's rules, on a 10 by 10 board: each turn a wall goes on a grass cell, then the fire spreads to the grass next
// to it (up, down, left, right). It ends when the fire can't spread. What's left of the grass is saved.
// Plain functions over typed arrays, no DOM and no Temporal: the worker runs them, and Node can too.

export const SIZE = 10;
export const CELLS = SIZE * SIZE;

// What a cell is. Fire stays fire once it has caught: a cell burns, then it's burnt, and both spread the same way (the
// page shows how long ago it caught, the rules don't need it).
export const GRASS = 0;
export const ROCK = 1;
export const WALL = 2;
export const FIRE = 3;

export type Board = Uint8Array;

// Each cell's neighbours, four slots a cell, -1 past an edge.
export const NEIGHBOURS = (() => {
    const nb = new Int16Array(CELLS * 4).fill(-1);
    for (let i = 0; i < CELLS; i++) {
        const r = Math.floor(i / SIZE);
        const c = i % SIZE;
        if (r > 0) nb[i * 4] = i - SIZE;
        if (r < SIZE - 1) nb[i * 4 + 1] = i + SIZE;
        if (c > 0) nb[i * 4 + 2] = i - 1;
        if (c < SIZE - 1) nb[i * 4 + 3] = i + 1;
    }
    return nb;
})();

/** The board after one spread, or null when the fire can't spread (the game is over). */
export function spread(board: Board): Board | null {
    const next = board.slice();
    let any = false;
    for (let i = 0; i < CELLS; i++) {
        if (board[i] !== FIRE) continue;
        for (let k = i * 4; k < i * 4 + 4; k++) {
            const j = NEIGHBOURS[k]!;
            if (j >= 0 && next[j] === GRASS) {
                next[j] = FIRE;
                any = true;
            }
        }
    }
    return any ? next : null;
}

export function canSpread(board: Board): boolean {
    for (let i = 0; i < CELLS; i++) {
        if (board[i] !== FIRE) continue;
        for (let k = i * 4; k < i * 4 + 4; k++) {
            const j = NEIGHBOURS[k]!;
            if (j >= 0 && board[j] === GRASS) return true;
        }
    }
    return false;
}

export function count(board: Board, kind: number): number {
    let n = 0;
    for (let i = 0; i < CELLS; i++) if (board[i] === kind) n++;
    return n;
}

/** Builds a wall on cell i, then the fire spreads. The new board, and whether the game is over. */
export function play(board: Board, i: number): { board: Board; over: boolean } {
    const walled = board.slice();
    walled[i] = WALL;
    const next = spread(walled);
    if (!next) return {board: walled, over: true};
    return {board: next, over: !canSpread(next)};
}

// How the fire would go from here with no more walls: when it reaches each grass cell (in turns, -1 for never), how many
// it reaches, and the sum of those times. Shared buffers, so the solver's thousands of calls allocate nothing; a caller
// reads `times` before the next call.
export const times = new Int16Array(CELLS);
const queue = new Int16Array(CELLS);
export const reach = {count: 0, sum: 0, last: 0};

export function flood(board: Board): void {
    times.fill(-1);
    let head = 0;
    let tail = 0;
    for (let i = 0; i < CELLS; i++) {
        if (board[i] === FIRE) {
            times[i] = 0;
            queue[tail++] = i;
        }
    }
    let n = 0;
    let sum = 0;
    let last = 0;
    while (head < tail) {
        const i = queue[head++]!;
        const t = times[i]! + 1;
        for (let k = i * 4; k < i * 4 + 4; k++) {
            const j = NEIGHBOURS[k]!;
            if (j < 0 || board[j] !== GRASS || times[j]! >= 0) continue;
            times[j] = t;
            queue[tail++] = j;
            n++;
            sum += t;
            last = t;
        }
    }
    reach.count = n;
    reach.sum = sum;
    reach.last = last;
}

/** The grass the fire can't reach any more: saved already, whatever happens next. */
export function safe(board: Board): number {
    flood(board);
    return count(board, GRASS) - reach.count;
}
