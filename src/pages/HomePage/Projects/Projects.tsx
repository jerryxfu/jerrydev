import {type PointerEventHandler, type ReactNode, useMemo, useRef, useState} from "react";
import {Link} from "wouter";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import "./Projects.scss";
import SectionTitle from "@/components/SectionTitle/SectionTitle.tsx";
import Card from "@/components/Card/Card.tsx";
import Chip from "@/components/Chip/Chip.tsx";
import {formatDate} from "@/utils.ts";
import {isDarkTheme, useTheme} from "@/context/ThemeContext.tsx";
import useMediaQuery from "@/hooks/useMediaQuery.ts";
import {CATEGORIES, type Category, categoryIds, featuredProjects, firstYear, imageFor, isRetired, listedProjects, type Project, projects} from "./projects.ts";

gsap.registerPlugin(ScrollTrigger);

// The favourites as full cards, then everything else as a list you can filter, newest first, one line each like the
// blog feed. The list keeps the screenshots out of the way until you want one: on a mouse, hovering a row brings its
// picture and description along beside the pointer.

const RETIRED_COUNT = listedProjects.filter(isRetired).length;

const MONTH = new Intl.DateTimeFormat("en-CA", {month: "short", year: "numeric"});
const isoDay = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const isVideo = (src: unknown): src is string => typeof src === "string" && /\.(mp4|webm|ogg|mov)$/i.test(src);

// The credit beside a row's title. Plain text: the row is itself a link, and links can't nest.
const creditOf = (project: Project): string | null => {
    const people = project.collaborators?.map((friend) => friend.name);
    if (people?.length) return `with ${people.length > 1 ? `${people.slice(0, -1).join(", ")} & ${people.at(-1)}` : people[0]}`;
    return project.client ? `for ${project.client}` : null;
};

export default function Projects() {
    const {currentTheme} = useTheme();
    const dark = isDarkTheme(currentTheme);

    return (
        <div className="section projects">
            <SectionTitle
                text={"Projects"}
                index={3}
                kicker={`${projects.length} projects since ${firstYear}`}
                description={"A collection of the things I have built over the years. Some are finished and working, others are experiments I learned something from." +
                    " The ones I'd show you first are up top, and everything else is listed below, newest first."}
            />

            <div className="projects_featured">
                {featuredProjects.map((project) => (
                    <Card
                        key={project.title}
                        {...project}
                        image={imageFor(project, dark)}
                        dateDisplay={formatDate(project.date)}
                    />
                ))}
            </div>

            <ProjectIndex dark={dark} />
        </div>
    );
};

