import {Chip} from "@mui/joy";
import "./ProjectCard.scss";

export default function ProjectCard({image, title, subTitle, description, chipText, url, color, date}: {
    image: string,
    title: string,
    subTitle: string,
    description: string,
    chipText: string,
    url?: string,
    color?: string,
    date: Date,
}) {
    return (
        <div className="projectcard" style={{backgroundColor: color || "initial"}}>
            <a className="projectcard_image" href={url || "/"} target="_blank" rel="noopener noreferrer">
                <img src={image} alt={`${title} icon`} />
            </a>
            <Chip className="projectcard_chip" size={"sm"}>{chipText}</Chip>
            <div className="projectcard_header">
                <h2>{title}</h2>
                <h3>{subTitle}</h3>
                <Chip className="projectcard_chip" size={"sm"}>{date.toDateString()}</Chip>
            </div>
            <div className="projectcard_content">
                <p>{description}</p>
            </div>
        </div>
    );
}