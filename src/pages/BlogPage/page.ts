import type {Page} from "@/head.ts";

// The blog's list. Its topics and posts are pages too: src/head.ts makes theirs from topics.tsx and posts.tsx.
export default {
    path: "/blog",
    name: "Blog",
    description: "Writing about the things I discover, build, and learn along the way",
    words: "posts articles writing",
} satisfies Page;
