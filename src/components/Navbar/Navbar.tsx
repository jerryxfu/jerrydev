import {useEffect, useRef, useState} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import {Menu} from "lucide-react";
import NavDrawer from "./NavDrawer.tsx";
import ThemeToggle from "./ThemeToggle/ThemeToggle.tsx";
import {useLocation} from "react-router-dom";
import {linksLeft, linksRight, LOGO_ALT, resolveHref} from "./nav.config.ts";
import "./Navbar.scss";

gsap.registerPlugin(ScrollTrigger);

// Scroll distance before the bar settles into its compact state.
const SHRINK_AT = 80;
const ENTRY_DELAY = 0.1;

type Props = {
    // When true the bar sits transparent over a hero at the top of the page and
    // turns frosted once scrolled. When false it's solid from the start.
    isHero?: boolean;
};

export default function Navbar({isHero = false}: Props) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const {pathname} = useLocation();

    const navRef = useRef<HTMLElement>(null);
    const logoRef = useRef<HTMLAnchorElement>(null);
    const linkRefs = useRef<(HTMLLIElement | null)[]>([]);
    const actionsRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        const nav = navRef.current;
        if (!nav) return;

        // Entry: the bar drops in, then its contents stagger down behind it.
        // clearProps hands the transform back to CSS so the compact-state transition isn't fighting a leftover inline style.
        gsap.from(nav, {
            yPercent: -100,
            duration: 1.5,
            delay: ENTRY_DELAY,
            ease: "elastic.out(1,0.95)",
            clearProps: "transform",
        });

        const items = [
            logoRef.current,
            ...linkRefs.current,
            ...(actionsRef.current?.children ?? []),
        ].filter(Boolean);

        gsap.from(items, {
            opacity: 0,
            y: "-125%",
            duration: 0.75,
            delay: ENTRY_DELAY + 0.15,
            stagger: 0.07,
            ease: "power2.out",
            clearProps: "opacity,transform",
        });

        // The compact state is a class toggled at a threshold. The shape change is ruled by CSS.
        const setScrolled = (on: boolean) => nav.classList.toggle("is-scrolled", on);

        ScrollTrigger.create({
            start: SHRINK_AT,
            end: () => Math.max(ScrollTrigger.maxScroll(window), SHRINK_AT + 1),
            onToggle: (self) => setScrolled(self.isActive),
        });

        setScrolled(window.scrollY > SHRINK_AT);
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
                <a
                    href={resolveHref(item.href, pathname)}
                    className="text-body text-underline"
                    {...(item.external && {target: "_blank", rel: "noopener noreferrer"})}
                >
                    {item.label}
                </a>
            </li>
        ));

    return (
        <>
            <nav className={"navbar " + (isHero ? "navbar--hero" : "navbar--solid")} ref={navRef}>
                <div className="navbar_bar">
                    <a className="navbar_logo" href="/" aria-label="Go to homepage" ref={logoRef}>
                        <img src="/favicon.jpeg" alt={LOGO_ALT} />
                    </a>

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
