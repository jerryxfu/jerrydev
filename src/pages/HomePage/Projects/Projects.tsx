import {type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import {X} from "lucide-react";
import "./Projects.scss";
import SectionTitle from "@/components/SectionTitle/SectionTitle.tsx";
import Card from "@/components/Card/Card.tsx";
import Chip from "@/components/Chip/Chip.tsx";
import {formatDate} from "@/utils.ts";
import {isDarkTheme, useTheme} from "@/context/ThemeContext.tsx";
import {CATEGORIES, type Category, categoryIds, firstYear, imageFor, type Project, projects} from "./projects.ts";

gsap.registerPlugin(ScrollTrigger);

// Every project as a small card: the picture on the left; the title, the subtitle, the tags and the status on the
// right. The full card (Card.tsx, as Experience still uses it) opens over the small one: on a mouse when the pointer
// rests on it, and anywhere on a click, a tap or Enter, in which case it stays until closed.

const COUNTS = new Map(categoryIds.map((id) => [id, projects.filter((project) => project.categories.includes(id)).length]));

// How long the pointer rests on a card before it opens: long enough that sweeping across the grid doesn't open every
// card on the way, short enough to still feel like hovering.
const HOVER_INTENT = 160;

const isVideo = (src: unknown): src is string => typeof src === "string" && /\.(mp4|webm|ogg|mov)$/i.test(src);
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));

type Peek = {
    project: Project;
    tile: HTMLButtonElement;
    // Opened by a click, a tap or the keyboard: it stays until closed. Otherwise it follows the pointer's hover.
    pinned: boolean;
    // Opened from the keyboard, so focus moves into it, and back to the card when it closes.
    byKeyboard: boolean;
};

