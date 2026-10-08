import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

// What fades up into place as it comes on screen, in the order of the page. Not the experience timeline, which has its
// own way in, nor the posts, which load later; the projects' cards by their inner box, which their filter animates too.
const REVEALED = [
    ".section-title-description",
    ".about_intro",
    ".subtitle-text",
    ".subtitle-description",
    ".contact_grid > *",
    ".contact_work-body",
    ".friends_card",
    ".skills_grid > *",
    ".skills_text",
    ".projects_controls",
    ".projects-item_inner",
    ".board",
    ".blog-section_intro",
    ".blog-section_feed",
];

// The home page's content, below the hero, comes in quietly: each block rises 18px as it fades in, those that come on
// screen together one after the other. Once, and nothing with reduced motion. After a jump down the page, what it went
// past is simply there, so what's on screen doesn't wait its turn behind everything above it (2s and more, before).
//
// Measuring the scroll triggers stops a scroll. ScrollTrigger.refresh() measures every trigger with the page at the
// top: it scrolls the page to 0 and back in one go. Nothing shows, but a scroll under way stops dead (Firefox drops a
// trackpad's glide). It used to run on every picture's load, and the lazy ones load as you come near, so mid-scroll
// (Jerry, Oct 2026: "after scrolling shortly it abruptly stops scrolling"). So it's measured as little as can be:
// - A picture holds its room before it's in: a size written on it, or a box of fixed size. A late one then moves
//   nothing and needs no measure. The languages card in Skills has its size written on it (it moved 143px coming in).
// - A picture from another site is lazy. An eager one holds back the page's load event, and GSAP measures by itself on
//   it, scroll or no scroll: the Creative Commons icons in the footer held it for seconds after a reload.
// - What measures when a scroll may be under way waits for it to end, with refresh(true): the fonts, below. Projects'
//   plain refresh() calls follow a click (a filter, or a card's opening, 0.8s long), when nothing is scrolling.
// Otherwise a trigger measured before something above it moved stays off by that much: its reveal comes late or early.
export default function useReveals() {
    useGSAP(() => {
        const mm = gsap.matchMedia();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
            const targets = gsap.utils.toArray<HTMLElement>(REVEALED.join(", "));
            gsap.set(targets, {opacity: 0, y: 18});
            ScrollTrigger.batch(targets, {
                start: "top 92%",
                once: true,
                onEnter: (batch) => {
                    const passed = batch.filter((el) => el.getBoundingClientRect().bottom <= 0);
                    const coming = batch.filter((el) => !passed.includes(el));
                    if (passed.length) gsap.set(passed, {clearProps: "opacity,transform"});
                    if (coming.length) gsap.to(coming, {
                        opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.06, overwrite: "auto", clearProps: "opacity,transform",
                    });
                },
            });
        });

        // The fonts can come in after the page's load event (in development they do) and move the text under them.
        const remeasure = () => ScrollTrigger.refresh(true);
        document.fonts.addEventListener("loadingdone", remeasure);

        return () => {
            mm.revert();
            document.fonts.removeEventListener("loadingdone", remeasure);
        };
    });
}
