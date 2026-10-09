import {useEffect, useLayoutEffect, useRef, useState} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import {Menu} from "lucide-react";
import NavDrawer from "./NavDrawer.tsx";
import ThemeToggle from "./ThemeToggle/ThemeToggle.tsx";
import {Link, useLocation} from "wouter";
import {isRouted, linksLeft, linksRight, LOGO_ALT, resolveHref} from "./nav.config.ts";
import "./Navbar.scss";

gsap.registerPlugin(ScrollTrigger);

// Scroll distance before the bar settles into its compact state: as soon as the page moves, as on TechNexus.
const SHRINK_AT = 2;
// A phone, as in Navbar.scss: there the bar floats below the status bar.
const PHONE = "(max-width: 768px)";
const ENTRY_DELAY = 0.1;
// How long after the bar starts dropping before its contents follow it down.
const ITEM_OFFSET = 0.15;
const ITEM_STAGGER = 0.07;

type Props = {
    // When true the bar sits transparent over a hero at the top of the page and
    // turns frosted once scrolled. When false it's solid from the start.
    isHero?: boolean;
    // Locks the bar in its compact state. The scroll trigger is never created, so the bar never expands regardless of scroll position.
    isShrunk?: boolean;
    // The bar itself dropping in from above on mount.
    animate?: boolean;
    // The logo, links and actions dropping in one behind another. Independent of
    // `animate`: either can run without the other, and turning this off leaves
    // the contents simply present rather than fading them in without movement.
    stagger?: boolean;
};

