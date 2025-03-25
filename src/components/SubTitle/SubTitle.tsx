import React from "react";
import "./SubTitle.scss";

const SubTitle: React.FC<{ text: string }> = ({text}) => {
    const id = text.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

    return (
        <div className="subtitle-text" id={"sub-" + id}>
            {text}
        </div>
    );
};

export default SubTitle;