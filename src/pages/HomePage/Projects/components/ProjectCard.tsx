import {Chip} from "@mui/joy";
import "./ProjectCard.scss";

export interface Project {
    image: string;
    title: string;
    subTitle: string;
    description: string;
    chipText: "🌀 Concept"
        | "🧩 MVP" // Minimum Viable Product
        | "🚧 WIP" // Work In Progress
        | "🟢 Stable" // The project is stable and maintained
        | "✅ Delivered" // The project has been delivered and is stable
        | "💤 Stalled" // The project works but is not actively maintained
        | "🔁 Superseded" // The project has been replaced
        | "⚠️ Deprecated" // The project is deprecated and should not be used
        | "🗑️ Obsolete" // The project is no longer relevant or useful
        | "🔴 Broken" // The project does not work
        | "❌Abandoned" // The project does not work and no longer maintained
        | "🛠️ Maintenance" // The project is under maintenance
        | "🌅 Sunset" // The project is no longer maintained but still available
        | "🎖️ Fulfilled" // The project has fulfilled its purpose and is sunsetting
        | "📦 Archived" // The project is archived and read-only
        | "🔒 Internal" // The project is internal and not publicly available
        | string;
    url?: string | undefined;
    color?: string | undefined;
    footer?: string | undefined;
    date: Date;
}

export default function ProjectCard(props: Project) {
    const {image, title, subTitle, description, chipText, url, color, footer, date} = props;

    return (
        <div className="projectcard" style={{backgroundColor: color || "initial"}}>
            {/* Image Section */}
            <div className="projectcard_image_section">
                <a className="projectcard_image" href={url || "/"} target="_blank" rel="noopener noreferrer">
                    <img src={image} alt={`${title} icon`} />
                </a>
                {chipText && <Chip className="projectcard_image_chip" size={"sm"}>{chipText}</Chip>}
            </div>

            {/* Header Section */}
            <div className="projectcard_header">
                <div className="projectcard_header_content">
                    <h2>{title}</h2>
                    <h3>{subTitle}</h3>
                </div>
            </div>

            {/* Content Section */}
            <div className="projectcard_content">
                <p>{description}</p>
            </div>

            {/* Footer Section */}
            <div className="projectcard_footer">
                <div className="projectcard_stats">
                    <span className="stat-item">|</span>
                </div>
                <div className="projectcard_date">
                    {footer && `${footer} | `}
                    {date.toDateString()}
                </div>
            </div>
        </div>
    );
}