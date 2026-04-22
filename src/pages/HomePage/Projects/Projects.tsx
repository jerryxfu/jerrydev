import "./Projects.scss";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";
import Card, {CardProps} from "../../../components/Card/Card.tsx";
import _llmvsllm from "../../../assets/projects/llmvsllm.png";
import _baputils from "../../../assets/projects/baputils.png";
import _jerrybot from "../../../assets/projects/jerrybot.png";
import _jerryxf from "../../../assets/projects/jerryxf.png";
import _conditioner from "../../../assets/projects/conditioner.png";
import _kahootBot from "../../../assets/projects/kahootbot.mp4";
import _weatherStation from "../../../assets/projects/weather_station.jpg";
import _endPortal from "../../../assets/projects/end_portal.jpg";
import _supericu from "../../../assets/projects/supericu.png";
import _doublestartyre from "../../../assets/projects/doublestartyre.png";
import _scorekeeper from "../../../assets/projects/scorekeeper.png";
import _autoscout from "../../../assets/projects/autoscout.png";
import _medive from "../../../assets/projects/medive.png";
import _unveil from "../../../assets/unveil_dark.png";
import _homeisland from "../../../assets/projects/home-island.png";
import _technexus from "../../../assets/projects/technexus.png";

function formatDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const today = new Date();
    // Zero out time for both dates
    today.setHours(0, 0, 0, 0);
    const initial_date = new Date(date);
    initial_date.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - initial_date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return `${day}-${month}-${year} (${diffDays} days ago)`;
}

