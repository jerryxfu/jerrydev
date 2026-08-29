import {Suspense} from "react";
import {Helmet} from "react-helmet-async";
import {Link, useParams} from "wouter";
import {ArrowLeft, ArrowRight} from "lucide-react";
import Navbar from "@/components/Nav/Navbar.tsx";
import Footer from "@/components/Footer/Footer.tsx";
import Chip from "@/components/Chip/Chip.tsx";
import {formatPostAge, formatPostDate, isReadable, listedPosts, neighbours, postComponents} from "./posts.tsx";
import {TOPICS} from "./topics.tsx";
import "katex/dist/katex.min.css";
import "./PostPage.scss";

export default function PostPage() {
    const {slug} = useParams<{ slug: string }>();

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

                <article className="post_body">
                    <Suspense fallback={null}>
                        <Body />
                    </Suspense>
                </article>

                {/* Only rendered inside a topic, and each side only when there is somewhere to go, so the first and
                    last lesson each show a single control rather than a greyed-out pair. */}
                {topic && (prev || next) && (
                    <nav className="post_nav" aria-label={`${TOPICS[topic].name} navigation`}>
                        {prev ? (
                            <Link href={`/blog/${prev.slug}`} className="post_nav_link post_nav_prev">
                                <span className="post_nav_label"><ArrowLeft size={13} /> Previous</span>
                                <span className="post_nav_title">{prev.title}</span>
                            </Link>
                        ) : <span />}
                        {next && (
                            <Link href={`/blog/${next.slug}`} className="post_nav_link post_nav_next">
                                <span className="post_nav_label">Next <ArrowRight size={13} /></span>
                                <span className="post_nav_title">{next.title}</span>
                            </Link>
                        )}
                    </nav>
                )}
            </main>
        </div>
    );
}
