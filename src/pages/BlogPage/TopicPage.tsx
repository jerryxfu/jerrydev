import {Helmet} from "react-helmet-async";
import {Link, useParams} from "wouter";
import {ArrowLeft} from "lucide-react";
import Navbar from "@/components/Nav/Navbar.tsx";
import Footer from "@/components/Footer/Footer.tsx";
import PostCard from "./components/PostCard.tsx";
import PostFilters from "./components/PostFilters.tsx";
import {chaptersInTopic, postsInTopic} from "./posts.tsx";
import {isTopicId, TOPICS} from "./topics.tsx";
import {usePostFilter} from "./usePostFilter.ts";
// Not decorative. This page renders blog_topics, blog_list, blog_empty and the whole of PostFilters, all of which BlogPage.scss owns.
// Without this import they are styled only if /blog happened to be visited first in the same session, since each route's CSS ships with its own chunk.
// Imported ahead of TopicPage.scss so the topic-specific rules still win.
import "./BlogPage.scss";
import "./TopicPage.scss";

export default function TopicPage() {
    const {topic} = useParams<{ topic: string }>();
    const id = topic && isTopicId(topic) ? topic : undefined;

    // sortByDate false: the topic's slug array is the syllabus, and a course read newest-first is backwards. Search
    // relevance still overrides it when there is a query, which is what you want when looking for a specific lesson.
    const source = id ? postsInTopic(id) : [];
    const filter = usePostFilter(source, {basePath: id ? `/blog/topics/${id}` : "/blog", sortByDate: false});

    if (!id) {
        return (
            <div className="topic">
                <Navbar isShrunk={true} stagger={false} animate={false} />
                <main className="topic_container topic_missing">
                    <h1>Topic not found</h1>
                    <p>That topic doesn&apos;t exist.</p>
                    <Link href="/blog" className="topic_back"><ArrowLeft size={15} /> Back to all topics</Link>
                </main>
                <Footer />
            </div>
        );
    }

    const {name, description, image} = TOPICS[id];

    // Chapter grouping only survives an unfiltered view. Once there is a search query the order is relevance, not syllabus, so headings would be labelling groups that no longer exist.
    const chapters = filter.isFiltered ? [] : chaptersInTopic(id);
    const named = chapters.filter((chapter) => chapter.name);

    return (
        <div className="topic">
            <Helmet>
                <title>{name} | jerryxf</title>
                <meta name="description" content={description} />
                <link rel="canonical" href={`https://jerryxf.net/blog/topics/${id}`} />
            </Helmet>

            <Navbar isShrunk={true} stagger={false} animate={false} />

            <main className="topic_container">
                <header className="topic_header">
                    <div className="topic_header_inner">
                        <Link href="/blog" className="topic_back"><ArrowLeft size={15} /> All topics</Link>
                        <h1>{name}</h1>
                        <p className="topic_description">{description}</p>
                    </div>

                    {/* After the text in source order, not before it as on a card, so the heading is still the first
                        thing read out; CSS places it on the right. Decorative when it's an asset — the name sits
                        beside it — while an element carries its own <title> and passes through as-is. */}
                    {image && (
                        <div className="topic_header_image">
                            {typeof image === "string"
                                ? <img src={image} alt="" loading="lazy" decoding="async" />
                                : image}
                        </div>
                    )}
                </header>

                {named.length > 0 && (
                    <nav className="blog_topics topic_chapters" aria-label="Chapters">
                        <h2 className="blog_topics_title">Chapters</h2>
                        <div className="blog_topics_list">
                            {named.map((chapter) => (
                                <a key={chapter.anchor} href={`#${chapter.anchor}`} className="blog_topic">
                                    {chapter.name}
                                </a>
                            ))}
                        </div>
                    </nav>
                )}

                <PostFilters {...filter} scope={name} />

                {filter.visible.length === 0 ? (
                    <p className="blog_empty">
                        {filter.isFiltered
                            ? "Nothing in this topic matches that."
                            : "Nothing published in this topic yet."}
                    </p>
                ) : chapters.length > 0 ? (
                    chapters.map((chapter, index) => (
                        <section key={chapter.anchor ?? `intro-${index}`} className="topic_chapter">
                            {chapter.name && (
                                <h2 id={chapter.anchor} className="topic_chapter_title">{chapter.name}</h2>
                            )}
                            <div className="blog_list topic_list">
                                {chapter.posts.map((post) => <PostCard key={post.slug} post={post} />)}
                            </div>
                        </section>
                    ))
                ) : (
                    <div className="blog_list topic_list">
                        {filter.visible.map((post) => <PostCard key={post.slug} post={post} />)}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
