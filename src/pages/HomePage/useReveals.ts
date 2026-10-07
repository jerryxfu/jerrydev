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
// screen together one after the other. Once, and nothing with reduced motion.
export default function useReveals() {
    useGSAP(() => {
        const mm = gsap.matchMedia();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
            const targets = gsap.utils.toArray<HTMLElement>(REVEALED.join(", "));
            gsap.set(targets, {opacity: 0, y: 18});
            ScrollTrigger.batch(targets, {
                start: "top 92%",
                once: true,
                onEnter: (batch) => gsap.to(batch, {
                    opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.06, overwrite: "auto", clearProps: "opacity,transform",
                }),
            });
        });
        return () => mm.revert();
    });
}
