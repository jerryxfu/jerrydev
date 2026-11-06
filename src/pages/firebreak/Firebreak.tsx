import {useEffect, useMemo, useState} from "react";
import {useLocation, useSearch} from "wouter";
import {CalendarDays, Check, Copy, Eye, EyeOff, Flame, RotateCcw, Shuffle, Undo2} from "lucide-react";
import Navbar from "@/components/Nav/Navbar.tsx";
import Button from "@/components/Button/Button.tsx";
import {copyText, type IsoDay} from "@/utils.ts";
import {type Board, canSpread, CELLS, count, FIRE, flood, GRASS, ROCK, spread, times, WALL} from "./rules.ts";
import type {Solution} from "./solver.ts";
import {dayName, LAUNCH, numberedName} from "./grids.ts";
import Grid, {type Look} from "./Grid.tsx";
import "./Firebreak.scss";

// Firebreak (#83): a fire on a 10 by 10 grid, one wall a turn, save what you can. The rules are in rules.ts, the grids in
// grids.ts, the best found in solver.ts (both made in firebreak.worker.ts). Today's grid is the same for everyone on that
// date; "New grid" gives a numbered one, kept in the address (?grid=4821) so a link opens it again.

// The pause between your wall and the fire's spread, so you see the wall land first; and between spreads once you let it
// burn, so you can follow it.
const SPREAD_MS = 260;
const BURN_MS = 220;
const NUMBERED = 9999;
// Your best on each grid, by its name ("day:2026-11-05", "grid:4821"), the latest 200.
const BEST_KEY = "firebreak:best";
const KEEP = 200;

type Bests = Record<string, number>;

const LEGEND: [Look, string][] = [
    ["grass", "Grass"], ["next", "Burns next"], ["safe", "Safe"], ["fire", "Fire"], ["burnt", "Burnt"], ["wall", "Wall"],
    ["rock", "Rock"],
];

// The grass at a glance: a bar of what's safe, what's at risk and what's burnt, and their counts.
function Tally({tally, over}: { tally: ReturnType<typeof tallyOf>; over: boolean }) {
    const parts = [
        {key: "safe", n: tally.safe, word: over ? "saved" : "safe"},
        {key: "risk", n: tally.risk, word: "at risk"},
        {key: "lost", n: tally.lost, word: "burnt"},
    ].filter((part) => !(over && part.key === "risk"));
    return (
        <div className="fb_tally">
            <div className="fb_tally_bar" aria-hidden>
                {parts.map((part) => part.n > 0 && (
                    <span key={part.key} className={`fb_tally--${part.key}`} style={{flexGrow: part.n}} />
                ))}
            </div>
            <ul className="fb_tally_list">
                {parts.map((part) => (
                    <li key={part.key}><i className={`fb_tally--${part.key}`} />{part.n} {part.word}</li>
                ))}
            </ul>
        </div>
    );
}

function readBests(): Bests {
    try {
        const value: unknown = JSON.parse(localStorage.getItem(BEST_KEY) ?? "{}");
        return value && typeof value === "object" ? value as Bests : {};
    } catch {
        return {};
    }
}

function saveBest(name: string, saved: number) {
    const bests = readBests();
    if ((bests[name] ?? -1) >= saved) return;
    delete bests[name]; // to the end, so the oldest go first
    bests[name] = saved;
    const kept = Object.entries(bests).slice(-KEEP);
    try {
        localStorage.setItem(BEST_KEY, JSON.stringify(Object.fromEntries(kept)));
    } catch {
        // storage blocked or full: the best isn't remembered
    }
}

// One point of a game: the board, when each cell caught fire (in spreads, -1 for never), how many spreads so far, and
// the wall built there (null for the start and the spreads after "Let it burn").
type Step = { board: Board; caught: Int16Array; spreads: number; wall: number | null };

function firstStep(board: Board): Step {
    const caught = new Int16Array(CELLS).fill(-1);
    for (let i = 0; i < CELLS; i++) if (board[i] === FIRE) caught[i] = 0;
    return {board, caught, spreads: 0, wall: null};
}

function spreadStep(step: Step, wall: number | null): Step | null {
    const next = spread(step.board);
    if (!next) return null;
    const caught = step.caught.slice();
    for (let i = 0; i < CELLS; i++) if (next[i] === FIRE && caught[i]! < 0) caught[i] = step.spreads + 1;
    return {board: next, caught, spreads: step.spreads + 1, wall};
}

// A game played to its end from its walls (the best found's).
function replay(start: Board, walls: number[]): Step {
    let step = firstStep(start);
    for (const wall of walls) {
        const board = step.board.slice();
        board[wall] = WALL;
        const walled = {...step, board, wall};
        const next = spreadStep(walled, wall);
        if (!next) return walled;
        step = next;
    }
    for (let next = spreadStep(step, null); next; next = spreadStep(step, null)) step = next;
    return step;
}

