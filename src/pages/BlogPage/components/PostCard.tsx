import {memo} from "react";
import {Link} from "wouter";
import Chip from "@/components/Chip/Chip.tsx";
import {formatPostAge, formatPostDate, isReadable, type Post} from "../posts.tsx";
import "./PostCard.scss";

const PostCard = memo(function PostCard({post}: { post: Post }) {
    const readable = isReadable(post);

    // Keyed to draft rather than to readability, so a draft still looks like a draft on the dev server where it is
    // clickable. The two only diverge in dev; in production they agree.
    const className = `postcard${post.draft ? " postcard--draft" : ""}`;

    const content = (
        <>
            {/* No image element at all when there isn't one, so the body simply takes the full width. */}
            {post.image && (
                <div className="postcard_image">
                    {/* Decorative when it's an asset: the title sits directly beside it. An element carries its own
                        <title>, so it passes through as-is. */}
                    {typeof post.image === "string"
                        ? <img src={post.image} alt="" loading="lazy" decoding="async" fetchPriority="low" />
                        : post.image}
                </div>
            )}

            <div className="postcard_body">
                <h2 className="postcard_title">{post.title}</h2>
                <p className="postcard_description">{post.description}</p>

                <div className="postcard_meta">
                    {post.draft && <Chip size="sm">📝 Draft</Chip>}
                    {post.tags.map((tag) => <Chip key={tag} size="sm">#{tag}</Chip>)}
                    <span className="postcard_date">{formatPostDate(post.date)} ({formatPostAge(post.date)})</span>
                </div>
            </div>
        </>
    );

    // A plain div rather than a disabled anchor: with no <a> there is no href in the DOM, so there is nothing for
    // middle-click, "copy link address", or a crawler to pick up, and no tab stop to land on.
    return readable
        ? <Link href={`/blog/${post.slug}`} className={className}>{content}</Link>
        : <div className={className}>{content}</div>;
});

export default PostCard;
