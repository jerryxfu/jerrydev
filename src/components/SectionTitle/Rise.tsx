import {type ElementType, type ReactNode, useRef} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {SplitText} from "gsap/SplitText";
import {useGSAP} from "@gsap/react";

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

// A heading whose words rise into place from just under their line, one after the other, as it comes on screen: the
// way the hero's lines come in, and quieter than the block of ink it replaces (BlockReveal). Once they're in, the
// heading goes back to its own markup, so it wraps again if the window changes. Without JavaScript, or with reduced
// motion, it's simply there.
export default function Rise({children, as: Tag = "h2", className, id, start = "top 88%"}: Props) {
    const ref = useRef<HTMLElement>(null);

    // contextSafe (always passed, typed as optional) keeps what runs after the fonts load in this context.
    useGSAP((_, contextSafe = (fn) => fn) => {
        const el = ref.current;
        if (!el) return;

        const mm = gsap.matchMedia();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
            // Hidden before the first paint (useGSAP runs as a layout effect), until its words are hidden instead.
            gsap.set(el, {visibility: "hidden"});
            let split: SplitText | null = null;
            let cancelled = false;
            // A split into lines measures the words, so it waits for the fonts.
            document.fonts.ready.then(contextSafe(() => {
                if (cancelled) return;
                split = SplitText.create(el, {type: "lines,words", mask: "lines"});
                const rise = gsap.timeline({paused: true, onComplete: () => split?.revert()});
                rise.from(split.words, {yPercent: 110, opacity: 0, duration: 0.95, ease: "expo.out", stagger: 0.06});
                rise.progress(0.001).progress(0); // the words' hidden start, now
                gsap.set(el, {visibility: "visible"});
                ScrollTrigger.create({trigger: el, start, once: true, onEnter: () => rise.play()});
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
