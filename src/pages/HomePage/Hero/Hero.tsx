import {useEffect, useMemo, useRef, useState} from "react";
import {gsap} from "gsap";
import {useGSAP} from "@gsap/react";
import {CustomEase} from "gsap/CustomEase";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {SplitText} from "gsap/SplitText";
import {TextPlugin} from "gsap/TextPlugin";
import "./Hero.scss";
import {texts} from "./texts.ts";
import HeroCards from "./HeroCards.tsx";
import {GRADIENT_MESHES} from "./meshes.ts";
import {graphemes} from "@/utils.ts";
import {useTheme} from "../../../context/ThemeContext.tsx";

import("../../../assets/styles/gradient-mesh-default.scss");

let isGsapConfigured = false;

function configureGsap() {
    if (isGsapConfigured) return;

    // SplitText ships with gsap since 3.13 and BlockReveal already uses it, so the hero splits with it too and
    // split-type is gone. Made inside useGSAP, a split is reverted with the rest of the hero's animation.
    gsap.registerPlugin(useGSAP, CustomEase, ScrollTrigger, TextPlugin, SplitText);
    CustomEase.create("nativeEase", "0.250, 0.100, 0.250, 1.000");
    CustomEase.create("customEaseOut", "0.250, 0.100, 0.580, 1.000");
    gsap.defaults({ease: "nativeEase"});

    isGsapConfigured = true;
}

// The glow that runs through the separator every few seconds, on the canvas over it (Hero.scss): the line's own light
// again, in white, as Hero.scss draws the line (a 6px core, and 8px of light blurred 8px past it), seen through a soft
// window 3/7 of the canvas long that slides from before the line's left end to past its right one. So at the ends the
// glow rounds off as the line's light does, and it can't show anywhere the line's light doesn't. Drawn only while it
// runs; the line's picture is made again only when its size has changed. Returns the loop, to pause off screen.
function runGlow(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    const line = document.createElement("canvas");
    let width = 0;
    let height = 0;
    const fit = () => {
        const box = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.round(box.width * dpr);
        const h = Math.round(box.height * dpr);
        if (w === width && h === height) return;
        width = canvas.width = line.width = w;
        height = canvas.height = line.height = h;
        // In device pixels, which canvas shadows are measured in: the line runs 24px in from each end, through the middle.
        const l = line.getContext("2d");
        if (!l) return;
        const px = (n: number) => n * dpr;
        const length = w - px(48);
        l.shadowColor = "rgba(255, 255, 255, 0.7)";
        l.shadowBlur = px(8);
        l.shadowOffsetX = w; // drawn off the canvas, so only its shadow, the light, lands on it
        l.fillRect(px(24 - 8) - w, h / 2 - px(8), length + px(16), px(16));
        l.shadowColor = "transparent";
        l.fillStyle = "#fff";
        l.fillRect(px(24 - 3), h / 2 - px(3), length + px(6), px(6));
    };
    // `at`: where the window's left edge is, in canvas widths.
    const sweep = {at: -3 / 7};
    const draw = () => {
        if (!ctx || !width) return;
        const left = sweep.at * width;
        const opening = ctx.createLinearGradient(left, 0, left + (width * 3) / 7, 0);
        opening.addColorStop(0, "transparent");
        opening.addColorStop(0.5, "#000");
        opening.addColorStop(1, "transparent");
        ctx.globalCompositeOperation = "copy";
        ctx.drawImage(line, 0, 0);
        ctx.globalCompositeOperation = "destination-in";
        ctx.fillStyle = opening;
        ctx.fillRect(0, 0, width, height);
    };
    return gsap.fromTo(sweep, {at: -3 / 7}, {
        at: 1, duration: 2.6, ease: "sine.inOut", repeat: -1, repeatDelay: 2, delay: 1.6, onStart: fit, onRepeat: fit, onUpdate: draw,
    });
}