export default function Navbar({isHero = false, isShrunk = false, animate = true, stagger = true}: Props) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [pathname] = useLocation();

    const navRef = useRef<HTMLElement>(null);
    const logoRef = useRef<HTMLAnchorElement>(null);
    const linkRefs = useRef<(HTMLLIElement | null)[]>([]);
    const actionsRef = useRef<HTMLDivElement>(null);
    const pillRef = useRef<HTMLSpanElement>(null);

    // On the home page, the link of the section you're reading sits on a pill that slides from link to link. Only
    // once the bar is the compact island (Navbar.scss): over the hero, the bar stays as it was.
    const spy = isHero && pathname === "/";
    const [active, setActive] = useState<string | null>(null);

    // The section the middle of the screen is in: the last one whose top has passed it. Measured on scroll rather than
    // through ScrollTrigger positions, which would go stale when the projects list is filtered to a different height.
    useEffect(() => {
        if (!spy) return;
        const targets = linksLeft
            .map((link) => ({
                href: link.href,
                el: link.href === "#"
                    ? document.querySelector<HTMLElement>(".hero")
                    : document.getElementById(link.href.slice(1))?.closest<HTMLElement>(".section") ?? null,
            }))
            .filter((target): target is { href: string; el: HTMLElement } => target.el !== null);

        let frame = 0;
        const update = () => {
            frame = 0;
            const middle = window.innerHeight / 2;
            let current: string | null = null;
            for (const {href, el} of targets) if (el.getBoundingClientRect().top <= middle) current = href;
            setActive(current);
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        update();
        window.addEventListener("scroll", schedule, {passive: true});
        window.addEventListener("resize", schedule);
        return () => {
            window.removeEventListener("scroll", schedule);
            window.removeEventListener("resize", schedule);
            cancelAnimationFrame(frame);
        };
    }, [spy]);

    // Lays the pill under the active link. Measured in the nav's own layout box (offsetLeft/Top, which ignore the
    // island's scale), again whenever the nav changes size, which it does all through the shrink into the island.
    const pillPlaced = useRef(false);
    useLayoutEffect(() => {
        const pill = pillRef.current;
        const nav = navRef.current;
        if (!pill || !nav || !spy) return;

        const place = () => {
            const index = linksLeft.findIndex((link) => link.href === active);
            const li = index >= 0 ? linkRefs.current[index] : null;
            pill.classList.toggle("is-on", Boolean(li && li.offsetWidth));
            if (!li || !li.offsetWidth) return;
            // The first placement jumps there; only later moves slide.
            if (!pillPlaced.current) pill.style.transition = "none";
            pill.style.width = `${li.offsetWidth + 24}px`;
            pill.style.height = `${li.offsetHeight + 10}px`;
            pill.style.transform = `translate(${li.offsetLeft - 12}px, ${li.offsetTop - 5}px)`;
            if (!pillPlaced.current) {
                pillPlaced.current = true;
                requestAnimationFrame(() => pill.style.removeProperty("transition"));
            }
        };

        place();
        const observer = new ResizeObserver(place);
        observer.observe(nav);
        void document.fonts?.ready.then(place);
        return () => observer.disconnect();
    }, [active, spy]);

    useGSAP(() => {
        const nav = navRef.current;
        if (!nav) return;

        // Reduce motion overrides both props. animate/stagger are a page-level preference; this is the user's, and it wins.
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        // On a phone the bar floats below the status bar from the start (Navbar.scss), so it doesn't drop in, nor its
        // contents: from above, they'd pass the screen's top edge and tint the status bar. It fades in instead (CSS).
        const onPhone = window.matchMedia(PHONE).matches;
        const runEntry = animate && !reduceMotion && !onPhone;
        const runStagger = stagger && !reduceMotion && !onPhone;

        if (runEntry) {
            // The bar drops in from above, by its top rather than a transform: moving a transform, GSAP sets the CSS
            // scale and translate to none until it's done, and the compact state is those, so scrolling during the drop
            // made the bar the island only once it was over. clearProps hands top back to CSS.
            void gsap.from(nav, {
                top: () => -nav.offsetHeight,
                duration: 1.5,
                delay: ENTRY_DELAY,
                ease: "elastic.out(1,0.95)",
                clearProps: "top",
            });
        }

        if (runStagger) {
            // The menu button is deliberately absent (animate with the navbar)
            const items = [
                logoRef.current,
                ...linkRefs.current,
                ...(actionsRef.current?.querySelectorAll(":scope > *:not(.navbar_menu)") ?? []),
            ].filter(Boolean);

            void gsap.from(items, {
                opacity: 0,
                y: "-125%",
                duration: 0.75,
                // The offset exists so the contents trail the bar rather than racing it.
                // With the bar animation off there is nothing to trail, so it collapses instead of leaving a dead beat where
                // the links sit still waiting on a drop that never happens.
                delay: runEntry ? ENTRY_DELAY + ITEM_OFFSET : ENTRY_DELAY,
                stagger: ITEM_STAGGER,
                ease: "power2.out",
                clearProps: "opacity,transform",
            });
        }

        // Locked compact: the class is already on the element from render, so there's nothing to toggle and no trigger worth creating.
        if (isShrunk) return;

        // The compact state is a class toggled at a threshold. The shape change is ruled by CSS.
        const update = () => nav.classList.toggle("is-scrolled", window.scrollY > SHRINK_AT);

        ScrollTrigger.create({
            start: SHRINK_AT,
            end: () => Math.max(ScrollTrigger.maxScroll(window), SHRINK_AT + 1),
            onEnter: update,
            onLeave: update,
            onEnterBack: update,
            onLeaveBack: update,
        });

        update();
    });

    // Escape closes the drawer.
    useEffect(() => {
        if (!isDrawerOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsDrawerOpen(false);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isDrawerOpen]);

    const renderInline = (items: typeof linksLeft, offset: number) =>
        items.map((item, i) => (
            <li
                key={item.href}
                className="navbar_inline-item"
                ref={(el) => {
                    linkRefs.current[offset + i] = el;
                }}
            >
                {isRouted(item) ? (
                    <Link href={item.href} className="text-body text-underline">
                        {item.label}
                    </Link>
                ) : (
                    <a
                        href={resolveHref(item.href, pathname)}
                        className="text-body text-underline"
                        aria-current={spy && active === item.href ? "location" : undefined}
                        {...(item.external && {target: "_blank", rel: "noopener noreferrer"})}
                    >
                        {item.label}
                    </a>
                )}
            </li>
        ));

    return (
        <>
            {/* First focusable thing on the page */}
            <a className="navbar_skip" href="#main">Skip to content</a>

            {/* On a phone, the full bar's look at the top of the page, scrolling away with it (Navbar.scss). */}
            {isHero && <div className="navbar_strip" aria-hidden="true" />}

            <nav
                className={
                    "navbar " +
                    (isHero ? "navbar--hero" : "navbar--solid") +
                    (isShrunk ? " is-scrolled" : "")
                }
                ref={navRef}
            >
                {spy && <span className="navbar_pill" ref={pillRef} aria-hidden="true" />}
                <div className="navbar_bar">
                    <Link className="navbar_logo" href="/" aria-label="Go to homepage" ref={logoRef}>
                        <img src="/favicon64.png" alt={LOGO_ALT} width={64} height={64} />
                    </Link>

                    <ul className="navbar_inline navbar_inline-left">
                        {renderInline(linksLeft, 0)}
                    </ul>

                    <ul className="navbar_inline navbar_inline-right">
                        {renderInline(linksRight, linksLeft.length)}
                    </ul>

                    <div className="navbar_actions" ref={actionsRef}>
                        <ThemeToggle />

                        <button
                            className="navbar_menu"
                            onClick={() => setIsDrawerOpen(true)}
                            aria-label="Open navigation menu"
                            aria-expanded={isDrawerOpen}
                        >
                            <Menu size={22} strokeWidth={1.9} />
                        </button>
                    </div>
                </div>
            </nav>

            <NavDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
        </>
    );
}
