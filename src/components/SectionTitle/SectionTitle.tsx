import React from "react";
import "./SectionTitle.scss";

const SectionTitle: React.FC<{ text: string; description?: string }> = ({text, description}) => {
    const id = text.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

    return (
        <>
            <h2 className="section-title-text" id={id}>
                {text}
            </h2>
            {description && <p className="section-title-description">{description}</p>}
        </>
    );
};

export default SectionTitle;
