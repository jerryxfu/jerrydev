import {type CSSProperties, memo, useEffect, useRef, useState} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import Morph from "@/components/Morph/Morph.tsx";
import useLocalClock from "@/hooks/useLocalClock.ts";
import {THEMES, type Theme, useTheme} from "@/context/ThemeContext.tsx";
import "./HeroCards.scss";

gsap.registerPlugin(ScrollTrigger);

// Frosted cards in the hero's empty right half, each something live: what I'm building, my time, an announcement, the
// theme. The pattern is TechNexus's cards around its phone (website/src/pages/Home in that repo), three layers each:
// the outer one flies off as the hero scrolls away, the middle one pops in like a notification, the inner one is the
// glass and drifts. Wide screens only, where the right half is empty; with reduced motion they're just there.

// The announcement card's text, to change whenever there's something to say.
const ANNOUNCEMENT = "Nothing for now...";

// The "Now building" card's line, stepping like a match through TechNexus's statuses, in their colours.
const BUILDING = [
    {text: "with Raphaël & Samy", colour: "#bf5af2"},
    {text: "Live from frc.nexus", colour: "#ff9f0a"},
    {text: "App Store · Soon", colour: "#0a84ff"},
    {text: "Android on its way", colour: "#30d158"},
];
// TechNexus's own beat (PULSE_EVERY in its story.ts).
const BUILDING_EVERY = 3400;

// Each theme by its --primary, the colour its mesh is built around.
const SWATCH: Record<Theme, string> = {light: "#abcdef", night: "#104080", blush: "#f7b8d8", burgundy: "#9e1e3e"};
const LABEL: Record<Theme, string> = {light: "Light", night: "Night", blush: "Blush", burgundy: "Burgundy"};

// When the cards pop in: once the typing line has faded in (Hero.tsx starts it at 2.1s).
const ARRIVE_AT = 2.3;

const cssVar = (name: string, value: string) => ({[name]: value}) as CSSProperties;

