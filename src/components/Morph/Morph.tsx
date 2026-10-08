import {type ElementType, useLayoutEffect, useRef} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {graphemes} from "@/utils.ts";
import "./Morph.scss";

gsap.registerPlugin(ScrollTrigger);

// Text changing the way a Live Activity's does, from TechNexus's landing page (website/src/pages/Home in that repo):
// the letters that change blur out, dropping a little, and the new ones blur in from just above, in the same place,
// after a short pause. The letters both texts start with stay put, so "6:41" to "6:42" only swaps the last digit, the
// way iOS keeps a number's unchanged digits.
//
// Meant for short labels: every letter is its own inline block, so a long text could break anywhere. A screen reader
// gets the whole text from a hidden copy, never the letters. Usage:
//
//     <Morph text={status} />                        changes morph, the first text is simply there
//     <Morph text="24 projects since 2021" reveal /> the first text also blurs in once it scrolls into view

// In seconds: the old letters going, and the step between one and the next; how long after they start going the new
// ones start coming; the new letters coming. And how far both travel, as a share of a letter's height.
const MORPH = {out: 0.34, outStagger: 0.012, gap: 0.3, in: 0.6, inStagger: 0.016, travel: 25};

// Letters are graphemes (utils.ts): a variation selector alone in its span would leave 🛰️ drawn as a plain glyph.

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function letter(text: string): HTMLSpanElement {
    const char = document.createElement("span");
    char.className = "morph_char";
    char.textContent = text;
    return char;
}

// The text, at once.
function place(el: HTMLElement, text: string) {
    el.replaceChildren(...graphemes(text).map(letter));
}

function morph(el: HTMLElement, to: string) {
    const next = graphemes(to);
    // Letters still leaving from the change before are on their way out, not part of the text.
    const shown = Array.from(el.querySelectorAll<HTMLElement>(":scope > .morph_char:not(.is-leaving)"));
    const prev = shown.map((char) => char.textContent ?? "");

    let keep = 0;
    while (keep < prev.length && keep < next.length && prev[keep] === next[keep]) keep++;
    if (keep === prev.length && keep === next.length) return;

    if (prefersReducedMotion()) {
        place(el, to);
        return;
    }

    // The leaving letters come out of the line where they stand, so the new ones take their place at once. Measured
    // first, all of them, since taking one out moves the rest.
    const leaving = shown.slice(keep);
    const swap = leaving.length > 0;
    if (swap) {
        const origin = el.getBoundingClientRect();
        const spots = leaving.map((char) => char.getBoundingClientRect());
        leaving.forEach((char, i) => {
            char.classList.add("is-leaving");
            gsap.set(char, {position: "absolute", left: spots[i]!.left - origin.left, top: spots[i]!.top - origin.top});
        });
        gsap.to(leaving, {
            opacity: 0, yPercent: MORPH.travel, filter: "blur(4px)", duration: MORPH.out, ease: "power2.in",
            stagger: MORPH.outStagger, onComplete: () => leaving.forEach((char) => char.remove()),
        });
    }

    const arriving = next.slice(keep).map((text) => {
        const char = letter(text);
        el.append(char);
        return char;
    });
    // The first time, every letter comes in from a little higher, and quicker.
    gsap.fromTo(arriving, {opacity: 0, yPercent: swap ? -MORPH.travel : -40, filter: "blur(4px)"}, {
        opacity: 1, yPercent: 0, filter: "blur(0px)", duration: swap ? MORPH.in : 0.45, ease: "power3.out",
        stagger: swap ? MORPH.inStagger : 0.015, delay: swap ? MORPH.gap : 0, clearProps: "filter,transform",
    });
}

type Props = {
    text: string;
    as?: ElementType;
    className?: string;
    // Blur the first text in when it scrolls into view, instead of having it there from the start.
    reveal?: boolean;
};

export default function Morph({text, as: Tag = "span", className, reveal = false}: Props) {
    const letters = useRef<HTMLSpanElement>(null);
    // Whether the first text is in. Until it is, a new text only replaces what will arrive.
    const placed = useRef(false);
    const pending = useRef(text);

    useLayoutEffect(() => {
        const el = letters.current;
        if (!el) return;
        if (!reveal || prefersReducedMotion()) {
            place(el, pending.current);
            placed.current = true;
            return;
        }
        // Hidden before the first paint (a layout effect), shown as the letters start to arrive.
        el.style.visibility = "hidden";
        const trigger = ScrollTrigger.create({
            trigger: el,
            start: "top 92%",
            once: true,
            onEnter: () => {
                el.style.visibility = "";
                morph(el, pending.current);
                placed.current = true;
            },
        });
        return () => trigger.kill();
    }, [reveal]);

    useLayoutEffect(() => {
        pending.current = text;
        const el = letters.current;
        if (el && placed.current) morph(el, text);
    }, [text]);

    return (
        <Tag className={className ? `morph ${className}` : "morph"}>
            <span className="visually-hidden">{text}</span>
            <span className="morph_letters" aria-hidden="true" ref={letters} />
        </Tag>
    );
}
