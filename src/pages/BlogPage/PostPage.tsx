import {Suspense, useRef} from "react";
import {Helmet} from "react-helmet-async";
import {Link, useParams} from "wouter";
import {ArrowLeft, ArrowRight} from "lucide-react";
import Navbar from "@/components/Nav/Navbar.tsx";
import Footer from "@/components/Footer/Footer.tsx";
import Chip from "@/components/Chip/Chip.tsx";
import PostToc from "./components/PostToc.tsx";
import {formatPostAge, formatPostDate, isReadable, listedPosts, neighbours, postComponents} from "./posts.tsx";
import {TOPICS} from "./topics.tsx";
import "katex/dist/katex.min.css";
import "./PostPage.scss";

export default function PostPage() {
    const {slug} = useParams<{ slug: string }>();
    const bodyRef = useRef<HTMLElement>(null);

    const post = listedPosts.find((entry) => entry.slug === slug);
    // Already-constructed lazy components, keyed by slug. Nothing has been fetched yet; rendering one below is what triggers its chunk.
    const Body = slug ? postComponents[slug] : undefined;
    // Empty for a post in no topic, which is what keeps the topic link and the prev/next control off ordinary posts.
    const {topic, prev, next} = neighbours(slug ?? "");

    // Needs both halves: a manifest entry for the metadata and a file for the prose, plus permission to show it.
    // In dev the check in posts.ts already named whichever half is missing; isReadable is what turns a typed-in draft URL into a dead end in production.
    if (!post || !Body || !isReadable(post)) {
        return (
            <div className="post">
                <Navbar isShrunk={true} stagger={false} animate={false} />

                <main className="post_container post_missing">
                    <h1>Post not found</h1>
                    <p>That one doesn&apos;t exist, or it hasn&apos;t been published yet.</p>
                    <Link href="/blog" className="post_back"><ArrowLeft size={15} /> Back to the blog</Link>
                </main>
                <Footer />
            </div>
        );
    }

    // Built once and rendered twice. Dropping the old empty <span /> placeholder along the way: the
    // sides are pinned by auto margins now, so prev stays left and next stays right whether or not
    // the other one exists, without an empty element holding a slot open.
    const navLinks = topic && (prev || next) ? (
        <>
            {prev && (
                <Link href={`/blog/${prev.slug}`} className="post_nav_link post_nav_prev">
                    <span className="post_nav_label">
                        <ArrowLeft size={13} /><span className="post_nav_word">Previous</span>
                    </span>
                    <span className="post_nav_title">{prev.title}</span>
                </Link>
            )}
            {next && (
                <Link href={`/blog/${next.slug}`} className="post_nav_link post_nav_next">
                    <span className="post_nav_label">
                        <span className="post_nav_word">Next</span><ArrowRight size={13} />
                    </span>
                    <span className="post_nav_title">{next.title}</span>
                </Link>
            )}
        </>
    ) : null;

    return (
        <div className="post">
            <Helmet>
                <title>{post.title} | jerryxf</title>
                <meta name="description" content={post.description} />
                <link rel="canonical" href={`https://jerryxf.net/blog/${post.slug}`} />
                <meta property="og:type" content="article" />
                <meta property="og:title" content={post.title} />
                <meta property="og:description" content={post.description} />
                {/* Only an asset URL can be an og:image; interpolating an element would emit "[object Object]". */}
                {typeof post.image === "string" &&
                    <meta property="og:image" content={`https://jerryxf.net${post.image}`} />}
            </Helmet>

            <Navbar isShrunk={true} stagger={false} animate={false} />

            <main className="post_container">
                <Link href="/blog" className="post_back"><ArrowLeft size={15} /> Back to the blog</Link>

                {/* The same links as the pair at the foot of the post, minus the titles. A div rather than
                    a second <nav>, so the page does not expose two navigation landmarks sharing one name. */}
                {navLinks && <div className="post_nav post_nav--compact">{navLinks}</div>}

                <header className="post_header">
                    <h1>{post.title}</h1>
                    <p className="post_description">{post.description}</p>
                    <div className="post_meta">
                        {topic && (
                            <Link href={`/blog/topics/${topic}`} className="post_topic">{TOPICS[topic].name}</Link>
                        )}
                        {post.tags.map((tag) => <Chip key={tag} size="sm">#{tag}</Chip>)}
                        <span className="post_date">{formatPostDate(post.date)} ({formatPostAge(post.date)})</span>
                    </div>
                </header>

                {/* Reads its headings back off the rendered article, so it needs the ref rather than the
                    post: the ids come from rehype-slug at build time and only exist in the DOM. Renders
                    nothing at all on a post with fewer than three sections. */}
                <PostToc bodyRef={bodyRef} slug={post.slug} />

                <article className="post_body" ref={bodyRef}>
                    <Suspense fallback={null}>
                        <Body />
                    </Suspense>
                </article>

                {/* Only rendered inside a topic, and each side only when there is somewhere to go, so the first and
                    last lesson each show a single control rather than a greyed-out pair. */}
                {topic && navLinks && (
                    <nav className="post_nav" aria-label={`${TOPICS[topic].name} navigation`}>
                        {navLinks}
                    </nav>
                )}
            </main>
        </div>
    );
}
