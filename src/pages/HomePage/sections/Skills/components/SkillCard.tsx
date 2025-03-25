import React from "react";
import {Chip} from "@mui/joy";
import "./SkillCard.scss";
import "../../../../../assets/styles/gradient-mesh-javascript.scss";
import "../../../../../assets/styles/gradient-mesh-kotlin.scss";
import "../../../../../assets/tech_stack/gradient-javascript.svg";

export default function SkillCard({image, title, description, score, chipText, url, color}: {
    image: string,
    title: string,
    description?: string,
    score: number,
    chipText: string,
    url?: string
    color?: string,
}) {
    return (
        <div className="skillcard" style={{backgroundColor: color || "initial"}}>
            <a href={url || "/"} target="_blank" rel="noopener noreferrer">
                <img src={image} alt={`${title} icon`} className="skillcard_image" />
            </a>
            <div className="skillcard_content">
                <h3 className="skillcard_title">{title}</h3>
                <p className="skillcard_description">{description}</p>

            </div>
            <Chip className="skillcard_chip" size={"sm"}>{chipText}</Chip>
        </div>
    );
}