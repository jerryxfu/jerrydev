import {type Board, CELLS, count, flood, GRASS, reach, spread, times, WALL} from "./rules.ts";

// The "best found": the most cells a search finds a way to save. Not proven best, so the page says "found".
//
// A plain beam search did worse than a simple player here: almost every wall saves nothing until a line is closed, so a
// score of the board halfway through can't tell a good half-line from a useless one. What works is a player who builds
// where it delays the fire most (the sum of the times the fire takes to reach each cell, larger when its way is longer),
// unless a wall closes something off now; played many times with a little chance in its choices, keeping the best game.
//
// The same for everyone: a fixed number of games (never "as many as fit in a second", or a slow phone would find less),
// a seeded random, and numbers JavaScript computes the same in every browser.

export type Solution = { saved: number; walls: number[] };

// Out of 65,536 so the closing-off part always wins over the delay part (at most 100 cells times about 50 turns).
const CLOSE = 65536;

/** A seeded random from 0 to 1 (mulberry32). Its own copy: the grids and the best found depend on every number of it. */
export function seeded(seed: number) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const candidates = new Int16Array(CELLS);
const scores = new Float64Array(CELLS);
const order = new Int16Array(CELLS);

// One game. Each turn, every grass cell the fire can still reach is a candidate (a wall anywhere else only costs a
// cell), scored by what it closes off, then by how much it delays the fire. Without `random`, the best one each turn;
// with it, the score's delay part is nudged a little and now and then one of the next few is taken.
function game(start: Board, random: (() => number) | null, walls: number[]): number {
    let board = start;
    walls.length = 0;
    for (;;) {
        flood(board);
        let n = 0;
        for (let i = 0; i < CELLS; i++) if (board[i] === GRASS && times[i]! >= 0) candidates[n++] = i;
        if (!n) return count(board, GRASS);
        const grass = count(board, GRASS) - 1;
        const walled = board.slice();
        for (let k = 0; k < n; k++) {
            const i = candidates[k]!;
            walled[i] = WALL;
            flood(walled);
            walled[i] = GRASS;
            const nudge = random ? 1 + (random() - 0.5) * 0.6 : 1;
            scores[k] = (grass - reach.count) * CLOSE + reach.sum * nudge;
            order[k] = k;
        }
        let pick = 0;
        if (random && random() > 0.7) {
            // One of the four best, at random.
            const top = order.subarray(0, n).sort((a, b) => scores[b]! - scores[a]! || a - b);
            pick = top[Math.floor(random() * Math.min(4, n))]!;
        } else {
            for (let k = 1; k < n; k++) if (scores[k]! > scores[pick]!) pick = k;
        }
        const wall = candidates[pick]!;
        walls.push(wall);
        walled[wall] = WALL;
        const next = spread(walled);
        if (!next) return count(walled, GRASS);
        board = next;
    }
}

/** The simple player: the best-looking wall each turn, no chance. What the grids are checked against. */
export function greedy(start: Board): Solution {
    const walls: number[] = [];
    const saved = game(start, null, walls);
    return {saved, walls};
}

/** The best of the simple player's game and `games` more with a little chance, from `seed`. */
export function solve(start: Board, games: number, seed: number): Solution {
    let best = greedy(start);
    const random = seeded(seed);
    const walls: number[] = [];
    for (let g = 0; g < games; g++) {
        const saved = game(start, random, walls);
        if (saved > best.saved) best = {saved, walls: walls.slice()};
    }
    return best;
}

// The best found, as the page shows it: many games from the start, then, twice, games from each turn of the best game so
// far (its walls up to there kept), which finds better endings to a good beginning. About a second on a
// laptop, in a worker while you play.
const GAMES = 2000;
const PASSES = 2;
const PER_TURN = 100;

export function bestFound(start: Board): Solution {
    let best = solve(start, GAMES, 1);
    let seed = 2;
    for (let pass = 0; pass < PASSES; pass++) {
        const walls = best.walls;
        let board = start;
        for (let k = 0; k < walls.length; k++) {
            const rest = solve(board, PER_TURN, seed++);
            if (rest.saved > best.saved) best = {saved: rest.saved, walls: [...walls.slice(0, k), ...rest.walls]};
            const walled = board.slice();
            walled[walls[k]!] = WALL;
            const next = spread(walled);
            if (!next) break;
            board = next;
        }
    }
    return best;
}
