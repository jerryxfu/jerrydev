import {pad2} from "../utils.ts";

// The sync test pattern, drawn from the time alone: a given moment looks the same on every screen, and the whole
// picture repeats once a second. Two screens side by side, or a screen and a camera's view of it, compare at a glance.

// Fixed colours, whatever the site's theme, so two screens match. The pie's two differ in brightness as well as hue, so
// a poor camera still tells them apart; no pure red, which blooms on phone cameras.
export const BACKGROUND = "#0a0a0a"; // SyncPattern.scss has it too, behind the canvas
const AMBER = "#ffb000"; // even seconds
const BLUE = "#2f6bff";  // odd seconds
const TRACK = "#161616";
const LINE = "#3a3a3a";
const TICK = "#777777";
const WHITE = "#ffffff";
const MILLIS = "#9a9a9a";

const FLASH_FOR = 0.05; // of a second: 50 ms, 3 frames at 60 Hz, so a 30 fps camera always catches it

// The layout, in hundredths of the picture's height. The picture is 16:9, so it's WIDE of them across.
const WIDE = 1600 / 9;
const PIE = {x: 51, y: 43, r: 28};
const BALL = {x: 105, top: 15, bottom: 71, w: 10, r: 4};
const SQUARE = {x: 150, y: 27, size: 22};
const RING = {x: 150, y: 59, r: 11};
const TIMECODE = {x: WIDE / 2, y: 93, size: 10};
const STATS = {x: SQUARE.x + SQUARE.size / 2, y: TIMECODE.y, size: 3.5}; // under the right column, on the timecode's line

// t is the wall clock in milliseconds (Date.now()'s time); font is a CSS font family, the page's own; stats is
// frameCounter's text, or nothing.
export function drawPattern(
    ctx: CanvasRenderingContext2D, t: number, width: number, height: number, font: string, stats: string,
): void {
    const second = Math.floor(t / 1000);
    const p = (t - second * 1000) / 1000; // how far into the second, 0 to 1

    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, width, height);

    // The largest 16:9 picture that fits, centred (black bars around it on a screen of another shape).
    const unit = Math.min(height, (width * 9) / 16) / 100;
    ctx.save();
    ctx.translate((width - unit * WIDE) / 2, (height - unit * 100) / 2);
    ctx.scale(unit, unit);
    ctx.lineCap = "round";

    pie(ctx, second, p);
    ball(ctx, p);
    flash(ctx, p);
    ring(ctx, p);
    timecode(ctx, second, p, font);
    if (stats) corner(ctx, stats, font);

    ctx.restore();
}

// A hand turns once a second, and this second's colour sweeps over the last one's. Ten ticks around it, 100 ms apart.
function pie(ctx: CanvasRenderingContext2D, second: number, p: number) {
    const {x, y, r} = PIE;
    const top = -Math.PI / 2;
    const hand = top + p * 2 * Math.PI;

    disc(ctx, x, y, r, second % 2 ? AMBER : BLUE);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, top, hand);
    ctx.closePath();
    ctx.fillStyle = second % 2 ? BLUE : AMBER;
    ctx.fill();

    for (let k = 0; k < 10; k++) {
        const a = top + (k / 10) * 2 * Math.PI;
        const out = k === 0 ? r + 7 : r + 5; // the second's start, longer and white
        line(ctx, x + (r + 2) * Math.cos(a), y + (r + 2) * Math.sin(a), x + out * Math.cos(a), y + out * Math.sin(a),
            k === 0 ? WHITE : TICK, k === 0 ? 1.2 : 0.8);
    }

    line(ctx, x, y, x + r * Math.cos(hand), y + r * Math.sin(hand), WHITE, 1.2);
    disc(ctx, x, y, 2, WHITE);
}

// A ball goes up and back down once a second, at an even speed so a stutter shows: at the bottom as the second starts,
// at the top half way. The ticks beside it are 100 ms apart, both ways.
function ball(ctx: CanvasRenderingContext2D, p: number) {
    const {x, top, bottom, w, r} = BALL;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, top, w, bottom - top, w / 2);
    ctx.fillStyle = TRACK;
    ctx.fill();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 0.6;
    ctx.stroke();

    const low = bottom - w / 2;
    const high = top + w / 2;
    for (let k = 0; k <= 5; k++) {
        const at = low - (k / 5) * (low - high);
        line(ctx, x + w / 2 + 2, at, x + w / 2 + 5, at, TICK, 0.8);
    }

    const rise = p < 0.5 ? p * 2 : 2 - p * 2;
    disc(ctx, x, low - rise * (low - high), r, WHITE);
}

