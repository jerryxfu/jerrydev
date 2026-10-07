import {useEffect, useState} from "react";
import Clouds from "./Clouds.tsx";
import Stardust from "./Stardust.tsx";
import Lift from "./Lift.tsx";
import "./Seam.scss";

// The way from the hero into About. A prototype with three ways to pick from, each confined to where the two meet
// (nothing fixed over the whole screen):
// - clouds: the hero is the sky and the page a sea of clouds you sink into, stars above them in the dark themes;
// - dust: the hero's mesh breaks up into dots from its lower edge, and they rise like stars as you scroll;
// - lift: the hero's mesh pulls away from the edges into a card with round corners, the way the navbar becomes an island.
// Picked with ?seam=clouds, dust or lift, or with the switcher at the bottom of the screen.
const SEAMS = ["clouds", "dust", "lift"] as const;
type SeamName = typeof SEAMS[number];
const LABEL: Record<SeamName, string> = {clouds: "Clouds", dust: "Stardust", lift: "Lift"};

const fromUrl = (): SeamName => {
    const asked = new URLSearchParams(window.location.search).get("seam");
    return SEAMS.find((name) => name === asked) ?? "clouds";
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
            {seam === "clouds" && <Clouds key="clouds" />}
            {seam === "dust" && <Stardust key="dust" />}
            {seam === "lift" && <Lift key="lift" />}
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
