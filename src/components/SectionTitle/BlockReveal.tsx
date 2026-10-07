import {type ElementType, type ReactNode, useRef} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {SplitText} from "gsap/SplitText";
import {useGSAP} from "@gsap/react";
import "./BlockReveal.scss";

gsap.registerPlugin(ScrollTrigger, SplitText);

type Props = {
    children: ReactNode;
    // The element to render, an h2 unless told otherwise.
    as?: ElementType;
    className?: string;
    id?: string;
    // How far up the screen the element's top must come before it plays, as ScrollTrigger reads it.
    start?: string;
};

// The timing, in seconds, per line: the block wiping across, the words held inverted on it, the block sliding away, and
// the gap before the next line starts. TechNexus's, played SPEED times faster: at its own pace a title came in a beat
// late on a page you scroll through. The words' colour fade in BlockReveal.scss follows the same factor.
const REVEAL = {wipe: 0.4, hold: 0.18, slide: 0.48, stagger: 0.18};
const SPEED = 1.6;

// A heading that arrives line by line behind a block of ink, from TechNexus's landing page (website/src/pages/Home in
// that repo): the block wipes across each line, the words show on it in the background's colour, knocked a few pixels
// aside, then the block slides off the other side as they snap back into place and into their own colours, while two
// small marks in the accent flash beside it. Expo easing both ways, for the weight of a block that has to get going and
// then stop. Once every line is in, the heading goes back to its own markup, so it wraps again if the window changes.
//
// Without JavaScript, or with reduced motion, the heading is simply there. Usage:
//
//     <BlockReveal className="section-title-text" id="projects">Projects</BlockReveal>
export default function BlockReveal({children, as: Tag = "h2", className, id, start = "top 86%"}: Props) {
    const ref = useRef<HTMLElement>(null);

    // contextSafe (always passed, typed as optional) keeps what runs after the fonts load in this context, so it's
    // reverted with it.
    useGSAP((_, contextSafe = (fn) => fn) => {
        const el = ref.current;
        if (!el) return;

        const mm = gsap.matchMedia();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
            // Hidden before the first paint (useGSAP runs as a layout effect), shown by the timeline.
            gsap.set(el, {visibility: "hidden"});

            let split: SplitText | null = null;
            let cancelled = false;
            // A split into lines measures the words, so it waits for the fonts.
            document.fonts.ready.then(contextSafe(() => {
                if (cancelled) return;
                split = SplitText.create(el, {type: "lines", linesClass: "block-reveal_line"});
                const timeline = gsap.timeline({paused: true, onComplete: () => split?.revert()}).timeScale(SPEED);

                split.lines.forEach((line, i) => {
                    // The words in a box of their own, so they can move while the block stays.
                    const words = document.createElement("span");
                    words.className = "block-reveal_text";
                    words.append(...Array.from(line.childNodes));
                    const block = document.createElement("span");
                    block.className = "block-reveal_block";
                    const marks = ["block-reveal_mark", "block-reveal_mark is-bar"].map((name) => {
                        const mark = document.createElement("span");
                        mark.className = name;
                        return mark;
                    });
                    line.append(block, words, ...marks);
                    line.classList.add("is-hidden");
                    // A square just before the line's start, low; a bar just past its end, high.
                    gsap.set(marks[0]!, {left: -gsap.utils.random(12, 20), top: "70%"});
                    gsap.set(marks[1]!, {left: "100%", x: gsap.utils.random(10, 22), top: "14%"});

                    const at = i * REVEAL.stagger;
                    const shown = at + REVEAL.wipe;
                    const away = shown + REVEAL.hold;
                    timeline
                        .fromTo(block, {scaleX: 0, transformOrigin: "0% 50%"}, {
                            scaleX: 1, duration: REVEAL.wipe, ease: "expo.inOut",
                        }, at)
                        .call(() => line.classList.replace("is-hidden", "is-inverted"), [], shown)
                        .to(words, {keyframes: {x: [10, -5, 3, 0], easeEach: "steps(1)"}, duration: 0.27, ease: "none"}, shown)
                        .fromTo(marks, {opacity: 0}, {
                            keyframes: {opacity: [1, 0, 1, 0], easeEach: "steps(1)"}, duration: 0.33, ease: "none", stagger: 0.065,
                        }, shown - 0.1)
                        .set(block, {transformOrigin: "100% 50%"}, away)
                        .call(() => line.classList.replace("is-inverted", "is-settling"), [], away)
                        .to(block, {scaleX: 0, duration: REVEAL.slide, ease: "expo.inOut"}, away);
                });

                gsap.set(el, {visibility: "visible"});
                ScrollTrigger.create({trigger: el, start, once: true, onEnter: () => timeline.play()});
            }));

            return () => {
                cancelled = true;
                split?.revert();
                gsap.set(el, {clearProps: "visibility"});
            };
        });
        return () => mm.revert();
    }, {scope: ref, dependencies: [start]});

    return <Tag ref={ref} className={className} id={id}>{children}</Tag>;
}
