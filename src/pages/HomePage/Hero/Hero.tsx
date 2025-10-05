import {useEffect, useMemo, useRef, useState} from "react";
import {gsap} from "gsap";
import {useGSAP} from "@gsap/react";
import "./Hero.scss";
import SplitType from "split-type";
import useThemeSwitcher from "../../../hooks/useThemeSwitcher.ts";
import {texts} from "./texts.ts";
import HomeIsland from "./HomeIsland.tsx";

export default function Hero() {
    const {currentTheme} = useThemeSwitcher();
    const [themeGradientClass, setThemeGradientClass] = useState("gradient-mesh-default");
    const currentMonth = useMemo(() => new Date().getMonth() + 1, []);

    // combine general and month-specific texts
    const combinedTexts = useMemo(() => [...(texts[0] || []), ...(texts[currentMonth] || [])], [currentMonth]);

    const [headerText, setHeaderText] = useState("");
    const [textIndex, setTextIndex] = useState(Math.floor(Math.random() * combinedTexts.length));
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isBlinking, setIsBlinking] = useState(false);

    const dividerRef = useRef(null);
    const heroTitleRef = useRef(null);
    const titleRef = useRef(null);
    const subtitleRef = useRef(null);
    const typingTextRef = useRef(null);
    const line1Ref = useRef(null);
    const line2Ref = useRef(null);

    useEffect(() => {
        switch (currentTheme) {
            case "night":
                import("../../../assets/styles/gradient-mesh-night.scss");
                setThemeGradientClass("gradient-mesh-night");
                break;
            default:
                import("../../../assets/styles/gradient-mesh-default.scss");
                setThemeGradientClass("gradient-mesh-default");
                break;
        }
    }, [currentTheme]);

    useEffect(() => {
        const typeText = () => {
            setIsBlinking(false);
            const currentText = combinedTexts[textIndex];
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
            setIsBlinking(true);
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
            ease: "nativeEase",
            duration: 0.90
        }, 0.20 + opening_delay);

        // @ts-ignore TS2345: Argument of type null is not assignable to parameter of type TargetElement
        const subtitleSplit = new SplitType(subtitleRef.current, {types: "chars"});

        tl.from(subtitleSplit.chars, {
            y: "-100%",
            ease: "nativeEase",
            stagger: 0.03,
            duration: 0.75
        }, 0.65 + opening_delay);

        // @ts-ignore TS2345: Argument of type null is not assignable to parameter of type TargetElement
        const line1Split = new SplitType(line1Ref.current, {types: "words"});
        // @ts-ignore TS2345: Argument of type null is not assignable to parameter of type TargetElement
        const line2Split = new SplitType(line2Ref.current, {types: "words"});


        tl.from(line1Split.words, {
            yPercent: 100,
            y: 25,
            opacity: 0,
            ease: "nativeEase",
            duration: 1,
            stagger: 0.05
        }, 0.8 + opening_delay);

        tl.from(line2Split.words, {
            yPercent: 100,
            y: 25,
            opacity: 0,
            ease: "nativeEase",
            duration: 1,
            stagger: 0.05
        }, 1.25 + opening_delay);

        tl.from(typingTextRef.current, {
            opacity: 0,
            ease: "nativeEase",
            duration: 1
        }, 2 + opening_delay);
    });

    return (
        <div style={{overflow: "hidden"}}>
            <div className={themeGradientClass} />
            {/*<div className="gradient-mesh-default" />*/}
            <div className="hero">
                <div className="hero_container">
                    <div className={"hero_title"} ref={heroTitleRef}>
                        <h1 ref={titleRef} className="hero_title-part1">Hello</h1>
                    </div>

                    <div className="hero_glowing-separator" ref={dividerRef} />

                    <div style={{overflow: "hidden"}}>
                        <h1 className="hero_subtitle" ref={subtitleRef}>I'm Jerry!</h1>
                    </div>
                </div>

                <div className="hero_island-fixed">
                    <HomeIsland />
                </div>

                <div className="text hero_about-container">
                    <div style={{overflow: "hidden"}}><p className="hero_line" ref={line1Ref}>
                        Aspiring physician-engineer, exploring where medicine and technology meet
                    </p></div>
                    <div style={{overflow: "hidden"}}><p className="hero_line" ref={line2Ref}>
                        Medicine, AI, Robotics, Science, Computer Vision, Deep Learning, Coding
                    </p></div>

                    <p className="hero_typing-text" ref={typingTextRef}>
                        {headerText}<span id="caret" className={isBlinking ? "blink_animation" : ""}>|</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
