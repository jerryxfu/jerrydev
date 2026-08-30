import {Suspense, useRef} from "react";
import {Helmet} from "react-helmet-async";
import {Link, useParams} from "wouter";
import {ArrowLeft, ArrowRight, ArrowUp} from "lucide-react";
import Navbar from "@/components/Nav/Navbar.tsx";
import Footer from "@/components/Footer/Footer.tsx";
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

    // A lesson belongs to its course, so "back" means the topic page rather than the whole blog. Resolved before the early return below so the not-found branch gets it too:
    // a draft URL in production lands there, and its topic is still the place the reader came from. Falls back to /blog for a post in no topic, or a slug that matches nothing.
    const back = topic
        ? {href: `/blog/topics/${topic}`, label: `Back to ${TOPICS[topic].name}`}
        : {href: "/blog", label: "Back to the blog"};

    // Needs both halves: a manifest entry for the metadata and a file for the prose, plus permission to show it.
    // In dev the check in posts.ts already named whichever half is missing; isReadable is what turns a typed-in draft URL into a dead end in production.
    if (!post || !Body || !isReadable(post)) {
        return (
            <div className="post">
                <Navbar isShrunk={true} stagger={false} animate={false} />

                <main className="post_container post_missing">
                    <h1>Post not found</h1>
                    <p>That one doesn&apos;t exist, or it hasn&apos;t been published yet.</p>
                    <Link href={back.href} className="post_back"><ArrowLeft size={15} /> {back.label}</Link>
                </main>
                <Footer />
            </div>
        );
    }

    // Built once and rendered twice. Kept as two separate elements rather than one fragment, because the pair at the
    // foot of the post puts "back to top" between them and a fragment gives nothing to insert into.
    const prevLink = prev && (
        <Link href={`/blog/${prev.slug}`} className="post_nav_link post_nav_prev">
            <span className="post_nav_label">
                <ArrowLeft size={13} /><span className="post_nav_word">Previous</span>
            </span>
            <span className="post_nav_title">{prev.title}</span>
        </Link>
    );

    const nextLink = next && (
        <Link href={`/blog/${next.slug}`} className="post_nav_link post_nav_next">
            <span className="post_nav_label">
                <span className="post_nav_word">Next</span><ArrowRight size={13} />
            </span>
            <span className="post_nav_title">{next.title}</span>
        </Link>
    );

    const hasNav = Boolean(topic && (prev || next));

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

            {/* No navbar while reading. The 404 branch above keeps one, because a dead end needs a way out; a real post
                has the back link and prev/next, and the chrome only competes with the prose. Everything that used to
                offset it — the container padding, the heading scroll-margins, and $nav-h in PostToc.scss — came down
                to match, so removing it here alone would leave a navbar's worth of dead space behind. */}

            <main className="post_container" id="top">
                <Link href={back.href} className="post_back"><ArrowLeft size={15} /> {back.label}</Link>

                {/* The same pair as at the foot of the post. A div rather than a second <nav>, so the page does not expose two navigation landmarks sharing one name. */}
                {hasNav && (
                    <div className="post_nav post_nav--compact">{prevLink}{nextLink}</div>
                )}

                <header className="post_header">
                    <h1>{post.title}</h1>
                    <p className="post_description">{post.description}</p>
                    <div className="post_meta">
                        {topic && (
                            <Link href={`/blog/topics/${topic}`} className="post_topic">{TOPICS[topic].name}</Link>
                        )}
                        {post.tags.map((tag) => <span key={tag} className="post_tag">#{tag}</span>)}
                        <span className="post_date">{formatPostDate(post.date)} ({formatPostAge(post.date)})</span>
                    </div>
                </header>

                {/* Reads its headings back off the rendered article, so it needs the ref rather than the post: the ids come from rehype-slug at build time
                    and only exist in the DOM. Renders nothing at all on a post with fewer than three sections. */}
                <PostToc bodyRef={bodyRef} slug={post.slug} />

                <article className="post_body" ref={bodyRef}>
                    <Suspense fallback={null}>
                        <Body />
                    </Suspense>
                </article>

                {/* Only rendered inside a topic, and each side only when there is somewhere to go, so the first and
                    last lesson each show a single control rather than a greyed-out pair. */}
                {topic && hasNav && (
                    <nav className="post_nav" aria-label={`${TOPICS[topic].name} navigation`}>
                        {prevLink}
                        {/* A plain anchor to the container's own id, matching the contents links: a bare hash is a
                            same-page jump the browser handles, and global scroll-behavior makes it glide. */}
                        <a href="#top" className="post_nav_link post_nav_top">
                            <span className="post_nav_label">
                                <ArrowUp size={13} /><span className="post_nav_word">Back to top</span>
                            </span>
                        </a>
                        {nextLink}
                    </nav>
                )}
            </main>
        </div>
    );
}
