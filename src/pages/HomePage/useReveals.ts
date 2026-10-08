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
// The page's scroll triggers, these and the others, are measured again when the page moves under them: a picture that
// loads late (the lazy ones load as you come near) or the fonts can move what's below them, and a trigger measured
// before stays off by that much (the languages card, centred beside the skills, moves itself up 143px as it loads).
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

        const main = document.getElementById("main");
        let timer = 0;
        const remeasure = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => ScrollTrigger.refresh(), 200);
        };
        // A picture's load event doesn't bubble, so it's caught on its way down.
        main?.addEventListener("load", remeasure, true);
        const sizes = new ResizeObserver(remeasure);
        if (main) sizes.observe(main);
        document.fonts.addEventListener("loadingdone", remeasure);

        return () => {
            mm.revert();
            main?.removeEventListener("load", remeasure, true);
            sizes.disconnect();
            document.fonts.removeEventListener("loadingdone", remeasure);
            window.clearTimeout(timer);
        };
    });
}