export default function Projects() {
    const {currentTheme} = useTheme();
    const dark = isDarkTheme(currentTheme);
    const [category, setCategory] = useState<Category | "all">("all");
    const shown = useMemo(
        () => projects.filter((project) => category === "all" || project.categories.includes(category)),
        [category],
    );

    const wrap = useRef<HTMLDivElement>(null);
    const grid = useRef<HTMLUListElement>(null);
    const overlay = useRef<HTMLDivElement>(null);
    const [peek, setPeek] = useState<Peek | null>(null);
    // The handlers below read the open card from here, so they can stay the same functions between renders.
    const peekRef = useRef<Peek | null>(null);
    useEffect(() => {
        peekRef.current = peek;
    }, [peek]);
    const hoverTimer = useRef<number | undefined>(undefined);

    const show = useCallback((next: Peek) => {
        window.clearTimeout(hoverTimer.current);
        if (overlay.current) gsap.killTweensOf(overlay.current);
        setPeek(next);
    }, []);

    const hide = useCallback((returnFocus = false) => {
        window.clearTimeout(hoverTimer.current);
        const tile = peekRef.current?.tile;
        const done = () => {
            setPeek(null);
            if (returnFocus) tile?.focus();
        };
        const el = overlay.current;
        if (!el || reducedMotion()) return done();
        gsap.to(el, {opacity: 0, scale: 0.97, duration: 0.14, ease: "power2.in", overwrite: true, onComplete: done});
    }, []);

    // Places the full card over the small one: a little wider, centred on it and kept inside the section, opening down
    // from just above it, or up from just below it when down would run off the screen. Grows out of the small card
    // the first time; pinning an open one only places it again.
    const shownFor = useRef<{ project: Project; tile: HTMLElement } | null>(null);
    useLayoutEffect(() => {
        const el = overlay.current;
        const box = wrap.current;
        if (!peek || !el || !box) {
            shownFor.current = null;
            return;
        }
        const area = box.getBoundingClientRect();
        const tile = peek.tile.getBoundingClientRect();
        const width = Math.min(area.width, Math.max(tile.width + 40, 384));
        const left = clamp(tile.left - area.left + tile.width / 2 - width / 2, 0, area.width - width);
        el.style.width = `${width}px`;
        el.style.left = `${left}px`;
        const height = el.offsetHeight;
        const down = tile.top - 12 + height <= window.innerHeight - 12;
        const top = down ? tile.top - area.top - 12 : tile.bottom - area.top + 12 - height;
        el.style.top = `${top}px`;

        if (peek.byKeyboard && !el.contains(document.activeElement)) el.focus();

        const fresh = shownFor.current?.project !== peek.project || shownFor.current?.tile !== peek.tile;
        shownFor.current = {project: peek.project, tile: peek.tile};
        if (!fresh) return;
        if (reducedMotion()) {
            gsap.set(el, {opacity: 1, scale: 1});
        } else {
            const origin = `${tile.left + tile.width / 2 - (area.left + left)}px ${tile.top + tile.height / 2 - (area.top + top)}px`;
            gsap.fromTo(el, {opacity: 0, scale: 0.92, transformOrigin: origin}, {
                opacity: 1, scale: 1, duration: 0.3, ease: "power3.out", overwrite: true,
            });
        }
    }, [peek]);

    // A hover-opened card closes once the pointer is over neither it nor its small card. Checked against their boxes
    // rather than with pointerleave: the full card appears under a pointer that hasn't moved, and a browser may not
    // count the pointer as inside it until it does.
    useEffect(() => {
        if (!peek || peek.pinned) return;
        const inside = (el: Element | null, event: PointerEvent) => {
            if (!el) return false;
            const r = el.getBoundingClientRect();
            return event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
        };
        const onMove = (event: PointerEvent) => {
            if (event.pointerType !== "mouse") return;
            if (!inside(overlay.current, event) && !inside(peek.tile, event)) hide();
        };
        window.addEventListener("pointermove", onMove);
        return () => window.removeEventListener("pointermove", onMove);
    }, [peek, hide]);

    // Any open card closes on Escape, on a press anywhere else, and when the window changes size.
    useEffect(() => {
        if (!peek) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") hide(true);
        };
        const onDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (overlay.current?.contains(target) || peek.tile.contains(target)) return;
            hide();
        };
        const onResize = () => hide();
        document.addEventListener("keydown", onKey);
        document.addEventListener("pointerdown", onDown);
        window.addEventListener("resize", onResize);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("pointerdown", onDown);
            window.removeEventListener("resize", onResize);
        };
    }, [peek, hide]);

    // A new filter closes the open card and brings the cards in, a few at a time. Not on the first render.
    const lastCategory = useRef(category);
    useGSAP(() => {
        if (category === lastCategory.current || !grid.current) return;
        lastCategory.current = category;
        hide();
        // The section changed height, so every scroll trigger below it (the titles' reveals, their kickers) is
        // measured again; a stale one would hold the Experience title hidden until long after it's on screen.
        ScrollTrigger.refresh();
        if (reducedMotion()) return;
        gsap.from(grid.current.children, {
            opacity: 0, y: 10, duration: 0.35, ease: "power2.out", stagger: 0.02, clearProps: "opacity,transform",
        });
    }, {dependencies: [category]});

    return (
        <div className="section projects">
            <SectionTitle
                text={"Projects"}
                index={3}
                kicker={`${projects.length} projects since ${firstYear}`}
                description={"A collection of the things I have built over the years. Some are finished and working, others are experiments I learned something from." +
                    " Hover over a card, or tap it, to see more."}
            />

            <div className="projects_controls">
                <div className="projects_filters" role="group" aria-label="Filter projects by tag">
                    <FilterChip active={category === "all"} onClick={() => setCategory("all")} label="All" count={projects.length} />
                    {categoryIds.map((id) => (
                        <FilterChip
                            key={id}
                            active={category === id}
                            onClick={() => setCategory(id)}
                            label={CATEGORIES[id]}
                            count={COUNTS.get(id) ?? 0}
                        />
                    ))}
                </div>
                <span className="projects_count">{shown.length} of {projects.length}</span>
            </div>

            <div className="projects_wrap" ref={wrap}>
                <ul className="projects_grid" ref={grid}>
                    {shown.map((project) => (
                        <li key={project.title}>
                            <button
                                type="button"
                                className="projects-tile"
                                aria-haspopup="dialog"
                                aria-expanded={peek?.project === project}
                                onPointerEnter={(event) => {
                                    if (event.pointerType !== "mouse" || peekRef.current?.pinned) return;
                                    window.clearTimeout(hoverTimer.current);
                                    const tile = event.currentTarget;
                                    hoverTimer.current = window.setTimeout(
                                        () => show({project, tile, pinned: false, byKeyboard: false}),
                                        HOVER_INTENT,
                                    );
                                }}
                                onPointerLeave={() => window.clearTimeout(hoverTimer.current)}
                                onClick={(event) => {
                                    // detail is 0 for a click made with Enter or Space.
                                    show({project, tile: event.currentTarget, pinned: true, byKeyboard: event.detail === 0});
                                }}
                            >
                                <TileMedia src={imageFor(project, dark)} />
                                <span className="projects-tile_body">
                                    <span className="projects-tile_title">{project.title}</span>
                                    {project.subTitle && <span className="projects-tile_sub">{project.subTitle}</span>}
                                    <span className="projects-tile_meta">
                                        <span className="projects-tile_tags">
                                            {project.categories.map((id) => <span key={id}>#{id}</span>)}
                                        </span>
                                        {project.chipText && <Chip className="projects-tile_status" size="sm">{project.chipText}</Chip>}
                                    </span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>

                {peek && (
                    <div
                        className={`projects-peek${peek.pinned ? " is-pinned" : ""}`}
                        ref={overlay}
                        role="dialog"
                        aria-label={peek.project.title}
                        tabIndex={-1}
                        // A click inside a hover-opened card keeps it open, for whoever reached for its links slowly.
                        onClick={() => {
                            if (!peek.pinned) setPeek({...peek, pinned: true});
                        }}
                    >
                        <button
                            type="button"
                            className="projects-peek_close"
                            aria-label="Close"
                            onClick={(event) => {
                                event.stopPropagation();
                                hide(true);
                            }}
                        >
                            <X size={16} strokeWidth={2} aria-hidden="true" />
                        </button>
                        <Card {...peek.project} image={imageFor(peek.project, dark)} dateDisplay={formatDate(peek.project.date)} />
                    </div>
                )}
            </div>
        </div>
    );
};

// The whole picture, never cropped, whatever its shape: the screenshots run from portrait (Conditioner) to a 2.7:1
// banner (Doublestartyre). A blurred copy of it fills the space around it, so the frame never shows bare.
function TileMedia({src}: { src: Project["image"] }) {
    let media: ReactNode = src;
    if (isVideo(src)) {
        media = <video src={src} autoPlay loop muted playsInline disablePictureInPicture preload="metadata" />;
    } else if (typeof src === "string") {
        media = (
            <>
                <img className="projects-tile_backdrop" src={src} alt="" loading="lazy" decoding="async" />
                <img className="projects-tile_img" src={src} alt="" loading="lazy" decoding="async" />
            </>
        );
    }
    return <span className="projects-tile_media" aria-hidden="true">{media}</span>;
}

function FilterChip({active, onClick, label, count}: { active: boolean; onClick: () => void; label: string; count: number }) {
    return (
        <button type="button" className={`projects-filter${active ? " active" : ""}`} aria-pressed={active} onClick={onClick}>
            {label}
            <span className="projects-filter_count">{count}</span>
        </button>
    );
}
