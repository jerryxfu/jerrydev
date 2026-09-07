import {memo, type ReactNode} from "react";
import "./ContactCard.scss";

const ContactCard = memo(function ContactCard({title, username, image, url, color}: {
    title: string,
    username: string | ReactNode,
    image: string,
    url?: string
    color?: string,
}) {
    return (
        <div className="contactcard" style={{backgroundColor: color || "initial"}}>
            <a className="contactcard_image" href={url || "/"} target="_blank" rel="noopener noreferrer">
                <img src={image} alt={`${title} icon`} loading="lazy" decoding="async" fetchPriority="low" />
            </a>
            <div className="contactcard_content">
                <h3 className="contactcard_title">{title}</h3>
                <p style={{lineHeight: 1.3}} className="contactcard_username">{username}</p>
            </div>
        </div>
    );
});

export default ContactCard;
