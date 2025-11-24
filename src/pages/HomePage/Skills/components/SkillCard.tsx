import {Chip} from "@mui/joy";
import "./SkillCard.scss";

export default function SkillCard({image, title, description, score, chipText, url, color}: {
    image: string,
    title: string,
    description?: string,
    score?: number | undefined,
    chipText?: string | undefined,
    url?: string
    color?: string,
}) {
    return (
        <div className="skillcard" style={{backgroundColor: color || "initial"}}>
            <a className="skillcard_image" href={url || "/"} target="_blank" rel="noopener noreferrer">
                <img src={image} alt={`${title} icon`} />
            </a>
            <div className="skillcard_content">
                <h3>{title}</h3>
                <p className="skillcard_description">{description}</p>

            </div>
            <Chip className="skillcard_chip" size={"sm"}>{chipText}</Chip>
        </div>
    );
}