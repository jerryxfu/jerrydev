// A chapter heading inside the syllabus. Only markers are tagged, a post stays a bare slug string, because posts are the common case and shouldn't
// pay ceremony for the exception. `typeof entry === "string"` discriminates the union, the same way nav.config.ts discriminates NavItem on `type`.
export type ChapterMarker = {
    chapter: string;
    // Whether prev/next stops here. Default false, so chapters flow into each other.
    break?: boolean;
};
export type SyllabusEntry = string | ChapterMarker;

export type Topic = {
    name: string;
    description: string;
    // The syllabus, in reading order, optionally broken up by { chapter: "..." } markers. This array is the single source of truth for four things at once:
    // which posts belong to the topic, what order the topic page lists them in, how they group into chapters, and what prev/next resolve to on a post.
    // Reordering the course is moving a line; inserting a lesson or a chapter is adding one. Posts carry no topic field, so the two can never disagree.
    posts: SyllabusEntry[];
};

// Ids are declared separately from the data so TOPICS can carry an explicit Record<TopicId, Topic> annotation. That matters more than it looks:
// with `satisfies` alone the values are *inferred*, so a syllabus of nothing but slugs infers string[] and the chapter branch of the union narrows to never.
// Annotating gives every array the same SyllabusEntry[] type whether or not it happens to contain a marker.
// Record also makes a missing or misspelt id an error, so the two lists cannot drift.
export const TOPIC_IDS = ["guides"] as const;
export type TopicId = typeof TOPIC_IDS[number];


export const TOPICS: Record<TopicId, Topic> = {
    "guides": {
        name: "Guides",
        description: "Practical guides to tools worth knowing. Each one starts from zero and doubles as a reference you can come back to. No prior experience assumed.",
        posts: [
        ],
    },
};


export const isTopicId = (value: string): value is TopicId => Object.hasOwn(TOPICS, value);

// Alphabetical by display name rather than by key, since the key is a URL slug and "machine-learning" would sort
// somewhere different from "Machine Learning" once there are enough of them to notice.
export const topicIds: TopicId[] = [...TOPIC_IDS]
    .sort((a, b) => TOPICS[a].name.localeCompare(TOPICS[b].name));
