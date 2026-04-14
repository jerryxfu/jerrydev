import {memo} from "react";
import {Chip} from "@mui/joy";
import "./Card.scss";

export interface CardProps {
    image: string;
    title: string;
    subTitle?: string;
    description: string;
    chipText?:
        "🌀 Concept"
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
    dateDisplay?: string;
}

const Card = memo(function Card(props: CardProps) {
    const {image, title, subTitle, description, chipText, url, color, footer, dateDisplay} = props;

    const isVideo = image.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/);
    const shouldOpenNewTab = Boolean(url?.startsWith("http"));

    return (
        <div className="card" style={{backgroundColor: color || "initial"}}>
            <div className="card_image_section">
                <a
                    className="card_image"
                    href={url || undefined}
                    {...(shouldOpenNewTab ? {target: "_blank", rel: "noopener noreferrer"} : {})}
                >
                    {isVideo ? (
                        <video src={image} autoPlay loop muted playsInline disablePictureInPicture preload="none" />
                    ) : (
                        <img src={image} alt={`${title} icon`} loading="lazy" decoding="async" fetchPriority="low" />
                    )}
                </a>
                {chipText && <Chip className="card_image_chip" size={"sm"}>{chipText}</Chip>}
            </div>

            <div className="card_header">
                <div className="card_header_content">
                    <h2>{title}</h2>
                    {subTitle && <h3>{subTitle}</h3>}
                </div>
            </div>

            <div className="card_content">
                <p>{description}</p>
            </div>

            <div className="card_footer">
                <div className="card_stats">
                    {/*<span className="stat-item"></span>*/}
                </div>
                <div className="card_date">
                    {footer && `${footer} | `}
                    {dateDisplay}
                </div>
            </div>
        </div>
    );
});

export default Card;

