import {fold} from "./match.ts";

// After Enter on a line in a post: on the post's page, the words searched are marked wherever they are (the CSS Custom
// Highlight API, as the browser's own find marks them), and the page jumps to the `nth` place the longest one is found:
// the one on that line, counted in the source. The rendered text can count a little differently (maths, mainly), so it
// lands on the line or near it. Without the API, it only jumps. The marks go with the next page (PaletteHost).

const WAIT = 5000; // for the post's text, which loads on its own

// What's in the post's article now, to tell when it's been replaced: while the next post loads, React keeps the one
// before on screen.
export const currentPost = (): Element | null =>
    document.querySelector(".post_container article.prose")?.firstElementChild ?? null;

// The post's text nodes, without what's drawn twice or not read: KaTeX's MathML copy, the headings' ¶ links.
function textNodes(root: Element): Text[] {
    const nodes: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => node.parentElement?.closest(".katex-mathml, .heading_anchor")
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT,
    });
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    return nodes;
}

// Searched as one text, since code is a node per token: "integrate(lambda" is three of them.
function mark(root: Element, terms: string[], anchor: string, nth: number): void {
    const nodes = textNodes(root);
    const starts: number[] = [];
    let text = "";
    for (const node of nodes) {
        starts.push(text.length);
        text += fold(node.data);
    }
    // The node a place in the text is in, and the place in it.
    const at = (offset: number): [Text, number] => {
        let lo = 0;
        let hi = nodes.length - 1;
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            if (starts[mid]! <= offset) lo = mid;
            else hi = mid - 1;
        }
        return [nodes[lo]!, offset - starts[lo]!];
    };

    const ranges: Range[] = [];
    const places: Range[] = [];
    for (const term of terms) {
        for (let i = text.indexOf(term); i >= 0; i = text.indexOf(term, i + term.length)) {
            const range = document.createRange();
            range.setStart(...at(i));
            range.setEnd(...at(i + term.length));
            ranges.push(range);
            if (term === anchor) places.push(range);
        }
    }
    const place = places[Math.min(nth, places.length - 1)];
    if (!place) return;
    if (typeof Highlight !== "undefined" && CSS.highlights) CSS.highlights.set("palette", new Highlight(...ranges));
    // At once, not smoothly (the page's scroll-behavior): it's a new page opening at its place.
    (place.startContainer.parentElement ?? root).scrollIntoView({block: "center", behavior: "instant"});
}

// `before` is currentPost() from before the page changed (null when it wasn't a post, or is this one).
export function reveal(terms: string[], nth: number, before: Element | null = null): void {
    if (terms.length === 0) return;
    const anchor = terms.reduce((a, b) => (b.length > a.length ? b : a), "");
    const find = () => {
        const body = document.querySelector(".post_container article.prose");
        const first = body?.firstElementChild;
        return body && first && first !== before && fold(body.textContent ?? "").includes(anchor) ? body : null;
    };
    const ready = find();
    if (ready) return mark(ready, terms, anchor, nth);
    const observer = new MutationObserver(() => {
        const body = find();
        if (!body) return;
        stop();
        mark(body, terms, anchor, nth);
    });
    const timer = window.setTimeout(() => stop(), WAIT);
    const stop = () => {
        observer.disconnect();
        window.clearTimeout(timer);
    };
    observer.observe(document.body, {childList: true, subtree: true});
}
