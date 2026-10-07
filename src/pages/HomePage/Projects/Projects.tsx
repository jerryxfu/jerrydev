import {type ReactNode, useEffect, useId, useLayoutEffect, useMemo, useRef, useState} from "react";
import {gsap} from "gsap";
import {Flip} from "gsap/Flip";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {ScrollToPlugin} from "gsap/ScrollToPlugin";
import {useGSAP} from "@gsap/react";
import {ArrowUpRight, X} from "lucide-react";
import {Link} from "wouter";
import "./Projects.scss";
import SectionTitle from "@/components/SectionTitle/SectionTitle.tsx";
import Chip from "@/components/Chip/Chip.tsx";
import {formatDate} from "@/utils.ts";
import {isDarkTheme, useTheme} from "@/context/ThemeContext.tsx";
import {CATEGORIES, type Category, categoryIds, firstYear, imageFor, type Project, projects} from "./projects.ts";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, Flip);

// Every project as a small card: the picture on the left, a link to the project; the title, the subtitle, the tags and
// the status on the right. A click anywhere else opens the card in place into the full card, picture on top: the grid
// makes room around it, each card setting off a little after the ones nearer the click, and settling with a spring.

const COUNTS = new Map(categoryIds.map((id) => [id, projects.filter((project) => project.categories.includes(id)).length]));

// A damped spring as an ease: it overshoots by about 5%, swings back once, and is still by the end.
function spring(damping: number, stiffness: number) {
    const wd = stiffness * Math.sqrt(1 - damping * damping);
    const at = (t: number) => 1 - Math.exp(-damping * stiffness * t) * (Math.cos(wd * t) + (damping * stiffness / wd) * Math.sin(wd * t));
    const end = at(1);
    return (t: number) => (t >= 1 ? 1 : at(t) / end);
}

const SPRING = spring(0.68, 10);
const DURATION = 0.8;
// The ripple: a card sets off later the farther it is from the clicked one.
const RIPPLE = 0.00028; // seconds per pixel
const RIPPLE_MAX = 0.3;

const isVideo = (src: unknown): src is string => typeof src === "string" && /\.(mp4|webm|ogg|mov)$/i.test(src);
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const columnsOf = (list: HTMLElement) => getComputedStyle(list).gridTemplateColumns.split(" ").length;
const itemsOf = (list: HTMLElement) => [...list.querySelectorAll<HTMLElement>(":scope > .projects-item")];
const centre = (r: DOMRect) => [r.left + r.width / 2, r.top + r.height / 2] as const;
// A scheme or a protocol-relative prefix: the link leaves the site (the same test as Card.tsx's).
const external = (href: string) => /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(href);
// A project's own link opens in a new tab when it's another site, as on Card.tsx.
const newTab = (href: string) => (href.startsWith("http") ? {target: "_blank", rel: "noopener noreferrer"} : {});

// The grid cell an item sits in, read from the layout: the grid's resolved tracks (implicit rows included) and the
// item's offset in it.
function cellOf(list: HTMLElement, li: HTMLElement) {
    const style = getComputedStyle(list);
    const line = (tracks: string, gap: string, at: number) => {
        let start = 0;
        let found = 1;
        tracks.split(" ").map(parseFloat).forEach((size, i) => {
            if (at >= start - 1) found = i + 1;
            start += size + (parseFloat(gap) || 0);
        });
        return found;
    };
    return {
        row: line(style.gridTemplateRows, style.rowGap, li.offsetTop - list.offsetTop - parseFloat(style.paddingTop)),
        col: line(style.gridTemplateColumns, style.columnGap, li.offsetLeft - list.offsetLeft - parseFloat(style.paddingLeft)),
    };
}

// How many rows the open card spans. Preferably a span that moves the cards after it by whole rows (4 rows in 3
// columns moves them 3 places, exactly one row; 3 rows in 2 columns, the same): the rest of the grid then slides
// straight down instead of shuffling sideways. The picture takes up whatever room the rows leave, up to a square.
function fitSpan(list: HTMLElement, open: HTMLElement): number {
    const columns = columnsOf(list);
    if (columns < 2) return 1;
    const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
    open.style.setProperty("--span", "1");
    const need = open.offsetHeight;
    const roomy = open.offsetWidth * (1 - 9 / 16);
    const heights = itemsOf(list).filter((li) => li !== open).map((li) => li.offsetHeight).sort((a, b) => a - b);
    const row = heights[Math.floor(heights.length / 2)] ?? 120;
    let best = 1;
    let bestCost = Infinity;
    for (let n = 2; n <= 8; n++) {
        const slack = n * row + (n - 1) * gap - need;
        if (slack > roomy) break;
        const cost = Math.abs(slack) + ((n - 1) % columns === 0 ? 0 : row * 1.5);
        if (cost < bestCost) {
            best = n;
            bestCost = cost;
        }
    }
    return best;
}

