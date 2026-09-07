import {Link} from "wouter";
import {formatPostAge, isReadable, listedPosts} from "@/pages/BlogPage/posts.tsx";
import {topicIds, TOPICS} from "@/pages/BlogPage/topics.tsx";
import "./BlogFeed.scss";

// Everything that reaches into the blog manifest lives in this file, and this file is only ever reached
// through React.lazy, see Blog.tsx. posts.tsx pulls in the topic manifests and a glob over every .mdx
// body, none of which the home page has any business carrying in its first chunk.

const COUNT = 7;

// Drafts are dropped here, unlike /blog.
const readable = listedPosts.filter(isReadable);
const recent = readable.slice(0, COUNT);

// Day and month only. The year is in the title attribute for anything old enough to need it, and the
// relative age at the end of the row carries the sense of "how long ago" that a full date does not.
const stamp = (date: Date): string =>
    date.toLocaleDateString("en-CA", {month: "short", day: "2-digit"});

// Read off the local fields rather than through toISOString(). Post dates are local midnight by
// construction (see postDate in posts.tsx), and converting one to UTC lands on the previous day for any
// reader east of Greenwich, which would put a date in the markup that disagrees with the one rendered.
const isoDay = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function BlogFeed() {
    return (
        <div className="blogfeed">
            <ol className="blogfeed_list">
                {recent.map((post) => (
                    <li key={post.slug}>
                        <Link href={`/blog/${post.slug}`} className="blogfeed_row">
                            <time
                                className="blogfeed_stamp"
                                dateTime={isoDay(post.date)}
                                title={post.date.toLocaleDateString("en-CA", {year: "numeric", month: "long", day: "numeric"})}
                            >
                                {stamp(post.date)}
                            </time>
                            <span className="blogfeed_title">{post.title}</span>
                            <span className="blogfeed_tags">
                                {post.tags.map((tag) => <span key={tag}>#{tag}</span>)}
                            </span>
                            <span className="blogfeed_age">{formatPostAge(post.date)}</span>
                        </Link>
                    </li>
                ))}
            </ol>

            <div className="blogfeed_footer">
                <div className="blogfeed_topics">
                    <span className="text-label">Topics</span>
                    {topicIds.map((id) => (
                        <Link key={id} href={`/blog/topics/${id}`} className="blogfeed_topic">
                            {TOPICS[id].name}
                        </Link>
                    ))}
                </div>

                <Link href="/blog" className="blogfeed_all">
                    <span className="blogfeed_all-label">All {readable.length} posts</span>
                    <span className="blogfeed_arrow" aria-hidden="true">→</span>
                </Link>
            </div>
        </div>
    );
}
