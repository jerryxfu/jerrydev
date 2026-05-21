import React from "react";
import "./SubSectionTitle.scss";

const SubSectionTitle: React.FC<{ text: string }> = ({text}) => {
    const id = text.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

    return (
        <h3 className="subtitle-text" id={"sub-" + id}>
            {text}
        </h3>
    );
};

export default SubSectionTitle;