// How far to scroll for the open card to be all on screen, under the navbar, if it fits.
function scrollToShow(item: HTMLElement): number {
    const r = item.getBoundingClientRect();
    const top = 96;
    const bottom = window.innerHeight - 24;
    const dy = r.bottom > bottom ? Math.min(r.bottom - bottom, r.top - top) : r.top < top ? r.top - top : 0;
    return Math.abs(dy) > 4 ? dy : 0;
}

// The page scrolls smoothly by CSS (index.scss), which would ease every step of a scroll tween again, or turn a jump
// into a glide: off while one of ours runs.
const smoothScroll = (on: boolean) => on
    ? document.documentElement.style.removeProperty("scroll-behavior")
    : document.documentElement.style.setProperty("scroll-behavior", "auto");

// The open card, and the grid cell it opens in (1-based lines): wherever it was when clicked, so it never jumps away
// from the pointer, even when another card closes as it opens.
type Open = { title: string; columns: number; row: number; col: number };

// What a click recorded just before the layout changed, for the layout effect to animate from. No state with reduced
// motion: the grid goes straight to its new layout.
type Pending = {
    state: Flip.FlipState | null;
    rects: Map<HTMLElement, DOMRect>;
    origin: HTMLElement;
    // The card that was open before the click, if any.
    closing?: HTMLElement;
    height: number;
};

