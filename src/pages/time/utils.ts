// Helpers shared by the time tools.

export const pad2 = (n: number): string => String(n).padStart(2, "0");

// A length of time as a clock shows it: 05:00, or 1:05:00 past an hour.
export function clockText(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
}

// Three soft pairs of notes over two seconds, made by the browser (no sound file). The AudioContext has to be made on a
// click, or the browser keeps it silent: the countdown makes it on Start and plays this at zero, even from a hidden tab.
export function chime(audio: AudioContext | null): void {
    if (!audio) return;
    const start = audio.currentTime;
    [0, 0.25, 0.9, 1.15, 1.8, 2.05].forEach((at, i) => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = "sine";
        osc.frequency.value = i % 2 ? 880 : 659.25; // E5 then A5
        gain.gain.setValueAtTime(0.0001, start + at);
        gain.gain.exponentialRampToValueAtTime(0.25, start + at + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + at + 0.6);
        osc.connect(gain).connect(audio.destination);
        osc.start(start + at);
        osc.stop(start + at + 0.65);
    });
}

// Calendar days, by the README's rules ("Dates and times"): a YYYY-MM-DD becomes a local midnight (T00:00:00), a Date
// goes back to YYYY-MM-DD through its local fields (never toISOString), and days are counted between local midnights
// with Math.round, since a DST change makes a day 23 or 25 hours long.
export const isoDay = (date: Date): string => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

export const parseDay = (iso: string): Date | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const date = new Date(`${iso}T00:00:00`);
    return isNaN(date.getTime()) ? null : date;
};

export const daysBetween = (from: Date, to: Date): number => Math.round((to.getTime() - from.getTime()) / 86_400_000);

// Day 0 of the next month is the last day of this one.
export const daysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate();
