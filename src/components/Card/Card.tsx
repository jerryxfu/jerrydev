import {memo, type ReactElement} from "react";
import {Link} from "wouter";
import Chip from "../../components/Chip/Chip.tsx";
import "./Card.scss";

export interface CardProps {
    // Either a URL to an image or video asset, or a rendered element for vector marks. An element is passed straight
    // through untouched: no src, no alt, no format sniffing, since it carries its own <title> for the accessible name.
    image: string | ReactElement;
    title: string;
    subTitle?: string;
    description: string;
    chipText?:
        "🌀 Concept"
        | "🧩 MVP" // Minimum Viable Product
        | "🚧 WIP" // Work In Progress
        | "🟢 Stable" // The project is stable and maintained
        | "💤 Stalled" // The project works but is not actively maintained
        | "⚠️ Deprecated" // The project is deprecated and should not be used
        | "🗑️ Obsolete" // The project is no longer relevant or useful
        | "🔴 Broken" // The project does not work
        | "❌Abandoned" // The project does not work and no longer maintained
        | "🛠️ Maintenance" // The project is under maintenance
        | "🌅 Sunsetting" // The project is no longer maintained but still available
        | "✅ Completed" // The project is completed and no further work is planned
        | "📦 Archived" // The project is archived and read-only
        | "🔒 Internal" // The project is internal and not publicly available
        | string;
    // Slug of the post that expands on this project, e.g. "expedite-p2p" for /blog/expedite-p2p. Deliberately a slug
    // rather than a full path so Card owns the route shape, and deliberately not validated against posts.ts — importing
    // the manifest here would drag the whole blog index into the home page bundle for a compile-time nicety.
    blogSlug?: string;
    url?: string | undefined;
    color?: string | undefined;
    footer?: string | undefined;
    dateDisplay?: string;
}

const Card = memo(function Card(props: CardProps) {
    const {image, title, subTitle, description, chipText, blogSlug, url, color, footer, dateDisplay} = props;

    // Guard the string branch before touching string methods — .toLowerCase() on an element throws at render.
    const isAsset = typeof image === "string";
    const isVideo = isAsset && /\.(mp4|webm|ogg|mov)$/.test(image.toLowerCase());
    const shouldOpenNewTab = Boolean(url?.startsWith("http"));

    return (
        <div className="card" style={{backgroundColor: color || "initial"}}>
            <div className="card_image_section">
                <a
                    className="card_image"
                    href={url || undefined}
                    {...(shouldOpenNewTab ? {target: "_blank", rel: "noopener noreferrer"} : {})}
                >
                    {!isAsset ? image : isVideo ? (
                        <video src={image} autoPlay loop muted playsInline disablePictureInPicture preload="none" />
                    ) : (
                        <img src={image} alt={`${title} icon`} loading="lazy" decoding="async" fetchPriority="low" />
                    )}
                </a>
                {chipText && <Chip className="card_image_chip" size={"sm"}>{chipText}</Chip>}

                {/* Sibling of card_image, never a child. card_image is itself an <a>, and nesting anchors is invalid and breaks click handling.
                As siblings, the overlay takes the blog route and the rest of the image keeps the project URL. */}
                {blogSlug && (
                    <Link href={`/blog/${blogSlug}`} className="card_article">
                        <span>Open article</span>
                        <span className="card_article_arrow" aria-hidden="true">→</span>
                    </Link>
                )}
            </div>

            <div className="card_header">
                <div className="card_header_content">
                    <h3>{title}</h3>
                    {subTitle && <h4>{subTitle}</h4>}
                </div>
            </div>

            <div className="card_content">
                <p>{description}</p>
            </div>

            <div className="card_footer">
                <p className="card_stats">
                    {/*<span className="stat-item"></span>*/}
                </p>
                <p className="card_date">
                    {footer && `${footer} | `}
                    {dateDisplay}
                </p>
            </div>
        </div>
    );
});

export default Card;

