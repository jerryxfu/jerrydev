// Ported from Home Island's dynamic background
interface TimeStop {
    hour: number;
    colors: string[];
}

const TIME_COLORS: TimeStop[] = [
    {hour: 0, colors: ["#030306", "#050508", "#07070a", "#08080c", "#09090e", "#0a0a10"]},
    {hour: 4, colors: ["#0f0f18", "#13131d", "#191923", "#1c1c28", "#1f1f2e", "#222230"]},
    {hour: 5, colors: ["#141828", "#1c2038", "#242848", "#2c3058", "#343868", "#3c4078"]},
    {hour: 6, colors: ["#3c3860", "#584878", "#785890", "#9870a8", "#b888c0", "#d8a0d0"]},
    {hour: 7, colors: ["#9080a8", "#b090b8", "#d0a8c8", "#e8c0d0", "#f0d0d8", "#f8e0e8"]},
    {hour: 8, colors: ["#a8d0c8", "#b8dcd0", "#c8e4d8", "#d8ece0", "#e8f4ec", "#f0f8f4"]},
    {hour: 9, colors: ["#c8e8e0", "#d4eee8", "#e0f2ec", "#ecf8f4", "#f4fbf8", "#f8fdfc"]},
    {hour: 11, colors: ["#d8ecd4", "#e4f2dc", "#eef6e4", "#f4f9ee", "#f8fbf4", "#fcfdf8"]},
    {hour: 13, colors: ["#f0edd4", "#f4f0d8", "#f7f3de", "#faf6e6", "#fcf9ee", "#fefcf4"]},
    {hour: 15, colors: ["#f0e8ce", "#f4edd8", "#f7f1e0", "#faf5e8", "#fcf8f0", "#fefbf6"]},
    {hour: 17, colors: ["#d8c8b0", "#e4d4b8", "#f0dcc0", "#f6e4c8", "#faecd0", "#fcf2dc"]},
    {hour: 18, colors: ["#b8c8d4", "#d4c4b0", "#eaccb0", "#f2d8c0", "#f8e4cc", "#fcecd8"]},
    {hour: 19, colors: ["#7890a0", "#a09890", "#c0a898", "#d8bca8", "#ecd0bc", "#f4e0cc"]},
    {hour: 20, colors: ["#303c4c", "#404858", "#505464", "#606070", "#706c7c", "#807888"]},
    {hour: 21, colors: ["#181c28", "#1c2030", "#202438", "#242840", "#282c48", "#2c3050"]},
    {hour: 22, colors: ["#131018", "#16121c", "#191520", "#1c1824", "#1e1a26", "#201c28"]},
    {hour: 23, colors: ["#080608", "#0a080c", "#0c0a10", "#0e0c12", "#100e14", "#120f16"]},
    {hour: 24, colors: ["#030306", "#050508", "#07070a", "#08080c", "#09090e", "#0a0a10"]},
];

export function getDecimalHour(date: Date = new Date()): number {
    return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

function lerpColor(hex1: string, hex2: string, t: number): string {
    const r1 = parseInt(hex1.slice(1, 3), 16), g1 = parseInt(hex1.slice(3, 5), 16), b1 = parseInt(hex1.slice(5, 7), 16);
    const r2 = parseInt(hex2.slice(1, 3), 16), g2 = parseInt(hex2.slice(3, 5), 16), b2 = parseInt(hex2.slice(5, 7), 16);
    const ch = (a: number, b: number) => Math.round(a + (b - a) * t).toString(16).padStart(2, "0");
    return `#${ch(r1, r2)}${ch(g1, g2)}${ch(b1, b2)}`;
}

export function getColorsForTime(hour: number): string[] {
    let before = TIME_COLORS[0];
    let after = TIME_COLORS[1];
    for (let i = 0; i < TIME_COLORS.length - 1; i++) {
        if (hour >= TIME_COLORS[i].hour && hour < TIME_COLORS[i + 1].hour) {
            before = TIME_COLORS[i];
            after = TIME_COLORS[i + 1];
            break;
        }
    }
    const t = (hour - before.hour) / (after.hour - before.hour);
    return before.colors.map((color, i) => lerpColor(color, after.colors[i], t));
}

export function buildGradient(colors: string[]): string {
    return `linear-gradient(135deg, ${colors.map((c, i) => `${c} ${(i / (colors.length - 1)) * 100}%`).join(", ")})`;
}

export function getStarOpacity(hour: number): number {
    if (hour >= 21 || hour < 5) return 1;
    if (hour >= 20 && hour < 21) return hour - 20;
    if (hour >= 5 && hour < 6) return 6 - hour;
    return 0;
}

export function isDarkTime(hour: number): boolean {
    return hour >= 19 || hour < 5;
}

// Static gradient sampling the whole day, for the theme circle in navbar
export function getAllDayGradient(angle = 135): string {
    const startHour = 4;          // begin at dawn
    const steps = 12;
    const stops: string[] = [];
    for (let i = 0; i <= steps; i++) {
        // walk a full 24h starting from dawn, wrapping past midnight
        const hour = (startHour + (i / steps) * 24) % 24;
        const palette = getColorsForTime(Math.min(hour, 23.999));
        const color = palette[0];                 // darkest stop, richer, less washed out
        stops.push(`${color} ${((i / steps) * 100).toFixed(1)}%`);
    }
    return `linear-gradient(${angle}deg, ${stops.join(", ")})`;
}