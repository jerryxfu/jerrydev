import {useEffect, useState} from "react";
import Mist from "./Mist.tsx";
import Squares from "./Squares.tsx";
import Horizon from "./Horizon.tsx";
import "./Seam.scss";

// The way from the hero into About. Sketches, round twelve, each confined to where the two meet (nothing fixed over the
// screen); round eleven's clouds, stardust and lift are in 5cf5856:
// - mist: the hero high up, its top fading into space (stars in the dark themes), its bottom into mist you sink into;
// - squares: the mesh's lower edge breaks into cells like GitHub's contribution graph, in five levels of its own light;
// - horizon: the hero ends on the curve of a planet's horizon, a line of light that flattens as you come down.
// Picked with ?seam=mist, squares or horizon, or with the switcher at the bottom of the screen.
const SEAMS = ["mist", "squares", "horizon"] as const;
type SeamName = typeof SEAMS[number];
const LABEL: Record<SeamName, string> = {mist: "Mist", squares: "Squares", horizon: "Horizon"};

const fromUrl = (): SeamName => {
    const asked = new URLSearchParams(window.location.search).get("seam");
    return SEAMS.find((name) => name === asked) ?? "mist";
};

export default function Seam() {
    const [seam, setSeam] = useState<SeamName>(fromUrl);

    // For the styles each way changes outside this component (which layer goes over which).
    useEffect(() => {
        document.documentElement.dataset.seam = seam;
        return () => {
            delete document.documentElement.dataset.seam;
        };
    }, [seam]);

    const pick = (name: SeamName) => {
        const url = new URL(window.location.href);
        url.searchParams.set("seam", name);
        window.history.replaceState(window.history.state, "", url);
        setSeam(name);
    };

    return (
        <>
            {seam === "mist" && <Mist key="mist" />}
            {seam === "squares" && <Squares key="squares" />}
            {seam === "horizon" && <Horizon key="horizon" />}
            <div className="seam-switcher" role="group" aria-label="Way from the hero into About (prototype)">
                {SEAMS.map((name) => (
                    <button
                        key={name}
                        type="button"
                        className={name === seam ? "is-on" : undefined}
                        aria-pressed={name === seam}
                        onClick={() => pick(name)}
                    >
                        {LABEL[name]}
                    </button>
                ))}
            </div>
        </>
    );
}
