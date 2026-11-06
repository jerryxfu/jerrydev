import type {ReactNode} from "react";
import {isDarkTheme, THEME_INFO, useTheme} from "@/context/ThemeContext.tsx";
import {CATEGORIES, imageFor, type Project} from "@/pages/HomePage/Projects/projects.ts";
import {formatPostDate, type Post} from "@/pages/BlogPage/posts.tsx";
import {type Friend, hideBrokenIcon} from "@/components/Friends/friends.ts";
import type {Bodies, PostText} from "./bodies.ts";
import {found} from "./match.ts";
import type {Action} from "./sources.ts";
import type {Row} from "./Palette.tsx";
import Marked from "./Marked.tsx";

// The palette's right side from 900px, as Telescope's preview: what the selected result is before you go there. A
// post line with the lines around it, a project's card, a post's first lines, a theme's colours. The words typed are
// marked in it as in the list: the title as the list matched it, the rest wherever a word is.

const AROUND = 5; // lines shown above and below a post line

// The text, each word typed marked where it is. From 2 letters, as the post text is searched: one would mark half of it.
type Mark = (text: string) => ReactNode;

export default function Preview({row, bodies, terms}: { row: Row | undefined; bodies: Bodies; terms: string[] }) {
    const words = terms.filter((term) => term.length >= 2);
    const mark: Mark = (text) => <Marked text={text} marks={found(words, text)} />;
    return (
        <aside className="palette_preview" aria-hidden="true">
            {row && <Contents row={row} bodies={bodies} mark={mark} />}
        </aside>
    );
}

function Contents({row, bodies, mark}: { row: Row; bodies: Bodies; mark: Mark }) {
    if (row.hit) return <Lines {...row.hit} mark={mark} />;
    const title = <h3 className="palette_preview-title"><Marked text={row.title} marks={row.titleMarks} /></h3>;
    const source = row.item?.source;
    if (source?.type === "project") return <ProjectPreview project={source.project} title={title} mark={mark} />;
    if (source?.type === "post") {
        const text = bodies.posts.find((t) => t.post.slug === source.post.slug);
        return <PostPreview post={source.post} text={text} title={title} mark={mark} />;
    }
    if (source?.type === "theme") return <ThemePreview theme={source.theme} title={title} detail={row.detail} mark={mark} />;
    if (source?.type === "friend") return <FriendPreview friend={source.friend} title={title} mark={mark} />;
    return (
        <>
            {title}
            {row.detail && <p className="palette_preview-text">{mark(row.detail)}</p>}
            {row.action && <p className="palette_preview-where">{where(row.action)}</p>}
        </>
    );
}

// Where Enter goes, as an address.
function where(action: Action): string {
    if (action.type === "copy") return "Enter copies it";
    if (action.type === "theme") return "Enter switches to it";
    if (action.type === "open") return action.href.replace(/^https:\/\//, "").replace(/\/$/, "");
    return `jerryxf.net${action.href.startsWith("#") ? "/" : ""}${action.href}`;
}

function Lines({text, index, mark}: { text: PostText; index: number; mark: Mark }) {
    const from = Math.max(0, index - AROUND);
    return (
        <>
            <h3 className="palette_preview-title">{mark(text.post.title)}</h3>
            <ol className="palette_lines">
                {text.lines.slice(from, index + AROUND + 1).map((line, i) => (
                    <li
                        key={line.n}
                        className={`palette_line${from + i === index ? " is-hit" : ""}${line.code ? " is-code" : ""}`}
                    >
                        <span className="palette_line-n">{line.n}</span>
                        <span className="palette_line-text">
                            {mark(line.text)}
                        </span>
                    </li>
                ))}
            </ol>
        </>
    );
}

function ProjectPreview({project, title, mark}: { project: Project; title: ReactNode; mark: Mark }) {
    const {currentTheme} = useTheme();
    const image = imageFor(project, isDarkTheme(currentTheme));
    return (
        <>
            <div className="palette_picture">
                {typeof image !== "string" ? image
                    : /\.(mp4|webm|ogg|mov)$/i.test(image) ? <video src={image} muted playsInline preload="metadata" />
                        : <img src={image} alt="" decoding="async" />}
            </div>
            {title}
            {project.subTitle && <p className="palette_preview-text">{mark(project.subTitle)}</p>}
            {project.chipText && <p className="palette_preview-where">{project.chipText}</p>}
            {project.description && <p className="palette_preview-text">{mark(project.description)}</p>}
            <p className="palette_preview-where">{project.categories.map((id) => CATEGORIES[id]).join(" · ")}</p>
        </>
    );
}

function PostPreview({post, text, title, mark}: { post: Post; text?: PostText; title: ReactNode; mark: Mark }) {
    return (
        <>
            {title}
            <p className="palette_preview-where">{formatPostDate(post.date)} · {post.tags.map((tag) => `#${tag}`).join(" ")}</p>
            <p className="palette_preview-text">{mark(post.description)}</p>
            {text && (
                <ol className="palette_lines">
                    {text.lines.slice(0, 8).map((line) => (
                        <li key={line.n} className={`palette_line${line.code ? " is-code" : ""}`}>
                            <span className="palette_line-n">{line.n}</span>
                            <span className="palette_line-text">{mark(line.text)}</span>
                        </li>
                    ))}
                </ol>
            )}
        </>
    );
}

// The theme's own colours, drawn with its tokens: a [data-theme] block in index.scss holds only those, so it applies to
// this box alone. Auto shows what it is now.
function ThemePreview({theme, title, detail, mark}: {
    theme: keyof typeof THEME_INFO | "auto";
    title: ReactNode;
    detail?: string;
    mark: Mark;
}) {
    const {currentTheme} = useTheme();
    const shown = theme === "auto" ? currentTheme : theme;
    return (
        <>
            <div className="palette_swatch" data-theme={shown}>
                <span className="palette_swatch-text">Aa</span>
                {["--primary", "--secondary", "--accent", "--text-3", "--border"].map((token) => (
                    <span key={token} className="palette_swatch-dot" style={{background: `var(${token})`}} />
                ))}
            </div>
            {title}
            {detail && <p className="palette_preview-text">{mark(detail)}</p>}
        </>
    );
}

function FriendPreview({friend, title, mark}: { friend: Friend; title: ReactNode; mark: Mark }) {
    return (
        <>
            <img className="palette_friend" src={friend.icon} alt="" decoding="async" onError={hideBrokenIcon} />
            {title}
            <p className="palette_preview-where">{friend.site}</p>
            <p className="palette_preview-text">{mark(friend.blurb)}</p>
        </>
    );
}
