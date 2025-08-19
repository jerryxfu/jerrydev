import {useEffect, useMemo, useRef, useState} from "react";
import {gsap} from "gsap";
import {useGSAP} from "@gsap/react";
import "./Hero.scss";
import SplitType from "split-type";
import useThemeSwitcher from "../../../hooks/useThemeSwitcher.ts";

const texts: { [key: number]: string[] } = {
    0: [
        // General
        "🚀 Code is my canvas; elegance is my masterpiece.",
        "🚀 Coding my way through the digital universe!",
        "🚀 Coding with a dash of innovation!",
        "🚀 Coding with a sprinkle of creativity!",
        "🚀 Coding with a touch of elegance!",
        "🚀 Coding with a touch of magic!",
        "🚀 Coding with a touch of passion!",
        "🚀 Coding with a touch of style!",
        "🌟 Crafting code and chasing dreams.",
        "💡 Ctrl + Alt + Defeat is not in my vocabulary.",
        "🌙 Debugger by day, dreamer by night. What's your superpower?",
        "🔮 Embracing a world of brackets, semicolons, and creative chaos.",
        "🔓 Hacking the boundaries of reality with lines of code.",
        "👋 Hello, World!",
        "☕ I don't sweat, I debug in style.",
        "✨ Let's build something magic together!",
        "🚀 Launching into the universe of code, propelled by creativity.",
        "🌟 Navigating the digital matrix with a keyboard as my compass.",
        "🌟 Welcome to my digital domain!",
        "🌟 Welcome to my digital realm!",
        "🌟 Welcome to my digital world!",
        "🔥 Writing code that sets keyboards on fire."
    ],
    // January-specific
    1: [
        "🎉 Happy New Year! 🎊",
        "🎆 A new year, a new beginning!",
        "🌟 New year, new code!",
        "🎆 New year, new dreams!",
        "🌟 New year, new goals!",
        "🎉 New year, new opportunities!"
    ],
    // February-specific
    2: [
        "💘 Coding with a heart of gold!",
        "💘 Coding with a sprinkle of love!",
        "💖 Coding with all my love!",
        "💖 Love is in the code!"
    ],
    // March-specific
    3: [
        "🍀 Coding is my lucky charm!",
        "🌈 Coding with a pinch of luck!",
        "🍀 Coding with a pot of gold!",
        "🍀 Luck of the coder!",
        "🌈 Rainbow of code!"
    ],
    // April-specific
    4: [
        "🎂 Birthday month!",
        "🤡 April fools! 🎈",
        "🃏 Gotcha! 🎉",
        "🤪 Prankster at work!",
        "🎈 Fool me once, shame on you!",
        "🌸 April showers bring May flowers!",
        "🌷 Spring has sprung!",
        "🌼 Flowers where you are planted!",
        "🌸 April showers bring code flowers!",
        "🌷 Spring has sprung, and so have I!",
        "🌼 Coding and blooming!"
    ],
    // May-specific
    5: [
        "🌺 Blooming with code!",
        "🌼 Blooming with creativity!",
        "🌺 Blossoming with code!",
        "🌸 Coding with a bouquet of ideas!",
        "🌸 Coding with a spring in my step!",
        "🌸 Coding with a touch of nature!",
        "🌺 Coding with a touch of spring!",
        "🌺 Coding with a touch of sunshine!",
        "🌷 Springing into code!"
    ],
    // June-specific
    6: [
        "🌊 Catching waves of inspiration!",
        "🌞 Chasing sunsets and debugging sunrises!",
        "🌊 Making a splash in the world of coding!",
        "🌊 Riding the waves of creativity!",
        "🌞 Soaking up the sun and coding up a storm!",
        "🌞 Summer vibes only!"
    ],
    // July-specific
    7: [
        "🍦 Chilling with code and ice cream!",
        "🍦 Coding with a cherry on top!",
        "🍦 Coding with a scoop of fun!",
        "🍦 Coding with a sprinkle of summer!",
        "🍦 Coding with an extra scoop of creativity!",
        "🍦 Coding with sprinkles on top!"
    ],
    // August-specific
    8: [
        "🌴 Coding under the shade of palm trees!",
        "🌴 Coding with a splash of summer!",
        "🌴 Coding with a tropical twist!",
        "🌴 Coding with an island breeze!",
        "🌴 Summer coding vibes!"
    ],
    // September-specific
    9: [
        "📚 Back to school, back to code!",
        "📚 Coding my way through the school year!",
        "🍂 Coding with a touch of fall!",
        "🍁 Fall-ing into code!",
        "📚 School's in session, and so is coding!"
    ],
    // October-specific
    10: [
        "🦇 Bats about to fly!",
        "🎃 Creepin' it real!",
        "🍂 Coding with a touch of fall!",
        "🍁 Fall-ing into code!",
        "👻 Ghostly greetings!",
        "🍂 Leafing through lines of code!",
        "🎃 Pumpkin spice and everything nice!",
        "👻 Spooky season is here!",
        "🎃 Trick or treat! 🍭",
        "🎃 Witchful thinking!"
    ],
    // November-specific
    11: [
        "🍂 Autumn leaves and lines of code!",
        "🍁 Giving thanks for code!",
        "🦃 Gobbling up code like a turkey!",
        "🍁 Harvesting lines of code!",
        "🍂 Leafing through lines of code!",
    ],
    // December-specific
    12: [
        "🎁 Happy holidays! 🎄",
        "❄️ Let it snow, let it snow, let it snow!",
        "🎅 Ho ho ho!",
        "🎄 Have yourself a merry little Christmas!",
        "🦌 Rudolph the red-nosed reindeer!",
        "🌟 Starlight, star bright!",
        "🎁 All I want for Christmas is you!"
    ],
};

