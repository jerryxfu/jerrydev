import {memo, ReactNode} from "react";
import {Chip} from "@mui/joy";
import "./ContactCard.scss";

const ContactCard = memo(function ContactCard({title, username, image, url, chipText, color}: {
    title: string,
    username: string | ReactNode,
    image: string,
    url?: string
    chipText?: string | undefined,
    color?: string,
}) {
    return (
        <div className="contactcard" style={{backgroundColor: color || "initial"}}>
            <a className="contactcard_image" href={url || "/"} target="_blank" rel="noopener noreferrer">
                <img src={image} alt={`${title} icon`} loading="lazy" decoding="async" fetchPriority="low" />
            </a>
            <div className="contactcard_content">
                <h3 className="contactcard_title">{title}</h3>
                <p className="contactcard_username">{username}</p>

            </div>
            {chipText && <Chip className="contactcard_chip" size={"sm"}>{chipText}</Chip>}
        </div>
    );
});

export default ContactCard;
