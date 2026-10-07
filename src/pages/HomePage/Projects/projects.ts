import type {CardProps} from "@/components/Card/Card.tsx";
import _llmvsllm from "@/assets/projects/llmvsllm.jpeg";
import _baputils from "@/assets/projects/baputils.jpeg";
import _expedite from "@/assets/projects/expedite.jpeg";
import _jerrybot from "@/assets/projects/jerrybot.jpeg";
import _jerryxf from "@/assets/projects/jerryxf.jpeg";
import _conditioner from "@/assets/projects/conditioner.jpeg";
import _kahootBot from "@/assets/projects/kahootbot.mp4";
import _weatherStation from "@/assets/projects/weather_station.jpeg";
import _endPortal from "@/assets/projects/end_portal.jpg";
import _supericu from "@/assets/projects/supericu.jpeg";
import _doublestartyre from "@/assets/projects/doublestartyre.jpeg";
import _scorekeeper from "@/assets/projects/scorekeeper.jpeg";
import _scheduler from "@/assets/projects/scheduler.jpeg";
import _autoscout from "@/assets/projects/autoscout.jpeg";
import _medive from "@/assets/projects/medive.jpeg";
import _unveil_dark from "@/assets/projects/unveil/unveil_dark.png";
import _unveil_light from "@/assets/projects/unveil/unveil_light.png";
import _homeisland from "@/assets/projects/home-island.jpeg";
import _technexus from "@/assets/projects/technexus.png";
import _rendezvous from "@/assets/projects/rendezvous.jpeg";
import _tools_light from "@/assets/projects/tools_light.jpeg";
import _tools_dark from "@/assets/projects/tools_dark.jpeg";
import _vite_light from "@/assets/projects/vite_light.jpeg";
import _vite_dark from "@/assets/projects/vite_dark.jpeg";
import _hiddengarden from "@/assets/projects/hiddengarden.jpeg";
import _guides from "@/assets/projects/guides.jpeg";
import _stats from "@/assets/projects/stats.jpeg";

// The projects, as data. Projects.tsx renders them as a grid of small cards you can filter by tag, each opening into
// the full card; the status board reads the same list, so a status changes in one place.
//
// subTitle is what the small card says under the title, up to three lines; description is for the full card. Credits
// and clients go in footer, as on any card: "For Maria", "With Raphaël & Samy".

// The tags, in the order their filter chips render. A project can carry several. "archived" is what used to hide
// a project behind a checkbox: it now has its own chip, and keeps the project off the status board.
export const CATEGORIES = {
    web: "Web",
    tools: "Tools",
    ai: "AI & medicine",
    robotics: "Robotics & hardware",
    mods: "Bots & mods",
    archived: "Archived",
} as const;

export type Category = keyof typeof CATEGORIES;

export const categoryIds = Object.keys(CATEGORIES) as Category[];

export type Project = Omit<CardProps, "dateDisplay"> & {
    // A Date rather than CardProps' preformatted string, so the list can sort and say "May 2026" while the card says
    // "18-05-2026 (141 days ago)". Local midnight, see the T00:00:00 note in BlogPage/posts.tsx.
    date: Date;
    categories: Category[];
    // For the dark themes, when the image only reads on a light background.
    imageDark?: string;
};

const day = (iso: `${number}-${number}-${number}`): Date => new Date(`${iso}T00:00:00`);

export const isArchived = (project: Project): boolean => project.categories.includes("archived");