const projects: CardProps[] = [
    {
        title: "MEDIVE",
        subTitle: "Research project",
        image: _medive,
        chipText: "🚧 WIP",
        dateDisplay: formatDate(new Date("2025-08-14")),
        url: "https://github.com/jerryxfu/medive",
        description: "An AI system that generates differential diagnoses and identifies co-occurring symptoms from symptomatic presentations using a hybrid attention-based encoding model.",
    },
    {
        title: "Home Island",
        subTitle: "Custom browser start page",
        image: _homeisland,
        chipText: "🟢 Stable",
        dateDisplay: formatDate(new Date("2026-02-05")),
        url: "https://github.com/jerryxfu/home-island",
        description: "A beautiful, minimalist browser extension with time-based dynamic backgrounds and personalized settings. Available on Chrome and Firefox (Safari coming soon)",
        footer: "Click image^ for links"
    },
    {
        title: "TechNexus",
        subTitle: "A companion app for FRC",
        image: _technexus,
        chipText: "🚧 WIP",
        dateDisplay: formatDate(new Date("2026-04-08")),
        url: "https://github.com/jerryxfu/matchtimer",
        description: "A mobile app that provides dynamic schedule updates and useful tools & information for our team members during FIRST Robotics competitions.",
        footer: "iOS 16.7+ & Android 13+"
    },
    {
        title: "Pulse",
        subTitle: "Screen time micro-session limiter",
        image: _endPortal,
        chipText: "🚧 WIP",
        dateDisplay: formatDate(new Date("2026-04-20")),
        url: "",
        description: "A screen time app with micro-sessions. Open any app freely, get a short window to use it, and get cut off when time's up.",
        footer: "iOS 16.7+ & Android 13+"
    },
    {
        title: "BapUtils",
        subTitle: "A Hypixel Skyblock Minecraft Forge mod",
        image: _baputils,
        chipText: "💤 Stalled",
        dateDisplay: formatDate(new Date("2023-06-24")),
        url: "https://github.com/jerryxfu/BapUtils",
        description: "BapUtils is a lightweight Minecraft Forge mod for Hypixel Skyblock that provides various quality of life utilities.",
        footer: "/bap"
    },
    {
        title: "Kahoot! flood bot",
        subTitle: "",
        image: _kahootBot,
        chipText: "🟢 Stable",
        dateDisplay: formatDate(new Date("2024-07-1")),
        url: "https://github.com/jerryxfu/kahoot-bot",
        description: "A Kahoot bot that can join games and answer questions at your command. Built using Python and Playwright to automate the web interface.",
        footer: "(Outdated video)"
    },
    {
        title: "TechDashboard",
        subTitle: "Pit dashboard for FRC",
        image: _endPortal,
        chipText: "🧩 MVP",
        dateDisplay: "awaiting",
        // url: "",
        description: "A pit display for FIRST Robotics competitions, integrating robot telemetry, battery tracker, self-tests, slack messaging, and more.",
    },
    {
        title: "SuperICU",
        subTitle: "A tool to preview ICU monitor data",
        image: _supericu,
        chipText: "💤 Stalled",
        dateDisplay: formatDate(new Date("2025-08-19")),
        url: "/supericu",
        description: "SuperICU is a tool to playback and visualize data from Intensive Care Unit monitor logs, including waveforms, vitals, and alarms, all in a patient monitor-like interface."
    },
    {
        title: "Unveil Technologies",
        subTitle: "Building what's next",
        image: _unveil,
        chipText: "🚧 WIP",
        dateDisplay: formatDate(new Date("2025-10-01")),
        url: "https://unveiltechnologies.com",
        description: "A technology company built to ship — spanning client software, consumer apps, and defense-related systems. Unveil is the umbrella behind ORCA and everything else.",
        footer: "unvl.tech"
    },
    {
        title: "ORCA",
        subTitle: "Uncover the unseen",
        image: _endPortal,
        chipText: "🧩 MVP",
        dateDisplay: formatDate(new Date("2025-10-01")),
        url: "",
        description: "An intelligent orchestration platform for mission control, integrating drones and assets to transform real-time field data into actionable insight.",
    },
    {
        title: "*.jerryxf.net",
        subTitle: "This website, right here!",
        image: _jerryxf,
        chipText: "🟢 Stable",
        dateDisplay: formatDate(new Date("2022-07-25")), // aspectofjerry.dev registration date
        description: "This portfolio website as well as the API that empowers other projects.",
    },
    {
        title: "Doublestartyre CA",
        subTitle: "",
        image: _doublestartyre,
        chipText: "✅ Delivered",
        dateDisplay: formatDate(new Date("2024-07-11")),
        url: "https://doublestartyre.ca",
        description: "Doublestartyre.ca is a website for Doublestar Tire, a Dodo Wheels partner in Canada.",
        footer: "For Dodo Wheels"
    },
    {
        title: "Cyclic",
        subTitle: "Sleep cycle calculator and periods tracker",
        image: _endPortal,
        chipText: "🧩 MVP",
        dateDisplay: formatDate(new Date("2025-12-28")),
        description: "A mobile app for optimising sleep cycles and tracking periods, built with privacy at its core.",
        footer: "iOS 17+ & Android 13+"
    },
    {
        title: "Conditioner",
        subTitle: "A rule based diagnostic app",
        image: _conditioner,
        chipText: "🔁 Superseded",
        dateDisplay: formatDate(new Date("2025-07-24")),
        url: "/conditioner",
        description: "Conditioner is a weighted rule-based diagnostic app that allows users to select symptoms and receive preliminary feedback on their \"condition\".",
    },
    {
        title: "JerryBot",
        subTitle: "A comprehensive discord bot",
        image: _jerrybot,
        chipText: "📦 Archived",
        url: "https://github.com/jerryxfu/JerryBot",
        dateDisplay: formatDate(new Date("2021-09-01")),
        description: "JerryBot was a comprehensive all purpose Discord bot that provided various features and utilities.",
    },
    {
        title: "FRC Scorekeeper interface",
        subTitle: "A FRC scorekeeper interface for REEFSCAPE season",
        image: _scorekeeper,
        chipText: "📦 Archived",
        dateDisplay: formatDate(new Date("2025-05-09")),
        url: "https://mail.rseqmontreal.com/fr/evenements-speciaux/competitions-de-robotique/",
        description: "A real-time score tracking/broadcasting app for our off-season competitions using WebSocket.",
        footer: "For RSEQ Montreal"
    },
    {
        title: "RPI Pico weather station",
        subTitle: "A small indoor weather station",
        image: _weatherStation,
        chipText: "🎖️ Fulfilled",
        dateDisplay: formatDate(new Date("2025-02-08")),
        description: "A cool Raspberry Pi Pico bricolage weather station that displays temperature, humidity, pressure, and air quality info along with dynamic lighting.",
    },
    {
        title: "FRC AutoScout",
        subTitle: "Autonomous scouting for FRC",
        image: _autoscout,
        chipText: "💤 Stalled",
        dateDisplay: formatDate(new Date("2024-03-23")), // MotionLens creation (-> auto-scout)
        description: "A Python script that uses The Blue Alliance data to generate scouting reports, including Zebra MotionWorks motion analysis.",
        url: "https://github.com/jerryxfu/auto-scout"
    },
    {
        title: "Expedite",
        subTitle: "Share files, text snippets, and links!",
        image: _endPortal,
        chipText: "🌀 Concept",
        dateDisplay: "awaiting",
        description: "A website for temporary sharing files and text with other people or across your own devices",
        url: "/expedite"
    },
    {
        title: "LLM vs LLM",
        subTitle: "Two LLMs debate on a given topic",
        image: _llmvsllm,
        chipText: "🎖️ Fulfilled",
        url: "https://github.com/jerryxfu/llmvsllm",
        dateDisplay: formatDate(new Date("2024-05-18")),
        description: "LLM vs LLM was a project that allowed two large language models to debate on a given topic, showcasing the capabilities of LLMs in generating coherent and relevant arguments.",
    },
    {
        title: "Cheatsheet",
        subTitle: "A collection of useful cheatsheets",
        image: _endPortal,
        chipText: "🚧 WIP",
        dateDisplay: "awaiting",
        url: "/cheatsheet",
        description: "A collection of useful cheatsheets for various topics.",
    },
    {
        title: "MegaCSV",
        subTitle: "A tool to preview large CSV files",
        image: _endPortal,
        chipText: "🌀 Concept",
        dateDisplay: "awaiting",
        description: "Preview large CSV files without crashing your computer.",
        url: "/megacsv"
    },
    {
        title: "Itinerary",
        subTitle: "Optimize travel by public transit",
        image: _endPortal,
        chipText: "🌀 Concept",
        dateDisplay: "awaiting",
        description: "description."
    },
    {
        title: "Group availability app",
        subTitle: "A tool to help schedule group events",
        image: _endPortal,
        chipText: "🌀 Concept",
        dateDisplay: "awaiting",
        description: "description."
    }
];

export default function Projects() {
    return (
        <div className="section projects">
            <SectionTitle text={"Projects"} />
            <div className="projects-grid">
                {projects.map((project) => {
                    return (
                        <Card key={project.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()} {...project} />
                    );
                })}
            </div>
        </div>
    );
};
