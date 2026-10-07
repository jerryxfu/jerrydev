import {useState} from "react";
import Horizon, {type SquaresStyle} from "./Horizon.tsx";
import "./Seam.scss";

// The way from the hero into About: the horizon, which flattens and breaks into moving square cells (Horizon.tsx).
// Round thirteen's switcher compares three ways for the cells to move, picked with ?squares=fire, sparkle or crystal
// or the pill at the bottom of the screen; it goes once one is picked.
const STYLES: SquaresStyle[] = ["fire", "sparkle", "crystal"];
const LABEL: Record<SquaresStyle, string> = {fire: "Fire", sparkle: "Sparkle", crystal: "Crystal"};

const fromUrl = (): SquaresStyle => {
    const asked = new URLSearchParams(window.location.search).get("squares");
    return STYLES.find((name) => name === asked) ?? "fire";
};

export default function Seam() {
    const [style, setStyle] = useState<SquaresStyle>(fromUrl);

    const pick = (name: SquaresStyle) => {
        const url = new URL(window.location.href);
        url.searchParams.set("squares", name);
        window.history.replaceState(window.history.state, "", url);
        setStyle(name);
    };

    return (
        <>
            <Horizon squares={style} />
            <div className="seam-switcher" role="group" aria-label="How the squares move (prototype)">
                {STYLES.map((name) => (
                    <button
                        key={name}
                        type="button"
                        className={name === style ? "is-on" : undefined}
                        aria-pressed={name === style}
                        onClick={() => pick(name)}
                    >
                        {LABEL[name]}
                    </button>
                ))}
            </div>
        </>
    );
}
