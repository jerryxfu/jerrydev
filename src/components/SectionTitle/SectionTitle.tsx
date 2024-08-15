import React from "react";
import './SectionTitle.scss';

const SectionTitle: React.FC<{ text: string }> = ({text}) => {
    const id = text.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

    return (
        <div className="section-title-text" id={id}>
            {text}
        </div>
    );
};

export default SectionTitle;