export default function Projects() {
    const {currentTheme} = useTheme();
    const dark = isDarkTheme(currentTheme);
    const [category, setCategory] = useState<Category | "all">("all");
    const shown = useMemo(
        () => projects.filter((project) => category === "all" || project.categories.includes(category)),
        [category],
    );

    const grid = useRef<HTMLUListElement>(null);
    const [open, setOpen] = useState<Open | null>(null);
    const pending = useRef<Pending | null>(null);
    const flip = useRef<gsap.core.Timeline | null>(null);
    const scroll = useRef<gsap.core.Tween | null>(null);
    // While a click records the layout, a Flip it interrupts completes; its cleanup must not run then.
    const recording = useRef(false);

    const toggle = (title: string) => {
        const list = grid.current;
        if (!list) return;
        const items = itemsOf(list);
        const byTitle = (t?: string) => items.find((li) => li.dataset.title === t);
        const opening = open?.title === title ? undefined : byTitle(title);
        const closing = byTitle(open?.title);
        const changing = [opening, closing].filter((li): li is HTMLElement => !!li);
        const parts = changing.flatMap((li) => [...li.querySelectorAll<HTMLElement>("[data-part]")]);
        // Where everything is right now, mid-animation included, before the layout changes.
        const rects = new Map(items.map((li) => [li, li.getBoundingClientRect()]));
        const height = list.offsetHeight;
        // Recording the state also completes an animation still running, which puts the grid in its last layout.
        // Measured from the boxes the browser reports (simple): GSAP's finer measure places elements by their
        // offsetLeft and offsetTop, which are rounded to whole pixels, and every card would sit up to half a pixel off
        // its place for the length of the animation, then snap back.
        recording.current = true;
        const state = reducedMotion() ? null : Flip.getState([...items, ...parts], {props: "fontSize", simple: true});
        recording.current = false;
        pending.current = {state, rects, origin: opening ?? closing!, closing, height};
        setOpen(opening ? {title, columns: columnsOf(list), ...cellOf(list, opening)} : null);
    };

    // Lays the grid out for the open card, then animates every card from where it was to where it now is.
    useLayoutEffect(() => {
        const list = grid.current;
        if (!list) return;
        const items = itemsOf(list);
        const openItem = open ? items.find((li) => li.dataset.title === open.title) : undefined;
        for (const li of items) {
            if (li === openItem) continue;
            for (const name of ["--span", "--row", "--col"]) li.style.removeProperty(name);
        }
        if (openItem && open) {
            openItem.style.setProperty("--row", String(open.row));
            openItem.style.setProperty("--col", String(open.col));
            openItem.style.setProperty("--span", String(fitSpan(list, openItem)));
        }

        const p = pending.current;
        pending.current = null;
        if (!p) return;
        const dy = openItem ? scrollToShow(openItem) : 0;
        scroll.current?.kill();

        if (!p.state) {
            if (dy) {
                smoothScroll(false);
                window.scrollBy(0, dy);
                smoothScroll(true);
            }
            ScrollTrigger.refresh();
            return;
        }

        const finalHeight = list.offsetHeight;
        // The ripple starts from the card opening and from the one closing, if any.
        const sources = [p.origin, p.closing].filter((li): li is HTMLElement => !!li).map((li) => centre(p.rects.get(li)!));
        const delays = new Map<Element, number>();
        for (const [li, r] of p.rects) {
            const [x, y] = centre(r);
            delays.set(li, Math.min(RIPPLE_MAX, RIPPLE * Math.min(...sources.map(([sx, sy]) => Math.hypot(x - sx, y - sy)))));
        }
        if (p.closing) delays.set(p.closing, 0);

        // Brings the open card into view if it now runs off the screen, scrolling with the cards.
        if (dy) {
            const restore = () => smoothScroll(true);
            smoothScroll(false);
            scroll.current = gsap.to(window, {
                scrollTo: {y: window.scrollY + dy, autoKill: true, onAutoKill: restore},
                duration: DURATION, ease: "power3.inOut", onComplete: restore, onInterrupt: restore,
            });
        }

        flip.current?.kill();
        const tl = Flip.from(p.state, {
            absolute: true,
            nested: true,
            simple: true,
            // The cards that don't move aren't animated at all.
            prune: true,
            props: "fontSize",
            duration: DURATION,
            ease: SPRING,
            stagger: (_i: number, target: Element) => delays.get(target.closest("li")!) ?? 0,
            onEnter: (els) => gsap.fromTo(els, {opacity: 0}, {opacity: 1, duration: 0.35, delay: 0.28, ease: "power1.out"}),
            onLeave: (els) => gsap.to(els, {opacity: 0, duration: 0.15, ease: "power1.in"}),
            onComplete: () => {
                if (!recording.current) ScrollTrigger.refresh();
            },
        });
        // Every card is out of the flow while it moves, so the grid keeps its height, growing or shrinking to the new
        // one with the cards, and the page under it moves smoothly. It lands when the last card does, not later: back
        // in the flow, the cards would stretch to fill a grid still taller than they are.
        tl.fromTo(list, {height: p.height}, {
            height: finalHeight, duration: tl.duration(), ease: "power3.inOut", clearProps: "height",
        }, 0);
        // The card closing stays over the ones sliding into its place.
        if (p.closing && p.closing !== openItem) p.closing.style.zIndex = "1";
        flip.current = tl;
    }, [open, shown]);

    useEffect(() => () => {
        flip.current?.kill();
        scroll.current?.kill();
    }, []);

    // Closing from its close button or Escape puts the focus back on the card, which the close button leaves with.
    const close = (title: string) => {
        const toggleOf = grid.current && itemsOf(grid.current)
            .find((li) => li.dataset.title === title)?.querySelector<HTMLElement>(".projects-card_toggle");
        toggle(title);
        toggleOf?.focus();
    };

    // Escape closes the open card.
    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") close(open.title);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    });

    // A new width can mean a new number of columns. The open card stays open: in the same cell if the columns are the
    // same, back in its own place in the new grid if not, spanning as many rows as it now needs.
    useEffect(() => {
        if (!open) return;
        const onResize = () => {
            const list = grid.current;
            const item = list && itemsOf(list).find((li) => li.dataset.title === open.title);
            if (!list || !item) return;
            flip.current?.progress(1);
            if (columnsOf(list) === open.columns) {
                item.style.setProperty("--span", String(fitSpan(list, item)));
                return;
            }
            for (const name of ["--row", "--col"]) item.style.removeProperty(name);
            item.style.setProperty("--span", "1");
            setOpen({...open, columns: columnsOf(list), ...cellOf(list, item)});
        };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [open]);

    const pickCategory = (next: Category | "all") => {
        flip.current?.progress(1);
        setOpen(null);
        setCategory(next);
    };

    // A new filter brings the cards in, a few at a time. Not on the first render.
    const lastCategory = useRef(category);
    useGSAP(() => {
        if (category === lastCategory.current || !grid.current) return;
        lastCategory.current = category;
        // The section changed height, so every scroll trigger below it (the titles' reveals, the board) is measured
        // again; a stale one would hold the Experience title hidden until long after it's on screen.
        ScrollTrigger.refresh();
        if (reducedMotion()) return;
        gsap.from(grid.current.querySelectorAll(".projects-item_inner"), {
            opacity: 0, y: 10, duration: 0.35, ease: "power2.out", stagger: 0.02, clearProps: "opacity,transform",
        });
    }, {dependencies: [category]});

    return (
        <div className="section projects">
            <SectionTitle
                text={"Projects"}
                description={"A collection of the things I have built over the years. Some are finished and working, others are experiments I learned something from." +
                    ` Click a card to see more; its picture opens the project. ${projects.length} projects since ${firstYear}.`}
            />

            <div className="projects_controls">
                <div className="projects_filters" role="group" aria-label="Filter projects by tag">
                    <FilterChip active={category === "all"} onClick={() => pickCategory("all")} label="All" count={projects.length} />
                    {categoryIds.map((id) => (
                        <FilterChip
                            key={id}
                            active={category === id}
                            onClick={() => pickCategory(id)}
                            label={CATEGORIES[id]}
                            count={COUNTS.get(id) ?? 0}
                        />
                    ))}
                </div>
                <span className="projects_count">{shown.length} of {projects.length}</span>
            </div>

            <div className="projects_wrap">
                <ul className="projects_grid" ref={grid}>
                    {shown.map((project) => (
                        <ProjectItem
                            key={project.title}
                            project={project}
                            dark={dark}
                            open={open?.title === project.title}
                            onToggle={() => toggle(project.title)}
                            onClose={() => close(project.title)}
                        />
                    ))}
                </ul>
            </div>
        </div>
    );
};

// One project. Closed, it's a small horizontal card; open, the same elements make the full vertical card (Card.tsx's
// layout), so each one can travel from its place in one to its place in the other. The whole card is one button, but
// for the closed picture, a link to the project. Open, the picture only closes the card again: someone clicking twice,
// to open it and to close it, has the pointer over the picture the second time. The open card's link to the project
// is in its footer instead.
function ProjectItem({project, dark, open, onToggle, onClose}: {
    project: Project;
    dark: boolean;
    open: boolean;
    onToggle: () => void;
    onClose: () => void;
}) {
    const id = useId();
    const banner = project.specialLink && (
        <>
            <span>{project.specialLinkText ?? "Open article"}</span>
            <span className="projects-card_arrow" aria-hidden="true">→</span>
        </>
    );

    return (
        <li className={`projects-item${open ? " is-open" : ""}`} data-title={project.title}>
            <div className="projects-item_inner">
                <article className="projects-card">
                    <button
                        type="button"
                        className="projects-card_toggle"
                        aria-expanded={open}
                        aria-controls={`${id}-more`}
                        aria-labelledby={`${id}-title`}
                        onClick={onToggle}
                    />
                    <span className="projects-card_media" data-part aria-hidden="true">
                        <Media src={imageFor(project, dark)} />
                    </span>
                    {project.url && (
                        <a
                            className="projects-card_link"
                            href={project.url}
                            aria-label={`Visit ${project.title}`}
                            {...newTab(project.url)}
                        >
                            <ArrowUpRight size={14} strokeWidth={2.25} aria-hidden="true" />
                        </a>
                    )}
                    {project.specialLink && (external(project.specialLink) ? (
                        <a className="projects-card_banner" data-part href={project.specialLink} target="_blank" rel="noopener noreferrer">
                            {banner}
                        </a>
                    ) : (
                        <Link className="projects-card_banner" data-part href={project.specialLink}>{banner}</Link>
                    ))}
                    <button type="button" className="projects-card_close" data-part aria-label={`Close ${project.title}`} onClick={onClose}>
                        <X size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                    <h3 className="projects-card_title" id={`${id}-title`} data-part>{project.title}</h3>
                    {project.subTitle && <p className="projects-card_sub" data-part>{project.subTitle}</p>}
                    <div className="projects-card_more" id={`${id}-more`} data-part>
                        <p>{project.description}</p>
                    </div>
                    <span className="projects-card_tags" data-part>
                        {project.categories.map((tag) => <span key={tag}>#{tag}</span>)}
                    </span>
                    {project.chipText && (
                        <span className="projects-card_chip" data-part><Chip size="xs" transparent>{project.chipText}</Chip></span>
                    )}
                    <span className="projects-card_foot" data-part>
                        {project.footer && `${project.footer} | `}
                        <span className="projects-card_date">{formatDate(project.date)}</span>
                        {project.url && (
                            <a className="projects-card_visit" href={project.url} aria-label={`Visit ${project.title}`} {...newTab(project.url)}>
                                Visit
                                <ArrowUpRight size={13} strokeWidth={2.25} aria-hidden="true" />
                            </a>
                        )}
                    </span>
                </article>
            </div>
        </li>
    );
}

// The whole picture, never cropped, whatever its shape: the screenshots run from portrait (Conditioner) to a 2.7:1
// banner (Doublestartyre). A blurred copy of it fills the space around it, so the frame never shows bare.
function Media({src}: { src: Project["image"] }) {
    if (isVideo(src)) return <video src={src} autoPlay loop muted playsInline disablePictureInPicture preload="metadata" />;
    if (typeof src !== "string") return src as ReactNode;
    return (
        <>
            <img className="projects-card_backdrop" src={src} alt="" loading="lazy" decoding="async" />
            <img className="projects-card_img" src={src} alt="" loading="lazy" decoding="async" />
        </>
    );
}

function FilterChip({active, onClick, label, count}: { active: boolean; onClick: () => void; label: string; count: number }) {
    return (
        <button type="button" className={`projects-filter${active ? " active" : ""}`} aria-pressed={active} onClick={onClick}>
            {label}
            <span className="projects-filter_count">{count}</span>
        </button>
    );
}
