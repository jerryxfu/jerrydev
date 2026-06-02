import {useEffect, useMemo, useRef, useState} from "react";
import {gsap} from "gsap";
import {useGSAP} from "@gsap/react";
import {CustomEase} from "gsap/CustomEase";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {TextPlugin} from "gsap/TextPlugin";
import "./Hero.scss";
import SplitType from "split-type";
import {texts} from "./texts.ts";
import {useTheme} from "../../../context/ThemeContext.tsx";

import("../../../assets/styles/gradient-mesh-default.scss");

let isGsapConfigured = false;

function configureGsap() {
    if (isGsapConfigured) return;

    gsap.registerPlugin(useGSAP, CustomEase, ScrollTrigger, TextPlugin);
    CustomEase.create("nativeEase", "0.250, 0.100, 0.250, 1.000");
    CustomEase.create("customEaseOut", "0.250, 0.100, 0.580, 1.000");
    gsap.defaults({ease: "nativeEase"});

    isGsapConfigured = true;
}

export default function Hero() {
    configureGsap();

    const {currentTheme} = useTheme();
    const themeGradientClass = currentTheme === "night" ? "gradient-mesh-night" : "gradient-mesh-default";
    const currentMonth = useMemo(() => new Date().getMonth() + 1, []);

    // combine general and month-specific texts
    const combinedTexts = useMemo(() => [...(texts[0] || []), ...(texts[currentMonth] || [])], [currentMonth]);

    const [headerText, setHeaderText] = useState("");
    const [textIndex, setTextIndex] = useState(() => Math.floor(Math.random() * combinedTexts.length));
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    const currentText = combinedTexts[textIndex] ?? "";
    const isBlinking = (!isDeleting && charIndex >= currentText.length) || (isDeleting && charIndex <= 0);

    const dividerRef = useRef(null);
    const titleRef = useRef(null);
    const subtitleRef = useRef<HTMLHeadingElement>(null);
    const typingTextRef = useRef(null);
    const line1Ref = useRef<HTMLParagraphElement>(null);
    const line2Ref = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        // Preload the other styles on mount so the first switch doesn't jump/look buggy
        import("../../../assets/styles/gradient-mesh-night.scss");
    }, []);

    useEffect(() => {
        const typeText = () => {
            if (!currentText) return; // Safety check

            if (!isDeleting) {
                setHeaderText((prev) => prev + currentText[charIndex]);
                setCharIndex((prev) => prev + 1);
            } else {
                setHeaderText((prev) => prev.slice(0, -1));
                setCharIndex((prev) => prev - 1);
            }
        };

        const currentText = combinedTexts[textIndex];
        if (!currentText) return; // Safety check

        if (!isDeleting && charIndex < currentText.length) {
            const timeout = setTimeout(typeText, 45); // typing delay
            return () => clearTimeout(timeout);
        } else if (isDeleting && charIndex > 0) {
            const timeout = setTimeout(typeText, 15); // deleting delay
            return () => clearTimeout(timeout);
        } else {
            const timeout = setTimeout(() => {
                if (isDeleting) {
                    setTextIndex(Math.floor(Math.random() * combinedTexts.length));
                    setIsDeleting(false);
                    setCharIndex(0);
                } else {
                    setIsDeleting(true);
                }
            }, isDeleting ? 150 : 2250); // delay before deleting and after typing
            return () => clearTimeout(timeout);
        }
    }, [charIndex, combinedTexts, isDeleting, textIndex]);

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

        // Slide up "Hello"
        tl.from([titleRef.current], {
            yPercent: 100,
            ease: "elastic.out(1,1.15)",
            duration: 1.8
        }, 0.20 + opening_delay);

        const subtitleSplit = subtitleRef.current ? new SplitType(subtitleRef.current, {types: "chars"}) : null;

        tl.from(subtitleSplit?.chars ?? [], {
            y: "-100%",
            ease: "nativeEase",
            stagger: 0.03,
            duration: 0.75
        }, 0.65 + opening_delay);

        if (!line1Ref.current || !line2Ref.current) return;

        const line1Split = new SplitType(line1Ref.current, {types: "words"});
        const line2Split = new SplitType(line2Ref.current, {types: "words"});

        tl.from(line1Split.words, {
            yPercent: 100,
            y: 25,
            opacity: 0,
            ease: "nativeEase",
            duration: 1,
            stagger: 0.05
        }, 0.85 + opening_delay);

        tl.from(line2Split.words, {
            yPercent: 100,
            y: 25,
            opacity: 0,
            ease: "nativeEase",
            duration: 1,
            stagger: 0.05
        }, 1.30 + opening_delay);

        tl.from(typingTextRef.current, {
            opacity: 0,
            ease: "nativeEase",
            duration: 1.2
        }, 2.25 + opening_delay);
    });

    return (
        <>
            <div className={themeGradientClass} />
            {/*<div className="gradient-mesh-default" />*/}
            <div className="hero">
                <div className="hero_container">
                    <div className="hero_title">
                        <h1 ref={titleRef} className="hero_title">Hello</h1>
                    </div>

                    <div className="hero_glowing-separator" ref={dividerRef} />

                    <div>
                        <h2 className="hero_subtitle" ref={subtitleRef}>I'm Jerry!</h2>
                    </div>
                </div>

                <div className="text-body hero_about-container">
                    <div style={{overflow: "hidden"}}>
                        <p className="hero_line" ref={line1Ref}>
                            Aspiring physician-engineer, exploring where medicine and technology meet
                        </p>
                    </div>
                    <div style={{overflow: "hidden"}}>
                        <p className="hero_line" ref={line2Ref}>
                            Medicine, AI, Robotics, Science, Computer Vision, Deep Learning, Coding
                        </p>
                    </div>

                    <p className="hero_typing-text" ref={typingTextRef}>
                        {headerText}<span id="caret" className={isBlinking ? "blink_animation" : ""}>|</span>
                    </p>
                </div>
            </div>
        </>
    );
}
