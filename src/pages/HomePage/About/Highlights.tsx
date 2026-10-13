import {ArrowUpRight} from "lucide-react";
import {Link} from "wouter";
import {isDarkTheme, useTheme} from "@/context/ThemeContext.tsx";
import {imageFor, type Project, projects} from "../Projects/projects.ts";

// A few projects beside the About text, by title, in this order; the rest are in Projects below. The data is the
// Projects section's own (projects.ts), so a card here never says something different.
const HIGHLIGHTS = ["Expedite", "Home Island", "TechNexus"];

const picked = HIGHLIGHTS
    .map((title) => projects.find((project) => project.title === title))
    .filter((project): project is Project => project !== undefined);

// Small tiles, side by side, that don't open as the Projects cards do (Jerry: smaller, no status). The picture is the
// link, as there, and shows whole, with a blurred copy of itself filling the frame around it.
export default function Highlights() {
    const {currentTheme} = useTheme();
    const dark = isDarkTheme(currentTheme);

    return (
        <aside className="highlights" aria-labelledby="highlights-title">
            {/* A section title and its description, much smaller (as SectionTitle's, in place). */}
            <div className="highlights_head">
                <h3 className="highlights_heading" id="highlights-title">Highlighted projects</h3>
                <p className="highlights_description">
                    The rest are in <a href="#projects">Projects</a> below, with more about each one.
                </p>
            </div>
            <ul className="highlights_list">
                {picked.map((project) => {
                    const src = imageFor(project, dark);
                    const picture = (
                        <>
                            {typeof src === "string" && (
                                <>
                                    <img className="highlights_backdrop" src={src} alt="" loading="lazy" decoding="async" />
                                    <img className="highlights_img" src={src} alt="" loading="lazy" decoding="async" />
                                </>
                            )}
                            <ArrowUpRight size={14} strokeWidth={2.25} aria-hidden="true" />
                        </>
                    );
                    const label = `Visit ${project.title}`;
                    return (
                        <li key={project.title} className="highlights_card">
                            {project.url?.startsWith("/") ? (
                                <Link className="highlights_media" href={project.url} aria-label={label}>{picture}</Link>
                            ) : (
                                <a className="highlights_media" href={project.url} aria-label={label} target="_blank" rel="noopener noreferrer">
                                    {picture}
                                </a>
                            )}
                            <div className="highlights_text">
                                <h4 className="highlights_title">{project.title}</h4>
                                {project.subTitle && <p className="highlights_sub">{project.subTitle}</p>}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </aside>
    );
}
