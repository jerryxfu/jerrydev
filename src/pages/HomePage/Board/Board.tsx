import {useRef} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import {isArchived, projects} from "../Projects/projects.ts";
import "./Board.scss";

gsap.registerPlugin(ScrollTrigger);

// A departures board of the projects and where each one stands, under the projects section: TechNexus's queue board
// (website/src/pages/Home in that repo), which drifts on its own, runs faster the faster you scroll, and turns round
// when you scroll back up. The projects section says the same things properly, so screen readers skip this.

// Each status by the colour of its chip's emoji, from the palette constants in index.scss.
const STATUS_COLOUR: Record<string, string> = {
    Stable: "var(--success)",
    WIP: "var(--orange)",
    Completed: "var(--info)",
    MVP: "var(--purple)",
    Concept: "var(--pink)",
};

// In the projects section's order; the archived ones stay off the board.
const ROW = projects
    .filter((project) => !isArchived(project))
    .map((project) => {
        // "🟢 Stable" to "Stable": the label is whatever follows the emoji.
        const status = (project.chipText ?? "").replace(/^\S+\s*/u, "");
        return {name: project.title, status, colour: STATUS_COLOUR[status] ?? "var(--gray)"};
    });

const clamp = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));

export default function Board() {
    const board = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        const track = board.current?.querySelector(".board_track");
        if (!track) return;
        const mm = gsap.matchMedia();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
            // Two copies side by side, so moving by half its width loops without a seam. About two seconds an item. It
            // runs only while the board is on screen; off it, the loop and its ticker rest.
            const loop = gsap.to(track, {xPercent: -50, ease: "none", duration: ROW.length * 2.2, repeat: -1, paused: true});
            let direction = 1;
            let target = 1;
            // Ease the speed toward the target, and the target back to a drift, every frame.
            const tick = () => {
                target = direction + (target - direction) * 0.94;
                loop.timeScale(gsap.utils.interpolate(loop.timeScale(), target, 0.1));
            };
            ScrollTrigger.create({
                trigger: board.current,
                start: "top bottom",
                end: "bottom top",
                onUpdate: (self) => {
                    direction = self.direction;
                    target = direction * clamp(1 + Math.abs(self.getVelocity()) / 250, 1, 7);
                },
                onToggle: (self) => {
                    loop.paused(!self.isActive);
                    if (self.isActive) gsap.ticker.add(tick);
                    else gsap.ticker.remove(tick);
                },
            });
            return () => gsap.ticker.remove(tick);
        });
        return () => mm.revert();
    }, {scope: board});

    const run = ROW.map((item) => (
        <span className="board_item" key={item.name}>
            <span className="board_name">{item.name}</span>
            <span className="board_dot" style={{color: item.colour}} />
            <span className="board_status">{item.status}</span>
        </span>
    ));

    return (
        <div className="board" ref={board} aria-hidden="true">
            <div className="board_track">
                <span className="board_run">{run}</span>
                <span className="board_run">{run}</span>
            </div>
        </div>
    );
}
