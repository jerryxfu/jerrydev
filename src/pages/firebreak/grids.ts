import type {IsoDay} from "@/utils.ts";
import {type Board, CELLS, count, FIRE, flood, GRASS, reach, ROCK, SIZE} from "./rules.ts";
import {greedy, seeded, solve} from "./solver.ts";

// The grids: one a day, the same for everyone on that date (their own date, as Wordle), and numbered ones for more.
// A grid comes from its name ("day:2026-11-05", "grid:4821") through a seeded random, so every browser makes the same
// one. Every number below shapes them: change one and every grid changes, today's too.

// The first day's grid is #1.
export const LAUNCH: IsoDay = "2026-11-05";

// Rocks, in short ridges: half-built walls, so the puzzle is which ones to finish, and in what order.
const ROCKS_MIN = 8;
const ROCKS_MAX = 12;
// A fair grid: the fire, left alone, reaches most of the grass (the rocks don't close it in), it takes a while to burn
// out (room to build), and the simple player's game is beaten by a few cells (a real choice to make).
const REACHES = 0.8;
const BURNS_FOR = 6;
const CHOICE = 4;
const CHECK_GAMES = 60;

/** A 32-bit number from a grid's name (FNV-1a). */
export function seedOf(name: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 0x01000193);
    return h >>> 0;
}

function draw(seed: number): Board {
    const random = seeded(seed);
    const pick = (n: number) => Math.floor(random() * n);
    const board = new Uint8Array(CELLS);
    const rocks = ROCKS_MIN + pick(ROCKS_MAX - ROCKS_MIN + 1);
    let placed = 0;
    while (placed < rocks) {
        const across = random() < 0.5;
        const length = 2 + pick(3);
        const r = pick(SIZE);
        const c = pick(SIZE);
        for (let k = 0; k < length && placed < rocks; k++) {
            const rr = across ? r : r + k;
            const cc = across ? c + k : c;
            if (rr >= SIZE || cc >= SIZE || board[rr * SIZE + cc] !== GRASS) continue;
            board[rr * SIZE + cc] = ROCK;
            placed++;
        }
    }
    // The fire, off the edge rows, on grass.
    for (;;) {
        const i = (1 + pick(SIZE - 2)) * SIZE + 1 + pick(SIZE - 2);
        if (board[i] !== GRASS) continue;
        board[i] = FIRE;
        return board;
    }
}

// How much choice a grid leaves, or -1 if it isn't fair.
function choice(board: Board, seed: number): number {
    const grass = count(board, GRASS);
    flood(board);
    if (reach.count < grass * REACHES || reach.last < BURNS_FOR) return -1;
    return solve(board, CHECK_GAMES, seed).saved - greedy(board).saved;
}

/** The grid of that name: the first fair one its seed leads to (the one with the most choice, if none is). */
export function gridFor(name: string): Board {
    const seed = seedOf(name);
    let fallback: Board | null = null;
    let most = -1;
    for (let attempt = 0; attempt < 40; attempt++) {
        const s = seedOf(`${name}#${attempt}`) ^ seed;
        const board = draw(s);
        const gap = choice(board, s);
        if (gap >= CHOICE) return board;
        if (gap > most || !fallback) {
            most = gap;
            fallback = board;
        }
    }
    return fallback!;
}

export const dayName = (day: IsoDay) => `day:${day}`;
export const numberedName = (n: number) => `grid:${n}`;
