import React from "react";
import "./SubSectionTitle.scss";

// A fragment rather than a wrapper element, for the same reason SectionTitle uses one: this sits directly
// above whatever the subsection renders, and an extra block in between would need its own layout rules.
const SubSectionTitle: React.FC<{ text: string; description?: string }> = ({text, description}) => {
    const id = text.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

    return (
        <>
            <h3 className="subtitle-text" id={"sub-" + id}>
                {text}
            </h3>
            {description && <p className="subtitle-description">{description}</p>}
        </>
    );
};

export default SubSectionTitle;
