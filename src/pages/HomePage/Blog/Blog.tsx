import {lazy, Suspense} from "react";
import {Link} from "wouter";
import "./Blog.scss";
import "./BlogFeed.scss";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";

// The feed is the only thing here that touches posts.tsx, and posts.tsx drags in the topic manifests and
// a glob over every .mdx body. Behind lazy() that lands in its own chunk instead of in the home page's
// first one, the same reason Card.tsx refuses to validate specialLink against the manifest.
const BlogFeed = lazy(() => import("./BlogFeed.tsx"));

// Matches the row count in BlogFeed. Rendered at the same height, so the arriving list replaces the placeholder in place rather than pushing the page down.
const SKELETON_ROWS = 7;

export default function Blog() {
    return (
        <div className="section blog-section">
            <SectionTitle
                text={"Blog"}
                description={"Where the longer explanations go."}
            />

            <div className="blog-section_container">
                <div className="blog-section_intro">
                    <p className="blog-section_blurb">
                        I created this blog because I wanted a place to document my experimentation and whatever I come across that is interesting and
                        worthy of sharing. You might stumble on a devlog for a project that is still in pieces, or a course on artificial and computer
                        vision for robotics, or maybe some guides and references I put up for friends. Either way, I hope you leave with something
                        useful or interesting in my posts :).
                    </p>

                    <Link href="/blog" className="blog-section_cta">
                        <span className="blog-section_cta-label">Read the blog</span>
                        <span className="blog-section_cta-arrow" aria-hidden="true">→</span>
                    </Link>
                </div>

                <div className="blog-section_feed">
                    <span className="text-label blog-section_feed-label">Recent posts</span>
                    <Suspense fallback={
                                   <ol className="blogfeed_skeleton" aria-hidden="true">
                                      {Array.from({length: SKELETON_ROWS}, (_, i) => <li key={i} />)}
                                  </ol>
                              }>
                        <BlogFeed />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
