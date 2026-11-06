// The palette's matching, in two modes, both blind to case and accents: half the posts are in French, and "camera"
// should find "Caméras". Names (pages, projects, titles, themes...) match like fzf: the letters in order, with points
// for letters side by side and for word starts. Post lines match like grep: each word typed is in the line, in any
// order. Fuzzy across a paragraph would find r, e, a, c, t in half the lines.

export type Match = { score: number; positions: number[] };

// The text as it's matched: lower case, without accents, and the same length as the text, so a position in one is a
// position in the other (where the marks go). A character that would change length (an emoji, İ) stays as it is.
export function fold(text: string): string {
    // eslint-disable-next-line no-control-regex
    if (/^[\x00-\x7f]*$/.test(text)) return text.toLowerCase();
    let out = "";
    for (const ch of text) {
        const base = ch.normalize("NFD")[0]!.toLowerCase();
        out += base.length === ch.length ? base : ch;
    }
    return out;
}

// What was typed, as words to look for.
export const termsOf = (query: string): string[] => fold(query).split(/\s+/).filter(Boolean);

// fzf's points (its algorithm v1): every letter found is worth 16, a gap costs 3 to open and 1 for each letter after,
// a word's first letter earns 8 more, the first letter typed counts double, and letters side by side keep the bonus
// of the run's first one (at least 4).
const MATCH = 16;
const GAP_START = -3;
const GAP_MORE = -1;
const BOUNDARY = 8;
const CAMEL = 7;
const RUN = 4;

type CharClass = "lower" | "upper" | "digit" | "other";

const classOf = (ch: string | undefined): CharClass => {
    if (ch === undefined) return "other";
    if (/\p{Ll}/u.test(ch)) return "lower";
    if (/\p{Lu}|\p{Lt}/u.test(ch)) return "upper";
    if (/\p{N}/u.test(ch)) return "digit";
    return /\p{L}/u.test(ch) ? "lower" : "other";
};

// A word's start: after a space or a sign, at a capital inside a word (camelCase), or at a number after letters.
const bonusAt = (before: CharClass, here: CharClass): number => {
    if (here === "other") return 0;
    if (before === "other") return BOUNDARY;
    if (before === "lower" && here === "upper") return CAMEL;
    if (before !== "digit" && here === "digit") return CAMEL;
    return 0;
};

// One word typed, in the text: the first place its letters all appear in order, made as short as it can be from the
// end, then scored. Null if they don't all appear.
function fuzzyTerm(term: string, text: string, folded: string): Match | null {
    let t = 0;
    let end = -1;
    for (let i = 0; i < folded.length; i++) {
        if (folded[i] === term[t] && ++t === term.length) {
            end = i;
            break;
        }
    }
    if (end < 0) return null;
    let start = end;
    for (let i = end, k = term.length - 1; i >= 0; i--) {
        if (folded[i] === term[k] && --k < 0) {
            start = i;
            break;
        }
    }

    const positions: number[] = [];
    let score = 0;
    let gap = false;
    let run = 0;
    let runBonus = 0;
    let before = classOf(text[start - 1]);
    for (let i = start, k = 0; i <= end; i++) {
        const here = classOf(text[i]);
        if (folded[i] === term[k]) {
            positions.push(i);
            score += MATCH;
            let bonus = bonusAt(before, here);
            if (run === 0) runBonus = bonus;
            else {
                if (bonus >= BOUNDARY && bonus > runBonus) runBonus = bonus;
                bonus = Math.max(bonus, runBonus, RUN);
            }
            score += k === 0 ? bonus * 2 : bonus;
            gap = false;
            run++;
            k++;
        } else {
            score += gap ? GAP_MORE : GAP_START;
            gap = true;
            run = 0;
            runBonus = 0;
        }
        before = here;
    }
    return {score, positions};
}

// Every word typed, each anywhere in the text (as fzf takes several words). `folded` is fold(text), when it's kept.
export function fuzzy(terms: string[], text: string, folded = fold(text)): Match | null {
    let score = 0;
    const positions: number[] = [];
    for (const term of terms) {
        const found = fuzzyTerm(term, text, folded);
        if (!found) return null;
        score += found.score;
        positions.push(...found.positions);
    }
    return {score, positions};
}

// Every word typed, as it's written, somewhere in the line: its letters, for the marks. Null if one is missing.
export function grep(terms: string[], folded: string): number[] | null {
    const positions: number[] = [];
    for (const term of terms) {
        const at = folded.indexOf(term);
        if (at < 0) return null;
        for (let i = 0; i < term.length; i++) positions.push(at + i);
    }
    return positions;
}

// Every place each word typed is in the text, as written: the preview marks them all.
export function found(terms: string[], text: string): number[] {
    const folded = fold(text);
    const positions: number[] = [];
    for (const term of terms) {
        for (let at = folded.indexOf(term); at >= 0; at = folded.indexOf(term, at + term.length)) {
            for (let i = 0; i < term.length; i++) positions.push(at + i);
        }
    }
    return positions;
}