export default function Hero() {
    const {currentTheme} = useThemeSwitcher();
    const [themeGradientClass, setThemeGradientClass] = useState("gradient-mesh-default");
    const currentMonth = useMemo(() => new Date().getMonth() + 1, []);

    // useParallax(".hero_parallax-background", 0.5);

    // combine general and month-specific texts
    const combinedTexts = useMemo(() => [...(texts[0] || []), ...(texts[currentMonth] || [])], [currentMonth]);

    const [headerText, setHeaderText] = useState("");
    const [textIndex, setTextIndex] = useState(Math.floor(Math.random() * combinedTexts.length));
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isBlinking, setIsBlinking] = useState(false);

    const dividerRef = useRef(null);
    const heroTitleRef = useRef(null);
    // const bonRef = useRef(null);
    // const jourRef = useRef(null);
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
            case "celestial":
                import("../../../assets/styles/gradient-mesh-celestial.scss");
                setThemeGradientClass("gradient-mesh-celestial");
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

        // Slide up "Bon(jour)"
        tl.from([titleRef.current /*bonRef.current, jourRef.current*/], {
            yPercent: 100,
            ease: "nativeEase",
            duration: 0.90
        }, 0.20 + opening_delay);

        // // Slide "Bon" to the left
        // tl.from(heroTitleRef.current, {
        //     x: "17%",
        //     duration: 0.70,
        //     ease: "nativeEase"
        // }, 1.05 + opening_delay);

        // Slide in "jour" to the right (appear)
        // tl.from([jourRef.current], {
        //     x: "-100%",
        //     duration: 0.70,
        //     ease: "nativeEase"
        // }, 1.05 + opening_delay);

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
            <div className={themeGradientClass + " hero_parallax-background"} />
            {/*<div className="gradient-mesh-default" />*/}
            <div className="hero">
                <div className="hero_container">
                    {/*<div style={{overflow: "hidden"}}>*/}
                    <div className={"hero_title"} ref={heroTitleRef}>
                        <h1 ref={titleRef} className="hero_title-part1">Hello</h1>
                        {/*<h1 ref={bonRef} className="hero_title-part1">Bon</h1>*/}
                        {/*<div className="hero_title-mask">*/}
                        {/*    <h1 ref={jourRef} className="hero_title-part2">jour</h1>*/}
                        {/*</div>*/}
                    </div>
                    {/*</div>*/}

                    <div className="hero_glowing-separator" ref={dividerRef} />

                    <div style={{overflow: "hidden"}}>
                        <h1 className="hero_subtitle" ref={subtitleRef}>I'm Jerry!</h1>
                    </div>
                </div>

                <div className="text hero_about-container">
                    <div style={{overflow: "hidden"}}><p className="hero_line" ref={line1Ref}>
                        Aspiring physician-engineer, exploring where medicine and technology meet
                    </p></div>
                    <div style={{overflow: "hidden"}}><p className="hero_line" ref={line2Ref}>
                        Medicine • AI • Robotics • Science • Computer Vision • Deep Learning • Coding
                    </p></div>
                </div>

                <p className="hero_typing-text" ref={typingTextRef}>
                    {headerText}<span id="caret" className={isBlinking ? "blink_animation" : ""}>|</span>
                </p>
            </div>
            {/*<div className="hero_shadow" />*/}
        </div>
    );
}
