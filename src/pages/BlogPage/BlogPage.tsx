import {Fragment} from "react";
import {Helmet} from "react-helmet-async";
import {Link} from "wouter";
import Navbar from "@/components/Nav/Navbar.tsx";
import Footer from "@/components/Footer/Footer.tsx";
import PostCard from "./components/PostCard.tsx";
import PostFilters from "./components/PostFilters.tsx";
import {listedPosts} from "./posts.tsx";
import {topicIds, TOPICS} from "./topics.tsx";
import {usePostFilter} from "./usePostFilter.ts";
import "./BlogPage.scss";

const monthKey = (date: Date): string => `${date.getFullYear()}-${date.getMonth()}`;
const monthLabel = (date: Date): string => date.toLocaleDateString("en-CA", {month: "long", year: "numeric"});

export default function BlogPage() {
    // Topics are a lens, not a partition, so the source here is still every post.
    const filter = usePostFilter(listedPosts, {basePath: "/blog"});

    return (
        <div className="blog">
            <Helmet>
                <title>Blog | jerryxf</title>
                <meta name="description"
                      content="Writing about the things I discover, build, and learn along the way" />
                <link rel="canonical" href="https://jerryxf.net/blog" />
            </Helmet>

            <Navbar isShrunk={true} stagger={true} animate={false} />

            <main className="blog_container">
                <header className="blog_header">
                    <h1>Blog</h1>
                    <p className="blog_sub">
                        Notes on the things I build, what breaks along the way, and whatever else I have been reading about.
                        Some of it is machine learning, some of it is less serious stuff. No promises about the ratio.
                    </p>
                </header>

                {topicIds.length > 0 && (
                    <nav className="blog_topics" aria-label="Topics">
                        <h2 className="blog_topics_title">Topics</h2>
                        <div className="blog_topics_list">
                            {topicIds.map((id) => (
                                <Link key={id} href={`/blog/topics/${id}`} className="blog_topic">
                                    {TOPICS[id].name}
                                </Link>
                            ))}
                        </div>
                    </nav>
                )}

                <PostFilters {...filter} />

                {filter.visible.length === 0 ? (
                    <p className="blog_empty">
                        {filter.isFiltered
                            ? "Nothing matches that combination yet."
                            : "No posts here yet. Give it a minute..."}
                    </p>
                ) : (
                    <div className="blog_list">
                        {filter.visible.map((post, index) => {
                            // Only with an empty query. Tag filters keep date order so dividers still make sense, but
                            // a search sorts by relevance and month headings would be labelling nothing.
                            const previous = filter.visible[index - 1];
                            const newMonth = filter.query === ""
                                && (!previous || monthKey(previous.date) !== monthKey(post.date));

                            return (
                                <Fragment key={post.slug}>
                                    {newMonth && <h2 className="blog_month">{monthLabel(post.date)}</h2>}
                                    <PostCard post={post} />
                                </Fragment>
                            );
                        })}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
