import {useCallback, useMemo} from "react";
import {Helmet} from "react-helmet-async";
import {useLocation, useSearch} from "wouter";
import {Search, X} from "lucide-react";
import Navbar from "@/components/Nav/Navbar.tsx";
import Footer from "@/components/Footer/Footer.tsx";
import PostCard from "./components/PostCard.tsx";
import {isTag, listedPosts, type Post, type Tag, TAGS} from "./posts.tsx";
import "./BlogPage.scss";

// Field weights for ranking. Title beats tags beats description, so searching
// "expedite" surfaces the post named for it above one that merely mentions it.
const WEIGHT_TITLE = 10;
const WEIGHT_TAGS = 6;
const WEIGHT_DESCRIPTION = 4;

// AND across terms (every word has to land somewhere) and OR across fields.
// A post that fails any term scores 0 and drops out entirely.
function scorePost(post: Post, terms: string[]): number {
    if (terms.length === 0) return 1;

    const title = post.title.toLowerCase();
    const description = post.description.toLowerCase();
    const tags = post.tags.join(" ").toLowerCase();

    let total = 0;
    for (const term of terms) {
        let termScore = 0;
        if (title.includes(term)) termScore += WEIGHT_TITLE;
        if (tags.includes(term)) termScore += WEIGHT_TAGS;
        if (description.includes(term)) termScore += WEIGHT_DESCRIPTION;
        if (termScore === 0) return 0;
        total += termScore;
    }
    return total;
}

export default function BlogPage() {
    const search = useSearch();
    const [, navigate] = useLocation();

    // Filter state lives in the URL, so a filtered view is linkable and the back button walks it.
    // Parsed in one memo keyed on the raw string, which keeps activeTags referentially stable for the memo below.
    const {query, activeTags} = useMemo(() => {
        const params = new URLSearchParams(search);
        return {
            query: params.get("q") ?? "",
            activeTags: params.get("tag")?.split(",").filter(isTag) ?? [],
        };
    }, [search]);

    // replace: true; otherwise every keystroke buries the previous page one
    // deeper in history and "back" takes twenty presses to leave the blog.
    const setParams = useCallback((next: { q?: string; tags?: Tag[] }) => {
        const params = new URLSearchParams(search);

        if (next.q !== undefined) {
            if (next.q) params.set("q", next.q); else params.delete("q");
        }
        if (next.tags !== undefined) {
            if (next.tags.length) params.set("tag", next.tags.join(",")); else params.delete("tag");
        }

        const queryString = params.toString();
        navigate(queryString ? `/blog?${queryString}` : "/blog", {replace: true});
    }, [search, navigate]);

    const toggleTag = useCallback((tag: Tag) => {
        setParams({
            tags: activeTags.includes(tag)
                ? activeTags.filter((active) => active !== tag)
                : [...activeTags, tag],
        });
    }, [activeTags, setParams]);

    // Only tags that something actually uses get a chip, in TAGS order.
    const usedTags = useMemo(
        () => TAGS.filter((tag) => listedPosts.some((post) => post.tags.includes(tag))),
        []
    );

    const visible = useMemo(() => {
        const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
        return listedPosts
            .filter((post) => activeTags.length === 0 || post.tags.some((tag) => activeTags.includes(tag)))
            .map((post) => ({post, score: scorePost(post, terms)}))
            .filter((entry) => entry.score > 0)
            .sort((a, b) => b.score - a.score || b.post.date.getTime() - a.post.date.getTime())
            .map((entry) => entry.post);
    }, [query, activeTags]);

    const isFiltered = query.length > 0 || activeTags.length > 0;

    return (
        <div className="blog">
            <Helmet>
                <title>Blog | jerryxf</title>
                <meta name="description"
                      content="Writing about the things I discover, build, and learn along the way" />
                <link rel="canonical" href="https://jerryxf.net/blog" />
            </Helmet>

            <Navbar isShrunk={true} stagger={false} />

            <main className="blog_container">
                <header className="blog_header">
                    <h1>Blog</h1>
                    <p className="blog_sub">
                        Notes on the things I build, what breaks along the way, and whatever else I have been reading about.
                        Some of it is machine learning, some of it is Minecraft. No promises about the ratio.
                    </p>
                </header>

                <div className="blog_controls">
                    <div className="blog_search">
                        <Search size={17} aria-hidden="true" />
                        <input
                            type="search"
                            value={query}
                            onChange={(event) => setParams({q: event.target.value})}
                            placeholder="Search posts..."
                            aria-label="Search posts"
                        />
                        {query && (
                            <button className="blog_search-clear" onClick={() => setParams({q: ""})}
                                    aria-label="Clear search">
                                <X size={15} />
                            </button>
                        )}
                    </div>

                    <div className="blog_tags" role="group" aria-label="Filter by tag">
                        {usedTags.map((tag) => (
                            <button
                                key={tag}
                                className={`blog_tag ${activeTags.includes(tag) ? "active" : ""}`}
                                aria-pressed={activeTags.includes(tag)}
                                onClick={() => toggleTag(tag)}
                            >
                                #{tag}
                            </button>
                        ))}
                        {activeTags.length > 0 && (
                            <button className="blog_tag blog_tag-clear" onClick={() => setParams({tags: []})}>
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {visible.length === 0 ? (
                    <p className="blog_empty">
                        {isFiltered
                            ? "Nothing matches that combination yet."
                            : "No posts here yet. Give it a minute..."}
                    </p>
                ) : (
                    <div className="blog_list">
                        {visible.map((post) => <PostCard key={post.slug} post={post} />)}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
