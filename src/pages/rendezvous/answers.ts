// Your answers, by event code, and the name you last answered with (for the next event), kept in this browser. Apart
// from the API's calls (api.ts) so the page's page.ts can list them for the palette without loading those.

const ANSWERS_KEY = "rendezvous:answers";
const NAME_KEY = "rendezvous:name";
// An event ends the day after its last date; a month covers it, and drops the answers of events long gone.
const KEPT_DAYS = 31;

export type Answer = { token: string; name: string; at: string };

export function readAnswers(): Record<string, Answer> {
    try {
        const all = JSON.parse(localStorage.getItem(ANSWERS_KEY) ?? "{}") as Record<string, Answer>;
        const since = Temporal.Now.instant().subtract({hours: 24 * KEPT_DAYS});
        return Object.fromEntries(Object.entries(all).filter(([, a]) => Temporal.Instant.compare(a.at, since) > 0));
    } catch {
        return {};
    }
}

export const myAnswer = (code: string): Answer | null => readAnswers()[code] ?? null;

export function keepAnswer(code: string, answer: Omit<Answer, "at">): void {
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
