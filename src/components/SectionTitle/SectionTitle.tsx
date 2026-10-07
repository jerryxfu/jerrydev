import React from "react";
import "./SectionTitle.scss";
import Rise from "./Rise.tsx";

// The title's words rise into place as it comes on screen (Rise). It used to arrive behind a block of ink (BlockReveal,
// from TechNexus's landing page), which Jerry wasn't sure suited the section titles; that component stays for now.
const SectionTitle: React.FC<{ text: string; description?: string }> = ({text, description}) => {
    const id = text.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

    return (
        <>
            <Rise className="section-title-text" id={id}>
                {text}
            </Rise>
            {description && <p className="section-title-description">{description}</p>}
        </>
    );
};

export default SectionTitle;