function looksOf(step: Step, over: boolean): Look[] {
    flood(step.board);
    return Array.from(step.board, (cell, i): Look => {
        if (cell === ROCK) return "rock";
        if (cell === WALL) return "wall";
        if (cell === GRASS) return over || times[i]! < 0 ? "safe" : times[i] === 1 ? "next" : "grass";
        if (over) return "burnt";
        const age = step.spreads - step.caught[i]!;
        return age === 0 ? "fire" : age === 1 ? "embers" : "burnt";
    });
}

const savedOf = (step: Step) => count(step.board, GRASS);

// The grass as it stands: safe, still at risk, and lost (burning or burnt).
function tallyOf(looks: Look[]) {
    const tally = {safe: 0, risk: 0, lost: 0};
    for (const look of looks) {
        if (look === "safe") tally.safe++;
        else if (look === "grass" || look === "next") tally.risk++;
        else if (look === "fire" || look === "embers" || look === "burnt") tally.lost++;
    }
    return tally;
}

// The grid of that name from the worker, then its best found.
function useGrid(name: string) {
    const [state, setState] = useState<{ name: string; board: Board | null; best: Solution | null }>(
        {name, board: null, best: null},
    );
    useEffect(() => {
        const worker = new Worker(new URL("./firebreak.worker.ts", import.meta.url), {type: "module"});
        worker.onmessage = (event: MessageEvent<
            { type: "grid"; board: Board } | { type: "best"; saved: number; walls: number[] }
        >) => {
            const data = event.data;
            if (data.type === "grid") setState({name, board: data.board, best: null});
            else setState((s) => ({...s, best: {saved: data.saved, walls: data.walls}}));
        };
        worker.postMessage(name);
        return () => worker.terminate();
    }, [name]);
    return state.name === name ? state : {name, board: null, best: null};
}

