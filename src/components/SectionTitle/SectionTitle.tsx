import React from "react";
import "./SectionTitle.scss";
import BlockReveal from "./BlockReveal.tsx";
import Morph from "../Morph/Morph.tsx";

type Props = {
    text: string;
    description?: string;
    // The section's place on the page, shown as "03" in the small heading above the title.
    index?: number;
    // A fact about the section, next to the index: "24 projects since 2021". Blurs in as it scrolls into view, and
    // morphs if it changes later, which is how the blog's says when it was last updated once the posts have loaded.
    kicker?: string;
};

// The heading pattern from TechNexus's landing page: a small heading that blurs in, then the title arriving behind
// its block of ink.
const SectionTitle: React.FC<Props> = ({text, description, index, kicker}) => {
    const id = text.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

    return (
        <>
            {(index !== undefined || kicker) && (
                <p className="section-title-kicker">
                    {index !== undefined && <span className="section-title-kicker_index">{String(index).padStart(2, "0")}</span>}
                    {kicker && <Morph text={kicker} reveal />}
                </p>
            )}
            <BlockReveal className="section-title-text" id={id}>
                {text}
            </BlockReveal>
            {description && <p className="section-title-description">{description}</p>}
        </>
    );
};

export default SectionTitle;
