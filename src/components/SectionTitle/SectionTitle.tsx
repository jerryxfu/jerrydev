import React from "react";
import "./SectionTitle.scss";
import BlockReveal from "./BlockReveal.tsx";

// The title arrives behind its block of ink (BlockReveal, from TechNexus's landing page). start, when given, is where
// the title's top must come up the screen before it plays (BlockReveal's own default otherwise).
const SectionTitle: React.FC<{ text: string; description?: string; start?: string }> = ({text, description, start}) => {
    const id = text.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

    return (
        <>
            <BlockReveal className="section-title-text" id={id} start={start}>
                {text}
            </BlockReveal>
            {description && <p className="section-title-description">{description}</p>}
        </>
    );
};

export default SectionTitle;
