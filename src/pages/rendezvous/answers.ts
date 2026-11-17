// Your answers, by event code, and the name you last answered with (for the next event), kept in this browser. Apart
// from the API's calls (api.ts) so the page's page.ts can list them for the palette without loading those.

const ANSWERS_KEY = "rendezvous:answers";
const NAME_KEY = "rendezvous:name";
// The longest an event lives: its last date is at most 92 days away, and the API keeps it 3 days past that.
const LONGEST_DAYS = 95;

// An answer is kept until its event ends (`until`, the event's expiresAt from the API), so the token lasts as long as
// the event and the palette's list drops it then. One kept before `until` was written has none: it stays the longest
// an event can live from the day it was given.
export type Answer = { token: string; name: string; at: string; until?: string };

// Each entry on its own: one that can't be read (a hand edit, another format) is dropped without the others.
function live(answer: Answer, now: Temporal.Instant): boolean {
    try {
        const end = answer.until ? Temporal.Instant.from(answer.until) : Temporal.Instant.from(answer.at).add({hours: 24 * LONGEST_DAYS});
        return typeof answer.token === "string" && typeof answer.name === "string" && Temporal.Instant.compare(end, now) > 0;
    } catch {
        return false;
    }
}

export function readAnswers(): Record<string, Answer> {
    try {
        const all = JSON.parse(localStorage.getItem(ANSWERS_KEY) ?? "{}") as Record<string, Answer>;
        const now = Temporal.Now.instant();
        return Object.fromEntries(Object.entries(all).filter(([, answer]) => live(answer, now)));
    } catch {
        return {};
    }
}

export const myAnswer = (code: string): Answer | null => readAnswers()[code] ?? null;

export function keepAnswer(code: string, answer: Pick<Answer, "token" | "name" | "until">): void {
    try {
        localStorage.setItem(ANSWERS_KEY, JSON.stringify({...readAnswers(), [code]: {...answer, at: Temporal.Now.instant().toString()}}));
        localStorage.setItem(NAME_KEY, answer.name);
    } catch { /* storage refused (a private window): the answer can't be changed from this page later */
    }
}

export function lastName(): string {
    try {
        return localStorage.getItem(NAME_KEY) ?? "";
    } catch {
        return "";
    }
}
