// A marker inside the syllabus. Only markers are tagged, a post stays a bare slug string, because posts are the common case and shouldn't
// pay ceremony for the exception. `typeof entry === "string"` discriminates the union, the same way nav.config.ts discriminates NavItem on `type`.
export type ChapterMarker =
// A named chapter heading. `break` decides whether prev/next stops here too. Default false, so chapters flow into each other.
    | { chapter: string; break?: boolean }
    // No heading, only a stop for prev/next. For two posts that belong under the same heading but should not chain into one another —
    // the Excel handbook and its Spanish translation are one lesson in two languages, not two consecutive lessons.
    | { chapter?: undefined; break: true };
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
export const TOPIC_IDS = ["guides", "medive"] as const;
export type TopicId = typeof TOPIC_IDS[number];


export const TOPICS: Record<TopicId, Topic> = {
    "guides": {
        name: "Guides",
        description: "Practical guides to tools worth knowing. Each one starts from zero and doubles as a reference you can come back to. No prior experience assumed.",
        // break: true on the named markers, because these are three unrelated courses sharing a shelf rather than one syllabus.
        // Without it "next" at the end of the Python appendices is Git, which is not a next lesson in any sense. The unnamed marker before the Spanish handbook
        // does the same job inside a single chapter: both Excel posts list under "Excel", but neither is the one to read after the other.
        posts: [
            {chapter: "Python", break: true},
            "python-basics",
            "python-going-further",
            "python-scientific",
            "python-appendices",
            {chapter: "Git & GitHub", break: true},
            "git-basics",
            "git-github",
            "git-reference",
            {chapter: "Excel", break: true},
            "excel-formulas",
            {break: true},
            "excel-formulas-es",
        ],
    },
    "medive": {
        name: "MEDIVE",
        description: "Medical Inference via Vector Embeddings research project devlogs",
        posts: [
            "medive-devlog0"
        ]
    }
};


export const isTopicId = (value: string): value is TopicId => Object.hasOwn(TOPICS, value);

// Alphabetical by display name rather than by key, since the key is a URL slug and "machine-learning" would sort
// somewhere different from "Machine Learning" once there are enough of them to notice.
export const topicIds: TopicId[] = [...TOPIC_IDS]
    .sort((a, b) => TOPICS[a].name.localeCompare(TOPICS[b].name));
