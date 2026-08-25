import {memo} from "react";
import {Link} from "wouter";
import Chip from "@/components/Chip/Chip.tsx";
import {formatPostDate, type Post} from "../posts.ts";
import "./PostCard.scss";

const PostCard = memo(function PostCard({post}: { post: Post }) {
    return (
        <Link href={`/blog/${post.slug}`} className="postcard">
            {/* No image element at all when there isn't one, so the body simply
                takes the full width. No modifier class needed. */}
            {post.image && (
                <div className="postcard_image">
                    {/* Decorative: the title sits directly beside it. */}
                    <img src={post.image} alt="" loading="lazy" decoding="async" fetchPriority="low" />
                </div>
            )}

            <div className="postcard_body">
                <h2 className="postcard_title">{post.title}</h2>
                <p className="postcard_description">{post.description}</p>

                <div className="postcard_meta">
                    {post.draft && <Chip size="sm">📝 Draft</Chip>}
                    {post.tags.map((tag) => <Chip key={tag} size="sm">#{tag}</Chip>)}
                    <span className="postcard_date">{formatPostDate(post.date)}</span>
                </div>
            </div>
        </Link>
    );
});

export default PostCard;
