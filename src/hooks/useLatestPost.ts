import {useEffect, useState} from "react";
import type {Tag} from "@/pages/BlogPage/posts.tsx";

export type LatestPost = {
    slug: string;
    title: string;
    date: Date;
    // "19 days ago", "yesterday": formatPostAge's wording.
    age: string;
    tags: Tag[];
    // Readable posts, drafts left out (except in dev, where isReadable lets them through).
    count: number;
};

// The newest readable post, for the home page's live bits. posts.tsx stays behind a dynamic import, the boundary
// Blog.tsx draws for BlogFeed: this is the same chunk, fetched once, and the home page's first one doesn't carry it.
let loading: Promise<LatestPost | null> | null = null;

function load(): Promise<LatestPost | null> {
    loading ??= import("@/pages/BlogPage/posts.tsx")
        .then(({listedPosts, isReadable, formatPostAge}) => {
            const readable = listedPosts.filter(isReadable);
            const post = readable[0];
            if (!post) return null;
            return {slug: post.slug, title: post.title, date: post.date, age: formatPostAge(post.date), tags: post.tags, count: readable.length};
        })
        .catch(() => {
            // Offline, or a deploy swapped the chunk out: try again next time something asks.
            loading = null;
            return null;
        });
    return loading;
}

// null until the manifest has loaded, or if it couldn't.
export default function useLatestPost(): LatestPost | null {
    const [post, setPost] = useState<LatestPost | null>(null);

    useEffect(() => {
        let alive = true;
        void load().then((latest) => {
            if (alive) setPost(latest);
        });
        return () => {
            alive = false;
        };
    }, []);

    return post;
}