function ProjectIndex({dark}: { dark: boolean }) {
    const [category, setCategory] = useState<Category | "all">("all");
    const [showRetired, setShowRetired] = useState(false);

    const pool = useMemo(() => listedProjects.filter((project) => showRetired || !isRetired(project)), [showRetired]);
    const shown = useMemo(() => pool.filter((project) => category === "all" || project.categories.includes(category)), [pool, category]);
    const counts = useMemo(
        () => new Map(categoryIds.map((id) => [id, pool.filter((project) => project.categories.includes(id)).length])),
        [pool],
    );

    const list = useRef<HTMLOListElement>(null);
    const preview = useRef<HTMLDivElement>(null);
    // The project in the preview, kept while it fades out so the picture doesn't vanish first.
    const [peek, setPeek] = useState<Project | null>(null);
    const [peeking, setPeeking] = useState(false);
    const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");

    // A changed filter brings the rows in, a few at a time. Not on the first render: the list is just there.
    const lastFilter = useRef(`${category}|${showRetired}`);
    useGSAP(() => {
        const key = `${category}|${showRetired}`;
        if (key === lastFilter.current || !list.current) return;
        lastFilter.current = key;
        // The list changed height, so every scroll trigger below it (the titles' reveals, their kickers) is measured
        // again; a stale one would hold the Experience title hidden until long after it's on screen.
        ScrollTrigger.refresh();
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        gsap.from(list.current.children, {
            opacity: 0, y: 8, duration: 0.4, ease: "power2.out", stagger: 0.025, clearProps: "opacity,transform",
        });
    }, {dependencies: [category, showRetired]});

    // The preview follows the pointer, a little behind it, on whichever side of it has room.
    useGSAP(() => {
        const rows = list.current;
        const card = preview.current;
        if (!rows || !card || !finePointer) return;

        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const xTo = gsap.quickTo(card, "x", {duration: reduce ? 0 : 0.5, ease: "power3"});
        const yTo = gsap.quickTo(card, "y", {duration: reduce ? 0 : 0.5, ease: "power3"});
        const spot = (event: PointerEvent) => {
            const gap = 28;
            const right = event.clientX + gap + card.offsetWidth < window.innerWidth - 8;
            return {
                x: right ? event.clientX + gap : event.clientX - gap - card.offsetWidth,
                y: Math.min(Math.max(8, event.clientY - card.offsetHeight / 2), window.innerHeight - card.offsetHeight - 8),
            };
        };

        let preloaded = false;
        const onEnter = (event: PointerEvent) => {
            // Lands under the pointer the first time instead of flying in from the corner.
            gsap.set(card, spot(event));
            if (preloaded) return;
            preloaded = true;
            for (const project of listedProjects) {
                const src = imageFor(project, dark);
                if (typeof src === "string" && !isVideo(src)) new Image().src = src;
            }
        };
        const onMove = (event: PointerEvent) => {
            const {x, y} = spot(event);
            xTo(x);
            yTo(y);
        };
        rows.addEventListener("pointerenter", onEnter);
        rows.addEventListener("pointermove", onMove);
        return () => {
            rows.removeEventListener("pointerenter", onEnter);
            rows.removeEventListener("pointermove", onMove);
        };
    }, {dependencies: [finePointer, dark]});

    useGSAP(() => {
        if (!preview.current) return;
        gsap.to(preview.current, {
            autoAlpha: peeking ? 1 : 0,
            scale: peeking ? 1 : 0.94,
            duration: peeking ? 0.35 : 0.2,
            ease: peeking ? "power3.out" : "power2.in",
            overwrite: "auto",
        });
    }, {dependencies: [peeking]});

    const peekAt = (project: Project) => () => {
        if (!finePointer) return;
        setPeek(project);
        setPeeking(true);
    };

    const media = peek ? imageFor(peek, dark) : null;

    return (
        <div className="projects-index">
            <div className="projects-index_head">
                <span className="text-label">Everything else</span>
                <span className="projects-index_count">{shown.length} of {listedProjects.length}</span>
            </div>

            <div className="projects-index_controls">
                <div className="projects-index_filters" role="group" aria-label="Filter projects by kind">
                    <FilterChip active={category === "all"} onClick={() => setCategory("all")} label="All" count={pool.length} />
                    {categoryIds.map((id) => (
                        <FilterChip
                            key={id}
                            active={category === id}
                            onClick={() => setCategory(id)}
                            label={CATEGORIES[id]}
                            count={counts.get(id) ?? 0}
                        />
                    ))}
                </div>
                <label className="projects-index_retired">
                    <input type="checkbox" checked={showRetired} onChange={(event) => setShowRetired(event.target.checked)} />
                    Show archived ({RETIRED_COUNT})
                </label>
            </div>

            <ol className="projects-index_list" ref={list} onPointerLeave={() => setPeeking(false)}>
                {shown.map((project) => {
                    const credit = creditOf(project);
                    return (
                        <li key={project.title} className="projects-index_item">
                            <RowLink project={project} onPointerEnter={peekAt(project)}>
                                <time className="projects-index_stamp" dateTime={isoDay(project.date)}>{MONTH.format(project.date)}</time>
                                <span className="projects-index_name">
                                    <span className="projects-index_title">{project.title}</span>
                                    {credit && <span className="projects-index_credit">{credit}</span>}
                                </span>
                                <span className="projects-index_sub">{project.subTitle}</span>
                                <span className="projects-index_tags">
                                    {project.categories.map((id) => <span key={id}>#{id}</span>)}
                                </span>
                                {project.chipText && <Chip className="projects-index_status" size="sm">{project.chipText}</Chip>}
                            </RowLink>
                        </li>
                    );
                })}
            </ol>
            {shown.length === 0 && <p className="projects-index_empty">Only archived projects here. Tick the box to see them.</p>}

            {/* Fixed to the viewport and out of the reading order: a picture of what the row already says. */}
            <div className="projects-preview" ref={preview} aria-hidden="true">
                {peek && (
                    <>
                        <div className="projects-preview_media">
                            {isVideo(media) ? (
                                <video key={media} src={media} autoPlay loop muted playsInline disablePictureInPicture />
                            ) : typeof media === "string" ? (
                                <img src={media} alt="" decoding="async" />
                            ) : media}
                        </div>
                        <div className="projects-preview_body">
                            <p className="projects-preview_text">{peek.description}</p>
                            <p className="projects-preview_meta">
                                {peek.footer && `${peek.footer} · `}{formatDate(peek.date)}
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
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

// The whole row is the link: to the project, or to its post when that's all it has. A row with neither is still a
// row, for the preview.
function RowLink({project, onPointerEnter, children}: { project: Project; onPointerEnter: PointerEventHandler; children: ReactNode }) {
    const href = project.url || project.specialLink;
    if (!href) return <div className="projects-index_row" onPointerEnter={onPointerEnter}>{children}</div>;
    // A scheme or "//" leaves the site; "/#..." is a jump on this page that wouter would swallow.
    if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) {
        return (
            <a className="projects-index_row" href={href} target="_blank" rel="noopener noreferrer" onPointerEnter={onPointerEnter}>
                {children}
            </a>
        );
    }
    if (href.startsWith("/#")) return <a className="projects-index_row" href={href} onPointerEnter={onPointerEnter}>{children}</a>;
    return <Link className="projects-index_row" href={href} onPointerEnter={onPointerEnter}>{children}</Link>;
}
