import {ReactNode} from "react";
import {Chip} from "@mui/joy";
import "./ContactCard.scss";

export default function ContactCard({title, username, image, url, chipText, color}: {
    title: string,
    username: string | ReactNode,
    image: string,
    url?: string
    chipText: string,
    color?: string,
}) {
    return (
        <div className="contactcard" style={{backgroundColor: color || "initial"}}>
            <a className="contactcard_image" href={url || "/"} target="_blank" rel="noopener noreferrer">
                <img src={image} alt={`${title} icon`} />
            </a>
            <div className="contactcard_content">
                <h3 className="contactcard_title">{title}</h3>
                <p className="contactcard_username">{username}</p>

            </div>
            <Chip className="contactcard_chip" size={"sm"}>{chipText}</Chip>
        </div>
    );
}