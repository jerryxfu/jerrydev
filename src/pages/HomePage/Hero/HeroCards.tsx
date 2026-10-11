import {type CSSProperties, memo, useRef} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import Morph from "@/components/Morph/Morph.tsx";
import useLocalClock from "@/hooks/useLocalClock.ts";
import {THEME_INFO, THEMES, useTheme} from "@/context/ThemeContext.tsx";
import "./HeroCards.scss";

gsap.registerPlugin(ScrollTrigger);

// Frosted cards in the hero's empty right half, each something live: what I'm building, my time, an announcement, the
// theme. The pattern is TechNexus's cards around its phone (website/src/pages/Home in that repo), three layers each:
// the outer one flies off as the hero scrolls away, the middle one pops in like a notification, the inner one is the
// glass and drifts. Wide screens only, where the right half is empty; with reduced motion they're just there.

// The announcement card's text, to change whenever there's something to say.
const ANNOUNCEMENT = "Nothing for now...";

// When the cards pop in: once the typing line has faded in (Hero.tsx starts it at 2.1s).
const ARRIVE_AT = 2.3;

const cssVar = (name: string, value: string) => ({[name]: value}) as CSSProperties;

function HeroCards() {
    const root = useRef<HTMLDivElement>(null);
    const clock = useLocalClock();
    const {currentTheme, themePreference, setTheme} = useTheme();

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

    const {label} = THEME_INFO[currentTheme];
    const themeName = themePreference === "auto" ? `Auto · ${label}` : label;

    return (
        <div className="hero-cards" ref={root}>
            <div className="hero-card hero-card--building" data-depth="1.25">
                <div className="hero-card_in">
                    <a className="hero-card_glass" href="https://technexus.jerryxf.net" target="_blank" rel="noopener noreferrer">
                        <span className="hero-card_label">Now building</span>
                        <span className="hero-card_big">TechNexus</span>
                        <span className="hero-card_slogan">Your event, live.</span>
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
                                    style={cssVar("--swatch", THEME_INFO[theme].swatch)}
                                    aria-label={`${THEME_INFO[theme].label} theme`}
                                    aria-pressed={themePreference === theme}
                                    onClick={() => setTheme(theme)}
                                />
                            ))}
                        </span>
                        <Morph text={themeName} className="hero-card_theme-name" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// The hero re-renders with each letter its typing line types; the cards have nothing to change then.
export default memo(HeroCards);
