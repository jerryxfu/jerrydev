import React from "react";
import {Chip} from "@mui/joy";
import "./SkillCard.scss";
import "../../../../../styles/gradient-mesh-javascript.scss";
import "../../../../../styles/gradient-mesh-kotlin.scss";
import "../../../../../assets/tech_stack/gradient-javascript.svg";

export default function SkillCard({logo, title, description, score, url, chipText}: {
    logo: string,
    title: string,
    description?: string,
    score: number,
    url: string
    chipText: string,
}) {
    console.log(`../../../../../assets/tech_stack/gradient-${title.toLowerCase().replace(/[^A-Za-z0-9 ]/g, "-")}.svg`);
    return (
        <div className="skillcard">
            <img src={`../../../../../assets/tech_stack/gradient-${title.toLowerCase().replace(/[^A-Za-z0-9 ]/g, "-")}.svg`} alt={`${title} gradient`}
                 className="skillcard_bg" />
            {/*<img src="../../../../../assets/tech_stack/gradient-javascript.svg" alt={`${title} gradient`}*/}
            {/*     className="skillcard_bg" />*/}
            <a href={url} target="_blank" rel="noopener noreferrer">
                <img src={logo} alt={`${title} logo`} className="skillcard_logo" />
            </a>
            <div className="skillcard_content">
                <h3 className="skillcard_title">{title}</h3>
                <p className="skillcard_description">{description}</p>

            </div>
            <Chip className="skillcard_chip" size={"sm"}>{chipText}</Chip>
        </div>
    );
}