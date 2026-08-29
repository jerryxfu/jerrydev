import {type RefObject, useEffect, useRef, useState} from "react";
import {ChevronDown, List} from "lucide-react";
import "./PostToc.scss";

type Heading = { id: string; text: string; level: 2 | 3 };

// Below this a contents list is longer than the thing it indexes. Ordinary posts have a couple of sections and get nothing.
const MIN_HEADINGS = 3;
// Where a heading counts as "the one being read". Must sit at or just below the largest scroll-margin-top in PostPage.scss (124px on narrow screens):
// an anchor jump lands the heading at exactly that offset, and if this line is above it, the tapped section's *predecessor* stays lit.
const ACTIVE_LINE = 72;
// How far past centre the rail scrolls when the active entry drops out of view, in pixels. The jump otherwise lands the active entry dead centre,
// which leaves half the visible list showing sections already read. Raise this to scroll further and keep more of what is coming in view, 0 for centred.
// Keep it well under half the rail's height (750px ish on a laptop) or the entry lands above the top edge.
const RAIL_LOOKAHEAD = 64;

const sameIds = (a: Heading[], b: Heading[]) =>
    a.length === b.length && a.every((heading, i) => heading.id === b[i]?.id);

export default function PostToc({bodyRef, slug}: { bodyRef: RefObject<HTMLElement | null>; slug: string }) {
    const [headings, setHeadings] = useState<Heading[]>([]);
    const [activeId, setActiveId] = useState("");
    const [progress, setProgress] = useState(0);
    const [open, setOpen] = useState(false);
    const barRef = useRef<HTMLDivElement>(null);
    const railRef = useRef<HTMLElement>(null);

    // Ids come from rehype-slug at build time, so this only has to read them back off the DOM.
    useEffect(() => {
        const body = bodyRef.current;
        if (!body) return;

        const read = () => {
            const found = [...body.querySelectorAll<HTMLHeadingElement>("h2[id], h3[id]")].map((el) => ({
                id: el.id,
                level: (el.tagName === "H2" ? 2 : 3) as 2 | 3,
                // rehype-autolink-headings appends a ¶ anchor inside the heading, so textContent would put a pilcrow on the end of every entry in the list.
                text: [...el.childNodes]
                    .filter((node) => !(node instanceof HTMLElement && node.classList.contains("heading_anchor")))
                    .map((node) => node.textContent ?? "")
                    .join("")
                    .trim(),
            }));
            setHeadings((previous) => (sameIds(previous, found) ? previous : found));
        };

        read();
        // The body is a lazy() chunk inside Suspense, so on the first pass this effect runs against an
        // empty container and finds nothing. The observer is the whole reason the list ever populates.
        const observer = new MutationObserver(read);
        observer.observe(body, {childList: true, subtree: true});
        return () => observer.disconnect();
    }, [bodyRef, slug]);

    useEffect(() => {
        const body = bodyRef.current;
        if (!body || headings.length < MIN_HEADINGS) return;

        let frame = 0;
        const measure = () => {
            frame = 0;
            const {top, height} = body.getBoundingClientRect();
            const span = height - window.innerHeight;
            const scrolled = -top;
            setProgress(span > 0 ? Math.min(1, Math.max(0, scrolled / span)) : scrolled >= 0 ? 1 : 0);

            // Last heading past the line wins, so scrolling up reverses cleanly. An IntersectionObserver would need a rootMargin tuned per heading height to behave the same way.
            let current = headings[0]?.id ?? "";
            for (const {id} of headings) {
                const el = document.getElementById(id);
                if (el && el.getBoundingClientRect().top <= ACTIVE_LINE) current = id;
            }
            setActiveId(current);
        };

        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(measure);
        };

        measure();
        window.addEventListener("scroll", onScroll, {passive: true});
        window.addEventListener("resize", onScroll, {passive: true});
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, [headings, bodyRef]);

    // A 42-entry rail is taller than the viewport, so on a long guide the active entry drifts out of the scroll box and the highlight becomes invisible.
    // Only rail.scrollTop is touched, never the page's, so this cannot fight the reading position.
    useEffect(() => {
        const rail = railRef.current;
        if (!rail || !activeId) return;

        const link = rail.querySelector<HTMLAnchorElement>(`a[href="#${activeId}"]`);
        if (!link) return;

        const railBox = rail.getBoundingClientRect();
        const linkBox = link.getBoundingClientRect();
        if (linkBox.top < railBox.top || linkBox.bottom > railBox.bottom) {
            rail.scrollTop += linkBox.top - railBox.top - railBox.height / 2 + linkBox.height / 2 + RAIL_LOOKAHEAD;
        }
    }, [activeId]);

    useEffect(() => {
        if (!open) return;

        const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
        const onPointerDown = (event: PointerEvent) => {
            if (!barRef.current?.contains(event.target as Node)) setOpen(false);
        };

        window.addEventListener("keydown", onKey);
        window.addEventListener("pointerdown", onPointerDown);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("pointerdown", onPointerDown);
        };
    }, [open]);

    // Reads as a length check but is really a narrowing one: noUncheckedIndexedAccess types every
    // index access as possibly undefined, and this is what lets `active` below be a plain Heading.
    const first = headings[0];
    if (!first || headings.length < MIN_HEADINGS) return null;

    const active = headings.find((heading) => heading.id === activeId) ?? first;

    // Plain anchors, not wouter Links: a bare hash is a same-page jump the browser already handles,
    // and the scroll-margin-top on the headings is what stops the navbar covering the target.
    const links = headings.map((heading) => (
        <a
            key={heading.id}
            href={`#${heading.id}`}
            className={
                `posttoc_link posttoc_link--h${heading.level}` +
                (heading.id === activeId ? " is-active" : "")
            }
            onClick={() => setOpen(false)}
        >
            {heading.text}
        </a>
    ));

    return (
        <>
            {/* Wide screens only: there is no room for this beside a 740px column below ~1280px. */}
            <nav className="posttoc_rail" aria-label="Table of contents" ref={railRef}>
                <p className="posttoc_heading">On this page</p>
                <div className="posttoc_links">{links}</div>
            </nav>

            {/* Everything narrower. Collapsed it is a progress bar with the current section on it. */}
            <div className="posttoc_bar" ref={barRef}>
                <button
                    className="posttoc_trigger"
                    onClick={() => setOpen((value) => !value)}
                    aria-expanded={open}
                    aria-label={`Table of contents. Currently reading: ${active.text}`}
                >
                    <List size={15} aria-hidden="true" />
                    <span className="posttoc_current">{active.text}</span>
                    <ChevronDown size={15} aria-hidden="true" className="posttoc_chevron" />
                </button>

                {open && <div className="posttoc_sheet">{links}</div>}

                <div className="posttoc_progress" style={{scale: `${progress} 1`}} />
            </div>
        </>
    );
}