function HeroCards() {
    const root = useRef<HTMLDivElement>(null);
    const clock = useLocalClock();
    const {currentTheme, themePreference, setTheme} = useTheme();

    // The building card cycles only while the hero is on screen, and not at all with reduced motion: a line that
    // changes by itself every few seconds is motion too.
    const [step, setStep] = useState(0);
    useEffect(() => {
        const el = root.current;
        if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let timer: number | undefined;
        const observer = new IntersectionObserver(([entry]) => {
            window.clearInterval(timer);
            if (entry?.isIntersecting) timer = window.setInterval(() => setStep((n) => n + 1), BUILDING_EVERY);
        });
        observer.observe(el);
        return () => {
            observer.disconnect();
            window.clearInterval(timer);
        };
    }, []);
    const building = BUILDING[step % BUILDING.length] ?? BUILDING[0]!;

    useGSAP(() => {
        const el = root.current;
        if (!el) return;
        const mm = gsap.matchMedia();
        mm.add("(prefers-reduced-motion: no-preference) and (min-width: 1100px)", () => {
            const cards = gsap.utils.toArray<HTMLElement>(".hero-card", el);
            const ins = gsap.utils.toArray<HTMLElement>(".hero-card_in", el);
            const glass = gsap.utils.toArray<HTMLElement>(".hero-card_glass", el);

            // One at a time, like notifications on an iPhone: each drops in from just above and grows to size as it
            // fades up, settling without a bounce. The fade is --pop, which only the glass reads (it once had a
            // backdrop blur, which opacity on an ancestor would have cut off from the mesh).
            gsap.set(ins, {"--pop": 0, visibility: "hidden", y: -24, scale: 0.9, transformOrigin: "50% 0%"});
            const arrive = gsap.timeline({delay: ARRIVE_AT});
            ins.forEach((card, i) => {
                arrive
                    .set(card, {visibility: "visible"}, i * 0.2)
                    .to(card, {"--pop": 1, duration: 0.45, ease: "power2.out"}, i * 0.2)
                    .to(card, {y: 0, scale: 1, duration: 1.1, ease: "expo.out"}, i * 0.2);
            });

            // The glass drifts while the cards are on screen, and rests off it.
            const drift = glass.map((card, i) =>
                gsap.to(card, {y: i % 2 ? 9 : -9, duration: 2.8 + i * 0.45, ease: "sine.inOut", yoyo: true, repeat: -1}));
            const watch = new IntersectionObserver(([entry]) => drift.forEach((tween) => tween.paused(!entry?.isIntersecting)));
            watch.observe(el);

            // As the hero scrolls away, each flies off up and to the right by its depth, and is gone by the time the
            // hero is half off screen. Gone means unclickable too.
            const away = gsap.timeline({
                scrollTrigger: {
                    trigger: el, start: "top top", end: "bottom top", scrub: true,
                    onUpdate: (self) => el.classList.toggle("is-away", self.progress > 0.4),
                },
            });
            cards.forEach((card) => {
                const depth = Number(card.dataset.depth ?? 1);
                away
                    .to(card, {x: 160 * depth, y: -120 * depth, ease: "none", duration: 1}, 0)
                    .to(card, {"--away": 0, ease: "none", duration: 0.45}, 0);
            });
            return () => watch.disconnect();
        });
        return () => mm.revert();
    }, {scope: root});

    const themeName = themePreference === "auto" ? `Auto · ${LABEL[currentTheme]}` : LABEL[currentTheme];

    return (
        <div className="hero-cards" ref={root}>
            <div className="hero-card hero-card--building" data-depth="1.25">
                <div className="hero-card_in">
                    <a className="hero-card_glass" href="https://technexus.jerryxf.net" target="_blank" rel="noopener noreferrer">
                        <span className="hero-card_label">Now building</span>
                        <span className="hero-card_big">TechNexus</span>
                        <span className="hero-card_status">
                            <span className="hero-card_dot" style={cssVar("--dot", building.colour)} aria-hidden="true" />
                            <Morph text={building.text} />
                        </span>
                    </a>
                </div>
            </div>

            <div className="hero-card hero-card--clock" data-depth="0.85">
                <div className="hero-card_in">
                    <div className="hero-card_glass">
                        <span className="hero-card_label">Clock</span>
                        <span className="hero-card_big">
                            <Morph text={clock.hm} />
                            <span className="hero-card_period">{clock.period}</span>
                        </span>
                        <span className="hero-card_sub">
                            {clock.zone} · {clock.delta === 0 ? "same time as you" : `${clock.span} ${clock.delta > 0 ? "ahead of" : "behind"} you`}
                        </span>
                    </div>
                </div>
            </div>

            <div className="hero-card hero-card--news" data-depth="1">
                <div className="hero-card_in">
                    <div className="hero-card_glass">
                        <span className="hero-card_label">Announcement</span>
                        <span className="hero-card_message">{ANNOUNCEMENT}</span>
                    </div>
                </div>
            </div>

            <div className="hero-card hero-card--theme" data-depth="0.7">
                <div className="hero-card_in">
                    <div className="hero-card_glass">
                        <span className="hero-card_label">Theme</span>
                        <span className="hero-card_themes">
                            {THEMES.map((theme) => (
                                <button
                                    key={theme}
                                    type="button"
                                    className={`hero-card_swatch${theme === currentTheme ? " is-on" : ""}`}
                                    style={cssVar("--swatch", SWATCH[theme])}
                                    aria-label={`${LABEL[theme]} theme`}
                                    aria-pressed={themePreference === theme}
                                    onClick={() => setTheme(theme)}
                                />
                            ))}
                            <Morph text={themeName} className="hero-card_theme-name" />
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// The hero re-renders with each letter its typing line types; the cards have nothing to change then.
export default memo(HeroCards);
