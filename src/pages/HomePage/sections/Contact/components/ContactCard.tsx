import React from "react";
import {Chip} from "@mui/joy";
import "./ContactCard.scss";
import "../../../../../assets/styles/gradient-mesh-javascript.scss";
import "../../../../../assets/styles/gradient-mesh-kotlin.scss";
import "../../../../../assets/tech_stack/gradient-javascript.svg";

export default function ContactCard({title, username, image, url, chipText, color}: {
    title: string,
    username: string,
    image: string,
    url?: string
    chipText: string,
    color?: string,
}) {
    return (
        <div className="contactcard" style={{backgroundColor: color || "initial"}}>
            <a href={url || "/"} target="_blank" rel="noopener noreferrer">
                <img src={image} alt={`${title} icon`} className="contactcard_image" />
            </a>
            <div className="contactcard_content">
                <h3 className="contactcard_title">{title}</h3>
                <p className="contactcard_username">{username}</p>

            </div>
            <Chip className="contactcard_chip" size={"sm"}>{chipText}</Chip>
        </div>
    );
}