export default function Hero() {
    configureGsap();

    const {currentTheme} = useTheme();
    const themeGradientClass = GRADIENT_MESHES[currentTheme];

    const currentMonth = useMemo(() => new Date().getMonth() + 1, []);

    // combine general and month-specific texts
    const combinedTexts = useMemo(() => [...(texts[0] || []), ...(texts[currentMonth] || [])], [currentMonth]);

    const [textIndex, setTextIndex] = useState(() => Math.floor(Math.random() * combinedTexts.length));
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    // Typed and deleted a character as you see it at a time (graphemes): one UTF-16 unit at a time, an emoji showed as a
    // broken character for a moment. The line shows the first `charIndex` of them.
    const letters = useMemo(() => graphemes(combinedTexts[textIndex] ?? ""), [combinedTexts, textIndex]);
    const isBlinking = (!isDeleting && charIndex >= letters.length) || (isDeleting && charIndex <= 0);

    const heroRef = useRef<HTMLDivElement>(null);
    const dividerRef = useRef(null);
    const glowRef = useRef<HTMLCanvasElement>(null);
    const glowTween = useRef<gsap.core.Tween | null>(null);
    const titleRef = useRef(null);
    const subtitleRef = useRef<HTMLHeadingElement>(null);
    const typingTextRef = useRef(null);
    const line1Ref = useRef<HTMLParagraphElement>(null);
    const line2Ref = useRef<HTMLParagraphElement>(null);

    // What moves on its own here rests while the hero is off screen: the mesh's drift, the separator's glow, the typing.
    // Half a screen of margin above, so the mesh still drifts while the squares under the hero reflect it.
    const [onScreen, setOnScreen] = useState(true);
    useEffect(() => {
        const hero = heroRef.current;
        if (!hero) return;
        const observer = new IntersectionObserver(([entry]) => setOnScreen(!!entry?.isIntersecting), {rootMargin: "50% 0px 0px 0px"});
        observer.observe(hero);
        return () => observer.disconnect();
    }, []);
    useEffect(() => {
        glowTween.current?.paused(!onScreen);
    }, [onScreen]);

    useEffect(() => {
        // Preload the other styles on mount so the first switch doesn't jump/look buggy
        import("../../../assets/styles/gradient-mesh-night.scss");
        import("../../../assets/styles/gradient-mesh-blush.scss");
        import("../../../assets/styles/gradient-mesh-burgundy.scss");
    }, []);

    useEffect(() => {
        if (!onScreen) return; // carries on where it was when the hero comes back
        if (!letters.length) return; // Safety check

        if (!isDeleting && charIndex < letters.length) {
            const timeout = setTimeout(() => setCharIndex((prev) => prev + 1), 45); // typing delay
            return () => clearTimeout(timeout);
        } else if (isDeleting && charIndex > 0) {
            const timeout = setTimeout(() => setCharIndex((prev) => prev - 1), 15); // deleting delay
            return () => clearTimeout(timeout);
        } else {
            const timeout = setTimeout(() => {
                if (isDeleting) {
                    setTextIndex((prev) => {
                        if (combinedTexts.length < 2) return prev;
                        const next = Math.floor(Math.random() * (combinedTexts.length - 1));
                        return next >= prev ? next + 1 : next;
                    });
                    setIsDeleting(false);
                    setCharIndex(0);
                } else {
                    setIsDeleting(true);
                }
            }, isDeleting ? 150 : 2250); // delay before deleting and after typing
            return () => clearTimeout(timeout);
        }
    }, [charIndex, combinedTexts.length, isDeleting, letters, onScreen]);

    useGSAP(() => {
        const tl = gsap.timeline({});

        const opening_delay = 0.1; // sec

        // Expand divider
        tl.to(dividerRef.current, {
            width: "130%",
            opacity: 1,
            ease: "nativeEase",
            duration: 1,
        }, opening_delay);

        // Once it has expanded, a glow runs through it every few seconds (runGlow, above). Not with reduced motion: it
        // loops for as long as the page is open.
        if (glowRef.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            glowTween.current = runGlow(glowRef.current);
        }

        // Slide up "Hello"
        tl.from([titleRef.current], {
            yPercent: 100,
            ease: "elastic.out(1,1.15)",
            duration: 1.8
        }, 0.25 + opening_delay);

        // Spans rather than SplitText's default divs, which aren't allowed inside an h2 or a p. Hero.scss makes them
        // inline blocks, as split-type's were, since an inline box ignores transforms.
        const subtitleSplit = subtitleRef.current ? SplitText.create(subtitleRef.current, {type: "chars", tag: "span", charsClass: "hero_split"}) : null;

        tl.from(subtitleSplit?.chars ?? [], {
            y: "-100%",
            ease: "nativeEase",
            stagger: 0.03,
            duration: 0.75
        }, 0.70 + opening_delay);

        if (!line1Ref.current || !line2Ref.current) return;

        const line1Split = SplitText.create(line1Ref.current, {type: "words", tag: "span", wordsClass: "hero_split"});
        const line2Split = SplitText.create(line2Ref.current, {type: "words", tag: "span", wordsClass: "hero_split"});

        tl.from(line1Split.words, {
            yPercent: 100,
            y: 25,
            opacity: 0,
            ease: "nativeEase",
            duration: 1,
            stagger: 0.05
        }, 0.88 + opening_delay);

        tl.from(line2Split.words, {
            yPercent: 100,
            y: 25,
            opacity: 0,
            ease: "nativeEase",
            duration: 1,
            stagger: 0.05
        }, 1.20 + opening_delay);

        tl.from(typingTextRef.current, {
            opacity: 0,
            ease: "nativeEase",
            duration: 1.2
        }, 2.00 + opening_delay);
    });

    return (
        <>
            <div className={`${themeGradientClass} hero_mesh`} style={onScreen ? undefined : {animationPlayState: "paused"}} />
            {/*<div className="gradient-mesh-default" />*/}
            <div className="hero" ref={heroRef}>
                <div className="hero_container">
                    <div className="hero_title">
                        <h1 ref={titleRef} className="hero_title">Hello</h1>
                    </div>

                    <div className="hero_glowing-separator" ref={dividerRef}>
                        <canvas className="hero_separator-glow" ref={glowRef} />

                    </div>

                    <div>
                        <h2 className="hero_subtitle" ref={subtitleRef}>I'm Jerry!</h2>
                    </div>
                </div>

                <div className="text-body hero_about-container">
                    <div style={{overflow: "hidden"}}>
                        <p className="hero_line" ref={line1Ref}>
                            Welcome to my personal website
                        </p>
                    </div>
                    <div style={{overflow: "hidden"}}>
                        <p className="hero_line" ref={line2Ref}>
                            Robotics, AI, Medicine, Coding, Science
                        </p>
                    </div>

                    <p className="hero_typing-text" ref={typingTextRef}>
                        {letters.slice(0, charIndex).join("")}<span id="caret" className={isBlinking ? "blink_animation" : ""}>|</span>
                    </p>
                </div>

                <HeroCards />
            </div>
        </>
    );
}
