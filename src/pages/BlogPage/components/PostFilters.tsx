import {Search, X} from "lucide-react";
import type {Tag} from "../posts.tsx";

type Props = {
    // What the search is scoped to, named the way the reader would say it: "all posts" on /blog, the topic's own name on a topic page.
    // Required rather than defaulted, so a new page that renders this has to say what it searches instead of silently claiming to search everything.
    scope: string;
    query: string;
    activeTags: Tag[];
    usedTags: readonly Tag[];
    setQuery: (value: string) => void;
    toggleTag: (tag: Tag) => void;
    clearTags: () => void;
};

// Markup shared by /blog and every topic page. Class names stay on the blog_ prefix rather than moving to a neutral
// one, so the existing BlogPage.scss keeps owning them and there is only one place these are styled.
export default function PostFilters({scope, query, activeTags, usedTags, setQuery, toggleTag, clearTags}: Props) {
    return (
        <div className="blog_controls">
            <div className="blog_search">
                <Search size={17} aria-hidden="true" />
                <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={`Searching in ${scope}...`}
                    aria-label={`Search in ${scope}`}
                />
                {query && (
                    <button className="blog_search-clear" onClick={() => setQuery("")} aria-label="Clear search">
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
                    <button className="blog_tag blog_tag-clear" onClick={clearTags}>
                        Clear
                    </button>
                )}
            </div>
        </div>
    );
}
