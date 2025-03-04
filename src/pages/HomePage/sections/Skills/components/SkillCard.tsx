import React from "react";
import {Chip} from "@mui/joy";
import "./SkillCard.scss";
import "../../../../../styles/gradient-mesh-javascript.scss";
import "../../../../../styles/gradient-mesh-kotlin.scss";

export default function SkillCard({logo, title, description, score, url, chipText}: {
    logo: string,
    title: string,
    description?: string,
    score: number,
    url: string
    chipText: string,
}) {
    return (
        <div className="skillcard">
            <div className={`gradient-mesh-${title.toLowerCase().replace(" ", "-")}`} style={{zIndex: "-1", opacity: 0.35}} />
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