// A white square for the second's first 50 ms. A square, not the whole screen, which would make a camera's exposure jump.
function flash(ctx: CanvasRenderingContext2D, p: number) {
    const {x, y, size} = SQUARE;
    ctx.beginPath();
    ctx.rect(x - size / 2, y - size / 2, size, size);
    if (p < FLASH_FOR) {
        ctx.fillStyle = WHITE;
        ctx.fill();
    } else {
        ctx.fillStyle = TRACK;
        ctx.fill();
        ctx.strokeStyle = LINE;
        ctx.lineWidth = 0.6;
        ctx.stroke();
    }
}

// A ring, lit as the second starts and fading out over it. Its outline stays, to show where it is.
function ring(ctx: CanvasRenderingContext2D, p: number) {
    const {x, y, r} = RING;
    circle(ctx, x, y, r, LINE, 0.6);
    ctx.globalAlpha = 1 - p;
    circle(ctx, x, y, r, WHITE, 2.5);
    ctx.globalAlpha = 1;
}

// The time of day to the millisecond: take one photo of two screens, and the difference is the delay.
function timecode(ctx: CanvasRenderingContext2D, second: number, p: number, font: string) {
    const date = new Date(second * 1000);
    const parts = [
        {text: `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`, size: TIMECODE.size, color: WHITE},
        {text: `.${String(Math.floor(p * 1000)).padStart(3, "0")}`, size: TIMECODE.size * 0.7, color: MILLIS},
    ].map((part) => {
        ctx.font = `500 ${part.size}px ${font}`;
        return {...part, cells: cells(ctx, part.text)};
    });

    const total = parts.reduce((sum, part) => sum + part.cells.reduce((a, cell) => a + cell.width, 0), 0);
    let x = TIMECODE.x - total / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    for (const part of parts) {
        ctx.font = `500 ${part.size}px ${font}`;
        ctx.fillStyle = part.color;
        for (const {char, width} of part.cells) {
            ctx.fillText(char, x + width / 2, TIMECODE.y);
            x += width;
        }
    }
}

// The frame rate and the frames missed, small in a corner: does this device stutter, or what comes after it?
function corner(ctx: CanvasRenderingContext2D, text: string, font: string) {
    ctx.font = `500 ${STATS.size}px ${font}`;
    ctx.fillStyle = TICK;
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(text, STATS.x, STATS.y);
}

// Each character with its width, every digit as wide as the widest, so the numbers don't shift as they tick (a canvas
// has no tabular figures). Measured in the font set on ctx.
function cells(ctx: CanvasRenderingContext2D, text: string): { char: string; width: number }[] {
    const digit = Math.max(...[..."0123456789"].map((d) => ctx.measureText(d).width));
    return [...text].map((char) => ({char, width: char >= "0" && char <= "9" ? digit : ctx.measureText(char).width}));
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, width: number) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width: number) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
}

// The frame rate and the frames missed, from the gaps between animation frames. The usual gap is the mean of the last
// 60 near their median (timers are rounded to the ms, so a 60 Hz screen's gaps read 16 and 17); a gap of one and a half
// of it or more means frames were missed.
export function frameCounter() {
    let gaps: number[] = [];
    let last: number | null = null;
    let usual = 0;
    let dropped = 0;
    return {
        frame(now: number) {
            if (last !== null) {
                const gap = now - last;
                if (usual && gap > usual * 1.5) dropped += Math.round(gap / usual) - 1;
                gaps.push(gap);
                if (gaps.length > 60) gaps.shift();
                if (gaps.length >= 10) {
                    const median = [...gaps].sort((a, b) => a - b)[gaps.length >> 1] ?? 0;
                    const near = gaps.filter((g) => Math.abs(g - median) <= median / 4);
                    usual = near.reduce((sum, g) => sum + g, 0) / near.length;
                }
            }
            last = now;
        },
        // A hidden tab gets no frames: that pause isn't a drop.
        pause() {
            last = null;
        },
        reset() {
            gaps = [];
            last = null;
            usual = 0;
            dropped = 0;
        },
        text: () => (usual ? `${Math.round(1000 / usual)} fps · ${dropped} dropped` : ""),
    };
}