export default function Firebreak() {
    const search = useSearch();
    const [, navigate] = useLocation();
    const numbered = Number(new URLSearchParams(search).get("grid"));
    const grid = Number.isInteger(numbered) && numbered > 0 ? numbered : null;
    const [today] = useState(() => Temporal.Now.plainDateISO());
    const name = grid ? numberedName(grid) : dayName(today.toString() as IsoDay);
    const {board, best} = useGrid(name);

    const title = grid
        ? `Grid ${grid}`
        : `#${Temporal.PlainDate.from(LAUNCH).until(today).days + 1}`;
    const subtitle = grid ? "A numbered grid" : today.toLocaleString(undefined, {weekday: "long", month: "long", day: "numeric"});
    const link = `${window.location.origin}/firebreak${grid ? `?grid=${grid}` : ""}`;

    const newGrid = () => {
        let next = grid;
        while (next === grid) next = 1 + Math.floor(Math.random() * NUMBERED);
        navigate(`/firebreak?grid=${next}`);
    };

    return (
        <div className="firebreak">
            <Navbar isShrunk={true} />
            <div className="nav-spacer" />

            <main className="firebreak_container">
                <header className="firebreak_header">
                    <h1>Firebreak</h1>
                    <p>A fire spreads across the grass. Build one wall a turn and save all you can.</p>
                </header>

                <div className="firebreak_which">
                    <div className="firebreak_which_name">
                        <strong>{title}</strong>
                        <span>{subtitle}</span>
                    </div>
                    <div className="firebreak_which_buttons">
                        {grid && <Button start={CalendarDays} onClick={() => navigate("/firebreak")}>Today's grid</Button>}
                        <Button start={Shuffle} onClick={newGrid}>New grid</Button>
                    </div>
                </div>

                {board
                    ? <Game key={name} name={name} start={board} best={best} share={`Firebreak ${title}`} link={link} />
                    : <Waiting />}
            </main>
        </div>
    );
}

// The board's place while the worker makes the grid (a moment): the same size, so nothing moves when it comes.
function Waiting() {
    return (
        <div className="firebreak_play">
            <Grid looks={Array<Look>(CELLS).fill("grass")} still label="Board, loading" />
        </div>
    );
}

function Game({name, start, best, share, link}: {
    name: string;
    start: Board;
    best: Solution | null;
    share: string;
    link: string;
}) {
    const [steps, setSteps] = useState<Step[]>(() => [firstStep(start)]);
    // What's under way: the spread after your wall, or the spreads after "Let it burn".
    const [moving, setMoving] = useState<"spread" | "burn" | null>(null);
    const [myBest, setMyBest] = useState<number | null>(() => readBests()[name] ?? null);
    const [showBest, setShowBest] = useState(false);
    const [copied, setCopied] = useState(false);

    const current = steps.at(-1)!;
    const over = !moving && !canSpread(current.board);
    const saved = savedOf(current);
    const walls = steps.filter((s) => s.wall !== null).length;

    // The fire's turn, a moment after yours; or, once you let it burn, one spread after another until it's out. At the
    // end, your best on this grid is kept.
    useEffect(() => {
        if (!moving) return;
        const id = setTimeout(() => {
            const last = steps.at(-1)!;
            const next = spreadStep(last, moving === "spread" ? last.wall : null);
            const done = !next || !canSpread(next.board);
            if (next) setSteps(moving === "spread" ? [...steps.slice(0, -1), next] : [...steps, next]);
            if (moving === "spread" || done) setMoving(null);
            if (done) {
                const score = savedOf(next ?? last);
                saveBest(name, score);
                setMyBest((b) => Math.max(b ?? -1, score));
            }
        }, moving === "spread" ? SPREAD_MS : BURN_MS);
        return () => clearTimeout(id);
    }, [moving, steps, name]);

    const build = (i: number) => {
        if (moving || over || current.board[i] !== GRASS) return;
        const board = current.board.slice();
        board[i] = WALL;
        setSteps([...steps, {...current, board, wall: i}]);
        setMoving("spread");
    };

    // Back to before your last wall, or, after "Let it burn", to before it.
    const undo = () => {
        let n = steps.length;
        if (n <= 1) return;
        if (steps[n - 1]!.wall === null) {
            while (n > 1 && steps[n - 1]!.wall === null) n--;
        } else {
            n--;
        }
        setMoving(null);
        setShowBest(false);
        setSteps(steps.slice(0, n));
    };

    const restart = () => {
        setMoving(null);
        setShowBest(false);
        setSteps(steps.slice(0, 1));
    };

    // U, or Ctrl or Cmd with Z, to undo.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            const mod = event.ctrlKey || event.metaKey;
            if ((key === "u" && !mod && !event.altKey) || (key === "z" && mod && !event.shiftKey)) {
                event.preventDefault();
                undo();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    const bestStep = useMemo(() => (best ? replay(start, best.walls) : null), [start, best]);
    const shown = showBest && bestStep ? bestStep : current;
    const looks = looksOf(shown, over || shown === bestStep);

    const copy = async () => {
        const text = `${share}: ${saved} saved${best ? ` (best found: ${best.saved})` : ""}\n${link}`;
        if (await copyText(text)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    let verdict = "Finding the best…";
    if (best) {
        if (saved > best.saved) verdict = `You beat the best found, ${best.saved}.`;
        else if (saved === best.saved) verdict = "That's the best found.";
        else verdict = `The best found saves ${best.saved}.`;
    }

    return (
        <div className="firebreak_play">
            <Grid
                looks={looks}
                onBuild={build}
                still={showBest}
                label={showBest ? "The best found" : "Board"}
            />

            <div className="firebreak_side">
                <div className="firebreak_status" aria-live="polite">
                    {over ? (
                        <>
                            <p className="firebreak_headline">
                                <span className="firebreak_score">{showBest && best ? best.saved : saved}</span> saved
                            </p>
                            <p className="firebreak_verdict">{showBest ? "The best found's walls." : verdict}</p>
                        </>
                    ) : (
                        <p className="firebreak_headline">
                            {moving === "burn" ? "Letting it burn…" : `Turn ${walls + (moving ? 0 : 1)}: build a wall`}
                        </p>
                    )}
                    <Tally tally={tallyOf(looks)} over={over} />
                </div>

                {over ? (
                    <div className="firebreak_buttons">
                        <Button variant="main" start={copied ? Check : Copy} onClick={() => void copy()}>
                            {copied ? "Copied" : "Copy result"}
                        </Button>
                        <Button start={RotateCcw} onClick={restart}>Try again</Button>
                        <Button start={showBest ? EyeOff : Eye} disabled={!bestStep} onClick={() => setShowBest((s) => !s)}>
                            {showBest ? "Back to yours" : "See the best found"}
                        </Button>
                        <Button start={Undo2} onClick={undo}>Undo</Button>
                    </div>
                ) : (
                    <div className="firebreak_buttons">
                        <Button start={Undo2} disabled={steps.length <= 1} onClick={undo}>Undo</Button>
                        <Button start={RotateCcw} disabled={steps.length <= 1} onClick={restart}>Restart</Button>
                        <Button start={Flame} disabled={moving !== null} onClick={() => setMoving("burn")}>Let it burn</Button>
                    </div>
                )}

                {myBest !== null && <p className="firebreak_note">Your best on this grid: {myBest} saved.</p>}

                <ul className="firebreak_legend" aria-label="Legend">
                    {LEGEND.map(([look, word]) => <li key={look}><i className={`fb_cell fb_cell--${look}`} />{word}</li>)}
                </ul>

                <p className="firebreak_rules">
                    Each turn, build a wall on a grass cell. Then the fire spreads to the grass next to it: up, down, left
                    and right, never across a corner. It ends when the fire can't spread. The grass that's left is saved.
                </p>
                <p className="firebreak_keys">Arrows to move, Enter to build, U to undo.</p>
            </div>
        </div>
    );
}
