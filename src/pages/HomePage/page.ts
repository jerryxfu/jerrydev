import type {Page} from "@/head.ts";

// The home page, as search engines, the bar and the palette see it (src/head.ts gathers every page.ts). Its name is the
// site's own: the title is "jerryxf" alone.
export default {
    path: "/",
    name: "jerryxf",
    description: "Hi, I'm Jerry. I build things in robotics, AI, medicine and code, and share them here: my projects, a blog, and tools like Expedite and Rendezvous.",
    words: "home",
    // The bar's links on a laptop and the drawer's first group (nav.config.ts), and the palette's sections. The anchor
    // is the section title's id (SectionTitle).
    sections: [
        {label: "About", anchor: "#about-me", line: "Who I am, my friends, and how to reach me."},
        {label: "Skills", anchor: "#tools---languages", line: "The stuff I build my projects with, and how good I am at each."},
        {label: "Projects", anchor: "#projects", line: "The things I have built over the years."},
        {label: "Experience", anchor: "#experience---extras", line: "The notable extracurriculars, beyond my own projects."},
        {label: "Blog", anchor: "#blog", line: "Where the longer explanations go."},
    ],
} satisfies Page;
