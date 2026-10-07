import {useRef} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import "./Lift.scss";

gsap.registerPlugin(ScrollTrigger);

// As you scroll, the hero's mesh does what the navbar does when it becomes an island: it pulls away from the edges into a
// card, a little smaller, with round corners and a shadow, so the hero ends on the edge of a card rather than on a line.
// The words stay where they are. Over the first third of the hero's way out, following the scroll both ways; nothing
// with reduced motion.

// Its size at the end, its corners (px, before the scale) and how much of the hero's scroll it takes.
const SCALE = 0.95;
const RADIUS = 14;
const OVER = 0.35;

export default function Lift() {
    const root = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        const hero = document.querySelector<HTMLElement>(".hero");
        const mesh = document.querySelector<HTMLElement>(".hero_mesh");
        if (!hero || !mesh) return;
        const mm = gsap.matchMedia();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
            // The mesh's own `transition: all` would chase every frame of this: only its colours keep fading.
            gsap.set(mesh, {transition: "background-color 450ms", transformOrigin: "50% 0%"});
            gsap.fromTo(mesh, {scale: 1, borderRadius: 0, boxShadow: "0 0 0 0 rgba(0, 0, 0, 0)"}, {
                scale: SCALE,
                borderRadius: RADIUS,
                boxShadow: "0 28px 60px -28px var(--shadow-daa)",
                ease: "power1.out",
                scrollTrigger: {trigger: hero, start: "top top", end: () => `+=${OVER * hero.offsetHeight}`, scrub: 0.4, invalidateOnRefresh: true},
            });
        });
        return () => mm.revert();
    }, {scope: root});

    return <div className="lift" ref={root} aria-hidden="true" />;
}