// Shown in this order, everywhere: the order is the curation.
export const projects: Project[] = [
    {
        title: "Home Island",
        subTitle: "Custom browser start page",
        image: _homeisland,
        chipText: "🟢 Stable",
        date: day("2026-02-05"),
        url: "https://github.com/jerryxfu/home-island",
        description: "A beautiful, minimalist browser extension with time-based dynamic backgrounds and personalized settings. Available on Chrome, Firefox, and Safari.",
        footer: "Click image for links",
        categories: ["web"],
    },
    {
        title: "Expedite",
        subTitle: "Share files and text snippets instantly!",
        image: _expedite,
        chipText: "🟢 Stable",
        date: day("2026-05-18"),
        description: "A webpage for quickly sharing files and text snippets with other people or across your own devices",
        url: "/expedite",
        footer: "Same-day shipping!",
        categories: ["web", "tools"],
    },
    {
        title: "TechNexus",
        subTitle: "A companion app for FRC",
        image: _technexus,
        chipText: "🟢 Stable",
        date: day("2026-04-08"),
        url: "https://technexus.jerryxf.net",
        description: "A mobile app that provides dynamic schedule updates and useful tools & information for FIRST Robotics competition team members.",
        footer: "iOS & Android · With Raphaël & Samy",
        categories: ["robotics"],
    },
    {
        title: "MEDIVE",
        subTitle: "Research project",
        image: _medive,
        chipText: "🚧 WIP",
        date: day("2025-08-14"),
        url: "https://github.com/jerryxfu/medive",
        specialLink: "/blog/medive-devlog0",
        description: "An AI system that generates differential diagnoses from free-text symptom presentations using a hybrid model that fuses biomedical text embeddings with medical ontology concept embeddings.",
        footer: "IB Extended Essay",
        categories: ["ai"],
    },
    {
        title: "HiddenGarden",
        subTitle: "A florist's website",
        image: _hiddengarden,
        chipText: "🟢 Stable",
        description: "HiddenGarden is a flower shop founded by Maria. This is their website built by me, featuring many flower options and online ordering.",
        url: "https://hiddengarden.pages.dev",
        date: day("2026-06-12"),
        footer: "For Maria",
        categories: ["web"],
    },
    {
        title: "BapUtils",
        subTitle: "A Hypixel Skyblock Minecraft mod",
        image: _baputils,
        chipText: "🚧 WIP",
        date: day("2023-06-24"),
        url: "https://github.com/jerryxfu/BapUtils",
        description: "BapUtils is a lightweight Minecraft Fabric mod for Hypixel Skyblock that provides various quality of life utilities. The update to Minecraft version 26.2 is underway",
        footer: "/bap",
        categories: ["mods"],
    },
    {
        title: "Scheduler",
        subTitle: "A schedule visualizer and comparer",
        image: _scheduler,
        chipText: "🟢 Stable",
        date: day("2025-08-27"),
        url: "/scheduler",
        description: "A web app to visualize and compare daily/weekly schedules.",
        categories: ["web", "tools"],
    },
    {
        title: "Rendezvous",
        subTitle: "A tool to help schedule group events",
        image: _rendezvous,
        chipText: "🟢 Stable",
        description: "Planning a meetup but coordinating availabilities is a nightmare? Create and event, share a code or link, and let everyone select when they're free!",
        url: "/rendezvous",
        date: day("2026-05-22"),
        categories: ["web", "tools"],
    },
    {
        title: "ORCA",
        subTitle: "Live data fusion for intel assessments",
        image: _unveil_dark,
        imageDark: _unveil_light,
        chipText: "🌀 Concept",
        date: day("2025-10-01"),
        url: "https://unveiltechnologies.com",
        description: "Fusing live, multi-source data into actionable insight and explainable intel assessments, for Unveil Technologies. Built for any operation where understanding can't wait. It never shipped, but planning it all the way through taught me a lot.",
        footer: "TRL-3",
        categories: ["ai"],
    },
    {
        title: "Kahoot! bot",
        subTitle: "Plays Kahoot! on command",
        image: _kahootBot,
        chipText: "🟢 Stable",
        date: day("2024-07-01"),
        url: "https://github.com/jerryxfu/kahoot-bot",
        description: "A Kahoot bot that can join games, answer questions, and send reactions at your command. Built using Python and Playwright to automate the web interface.",
        categories: ["mods"],
    },
    {
        title: "Guide",
        subTitle: "Guides about various stuff",
        image: _guides,
        chipText: "🟢 Stable",
        specialLink: "/blog/topics/guides",
        specialLinkText: "Open",
        description: "Practical guides to tools worth knowing, usually created at the request of friends. Each one starts from zero and doubles as a reference you can come back to. Currently has python, git, and excel.",
        url: "/blog/topics/guides",
        date: day("2026-08-21"),
        categories: ["tools"],
    },
    {
        title: "*.jerryxf.net",
        subTitle: "This website, right here!",
        image: _jerryxf,
        chipText: "🟢 Stable",
        date: day("2022-07-25"), // aspectofjerry.dev registration date
        description: "This portfolio website, the blog, as well as the API that empowers other projects.",
        specialLink: "/blog/hello-blog",
        categories: ["web"],
    },
    {
        title: "Vite + React + TS template",
        subTitle: "A modern website template",
        image: _vite_light,
        imageDark: _vite_dark,
        chipText: "🟢 Stable",
        date: day("2026-05-22"), // first commit
        url: "https://github.com/jerryxfu/vite-react-ts",
        specialLink: "https://github.com/jerryxfu/vite-react-ts",
        specialLinkText: "View on GitHub",
        description: "An opinionated starter for React projects. Ships TypeScript in strict mode, Vite, SCSS with light/dark custom properties, wouter routing, an error boundary, an ESLint flat config, and an offline-capable PWA.",
        categories: ["tools", "web"],
    },
    {
        title: "stats.jerryxf",
        subTitle: "Cool live data feeds",
        image: _stats,
        chipText: "🟢 Stable",
        date: day("2026-07-22"),
        url: "https://stats.jerryxf.net",
        description: "A collection of diverse live data feeds, including Quebec ER capacity and Hypixel Skyblock Attribute Shards Fusion prices.",
        categories: ["web", "ai"],
    },
    {
        title: "JerryBot",
        subTitle: "A comprehensive discord bot",
        image: _jerrybot,
        chipText: "🟢 Stable",
        url: "https://github.com/jerryxfu/jerrybot-discord",
        date: day("2021-09-01"),
        description: "JerryBot is a comprehensive all purpose Discord bot that provides various utilities and fun features.",
        categories: ["mods"],
    },
    {
        title: "SuperICU",
        subTitle: "A tool to preview ICU monitor data",
        image: _supericu,
        chipText: "✅ Completed",
        date: day("2025-08-19"),
        url: "/supericu",
        description: "SuperICU is a tool to playback and visualize data from Intensive Care Unit monitor logs, including waveforms, vitals, and alarms, all in a patient monitor-like interface.",
        categories: ["ai"],
    },
    {
        title: "Doublestartyre CA",
        subTitle: "A tire distributor's website",
        image: _doublestartyre,
        chipText: "🟢 Stable",
        date: day("2024-07-11"),
        url: "https://doublestartyre.ca",
        description: "Doublestartyre.ca is a website for Doublestar Tire, a Dodo Wheels partner in Canada.",
        footer: "For Dodo Wheels",
        categories: ["web"],
    },
    {
        title: "FRC Scorekeeper interface",
        subTitle: "A FRC scorekeeper interface for REEFSCAPE season",
        image: _scorekeeper,
        chipText: "📦 Archived",
        date: day("2025-05-09"),
        url: "https://www.lapresse.ca/societe/2025-05-18/mission-la-robotique-pour-tous-et-toutes.php",
        description: "A real-time score tracking and broadcasting app for our off-season robotics competition.",
        footer: "RSEQ Montreal",
        categories: ["robotics", "web", "archived"],
    },
    {
        title: "Conditioner",
        subTitle: "A rule based diagnostic app",
        image: _conditioner,
        chipText: "🗑️ Obsolete",
        date: day("2025-07-24"),
        url: "/#:~:text=MEDIVE",
        description: "Conditioner is a weighted rule-based diagnostic app that allows users to select symptoms and receive preliminary feedback on their \"condition\". Superseded by MEDIVE.",
        categories: ["ai", "archived"],
    },
    {
        title: "RPI Pico weather station",
        subTitle: "A small indoor weather station",
        image: _weatherStation,
        chipText: "✅ Completed",
        date: day("2025-02-08"),
        description: "A cool Raspberry Pi Pico bricolage weather station that displays temperature, humidity, pressure, and air quality info along with dynamic lighting.",
        categories: ["robotics"],
    },
    {
        title: "Tools",
        subTitle: "A repo with random utility scripts",
        image: _tools_light,
        imageDark: _tools_dark,
        chipText: "🟢 Stable",
        date: day("2026-06-15"),
        url: "https://github.com/jerryxfu/tools",
        description: "A repository with random utility scripts that I use here and there.",
        categories: ["tools"],
    },
    {
        title: "FRC AutoScout",
        subTitle: "Autonomous scouting for FRC",
        image: _autoscout,
        chipText: "🗑️ Obsolete",
        date: day("2024-03-23"), // MotionLens creation
        description: "A Python script that uses The Blue Alliance data to generate scouting reports, including Zebra MotionWorks motion analysis.",
        url: "https://github.com/jerryxfu/auto-scout",
        categories: ["robotics", "archived"],
    },
    {
        title: "LLM vs LLM",
        subTitle: "Two LLMs debate on a given topic",
        image: _llmvsllm,
        chipText: "📦 Archived",
        url: "https://github.com/jerryxfu/llmvsllm",
        date: day("2024-05-18"),
        description: "LLM vs LLM was a project that allowed two large language models to debate on a given topic, showcasing the capabilities (or inability) of LLMs in generating coherent and relevant arguments.",
        categories: ["ai", "archived"],
    },
    {
        title: "Time",
        subTitle: "Date/time tools",
        image: _endPortal,
        chipText: "🧩 MVP",
        date: day("2026-06-10"),
        description: "A webpage with various date and time calculators, timers, time zone converters and a stopwatch.",
        url: "/time",
        categories: ["web", "tools"],
    },
    // Still to come, from the old card list:
    // Cyclic (sleep cycle calculator and periods tracker, 🌀 Concept, 2025-12-28, iOS & Android)
    // Pulse (screen time micro-session limiter, 🌀 Concept, 2026-04-20, iOS & Android)
    // Cheatsheet (/cheatsheet, 🧩 MVP), TechDashboard (pit dashboard for FRC, 🌀 Concept),
    // MegaCSV (/megacsv, 🌀 Concept), Itinerary (public transit, 🌀 Concept)
];

export const firstYear = Math.min(...projects.map((project) => project.date.getFullYear()));

export const imageFor = (project: Project, dark: boolean): Project["image"] =>
    dark && project.imageDark ? project.imageDark : project.image;
