import {useCallback, useMemo} from "react";
import {useLocation, useSearch} from "wouter";
import {isTag, type Post, type Tag, TAGS} from "./posts.tsx";

// Field weights for ranking. Title beats tags beats description, so searching "expedite" surfaces the post named for it above one that merely mentions it.
const WEIGHT_TITLE = 10;
const WEIGHT_TAGS = 6;
const WEIGHT_DESCRIPTION = 4;

// AND across terms (every word has to land somewhere) and OR across fields. A post that fails any term scores 0 and drops out entirely.
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

type Options = {
    // Where setParams navigates back to, so the query string lands on the page the user is actually on.
    basePath: string;
    // When false the source order is preserved instead of being re-sorted by date, that is what lets a topic page
    // stay in syllabus order while /blog stays newest-first. Search relevance still wins when there is a query.
    sortByDate?: boolean;
};

export function usePostFilter(source: Post[], {basePath, sortByDate = true}: Options) {
    const search = useSearch();
    const [, navigate] = useLocation();

    // Filter state lives in the URL, so a filtered view is linkable and the back button walks it. Parsed in one memo
    // keyed on the raw string, which keeps activeTags referentially stable for the memo below.
    const {query, activeTags} = useMemo(() => {
        const params = new URLSearchParams(search);
        return {
            query: params.get("q") ?? "",
            activeTags: params.get("tag")?.split(",").filter(isTag) ?? [],
        };
    }, [search]);

    // replace: true; otherwise every keystroke buries the previous page one deeper in history and "back" takes twenty
    // presses to leave the blog.
    const setParams = useCallback((next: { q?: string; tags?: Tag[] }) => {
        const params = new URLSearchParams(search);

        if (next.q !== undefined) {
            if (next.q) params.set("q", next.q); else params.delete("q");
        }
        if (next.tags !== undefined) {
            if (next.tags.length) params.set("tag", next.tags.join(",")); else params.delete("tag");
        }

        const queryString = params.toString();
        navigate(queryString ? `${basePath}?${queryString}` : basePath, {replace: true});
    }, [search, navigate, basePath]);

    const toggleTag = useCallback((tag: Tag) => {
        setParams({
            tags: activeTags.includes(tag)
                ? activeTags.filter((active) => active !== tag)
                : [...activeTags, tag],
        });
    }, [activeTags, setParams]);

    const clearTags = useCallback(() => setParams({tags: []}), [setParams]);
    const setQuery = useCallback((q: string) => setParams({q}), [setParams]);

    // Only tags something in this particular source actually uses get a chip, in TAGS order. On a topic page that
    // narrows the chips to the topic's own tags without any extra wiring.
    const usedTags = useMemo(
        () => TAGS.filter((tag) => source.some((post) => post.tags.includes(tag))),
        [source]
    );

    const visible = useMemo(() => {
        const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
        const ranked = source
            .filter((post) => activeTags.length === 0 || post.tags.some((tag) => activeTags.includes(tag)))
            .map((post, index) => ({post, index, score: scorePost(post, terms)}))
            .filter((entry) => entry.score > 0);

        ranked.sort((a, b) =>
            b.score - a.score
            || (sortByDate ? b.post.date.getTime() - a.post.date.getTime() : a.index - b.index));

        return ranked.map((entry) => entry.post);
    }, [source, query, activeTags, sortByDate]);

    return {
        query, activeTags, usedTags, visible,
        setQuery, toggleTag, clearTags,
        isFiltered: query.length > 0 || activeTags.length > 0,
    };
}
