import React from "react";
import "./SectionTitle.scss";
import BlockReveal from "./BlockReveal.tsx";

// The title arrives behind its block of ink (BlockReveal, from TechNexus's landing page).
const SectionTitle: React.FC<{ text: string; description?: string }> = ({text, description}) => {
    const id = text.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

    return (
        <>
            <BlockReveal className="section-title-text" id={id}>
                {text}
            </BlockReveal>
            {description && <p className="section-title-description">{description}</p>}
        </>
    );
};

export default SectionTitle;
