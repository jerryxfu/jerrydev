import React, {useMemo} from "react";
import "./Footer.scss";
import Copyright from "../Copyright.tsx";
import {useDebugMode} from "@/hooks/useDebugMode.ts";
import {isDarkTheme, useTheme} from "../../context/ThemeContext.tsx";
import _unveil_light from "../../assets/projects/unveil/unveil_icon_light.png";
import _unveil_dark from "../../assets/projects/unveil/unveil_icon_dark.png";
import {friendList} from "../Friends/friends.ts";
import {ExternalLink} from "lucide-react";

const debugLabels = ["Off", "Outlines", "Spacing", "All"];

const relative = new Intl.RelativeTimeFormat("en", {numeric: "auto"});

// How long ago the build was made: "3 hours ago", "yesterday", "12 days ago".
function buildAge(iso: string): string {
    const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
    if (minutes > -60) return relative.format(minutes, "minute");
    const hours = Math.round(minutes / 60);
    if (hours > -24) return relative.format(hours, "hour");
    const days = Math.round(hours / 24);
    if (days > -30) return relative.format(days, "day");
    return relative.format(Math.round(days / 30), "month");
}

export default function Footer() {
    const {mode, cycle} = useDebugMode();

    const {currentTheme} = useTheme();

    // Theme-aware icon for the Unveil Technologies footer link.
    const unveilIcon = useMemo(() => isDarkTheme(currentTheme) ? _unveil_light : _unveil_dark, [currentTheme]);


    const links: Array<{
        category: string;
        content: Array<{ text: string; url: string; decorator: React.ReactNode; }>
    }> = [
        {
            category: "Links",
            content: [
                {text: "Blog", url: "https://jerryxf.net/blog", decorator: <>📝</>},
                {text: "Curriculum Vitae", url: "https://cv.jerryxf.net", decorator: <> <ExternalLink size={16} /></>},
                {text: "Status Page", url: "https://status.jerryxf.net", decorator: <></>},
                // {text: "Unveil Technologies", url: "https://unveiltechnologies.com", decorator: <img src={unveilIcon} alt="Unveil icon" />}

            ]
        },
        {
            category: "Tools",
            content: [
                {text: "Expedite", url: "/expedite", decorator: <p>📦</p>},
                {text: "Scheduler", url: "/scheduler", decorator: <p>🗓️</p>},
                {text: "Rendezvous", url: "/rendezvous", decorator: <>📌</>},

            ]
        },
        {
            // The same people as the friends block in About, from the same list.
            category: "Special mentions",
            content: friendList.map((friend) => ({text: friend.site, url: friend.url, decorator: <img src={friend.icon} alt="" />})),
        }
    ];

    return (
        <>
            <hr className="footer_divider" />
            <div className="section footer">
                <div className="footer_links">
                    {links.map((section) => (
                        <div key={section.category}>
                            <h3>{section.category}</h3>

                            {section.content.map((link) => (
                                <div
                                    style={{display: "flex", flexDirection: "row", alignItems: "center"}}
                                    key={link.text.toLowerCase().replace(" ", "")}
                                >
                                    <a href={link.url}>
                                        <p className="footer_link">{link.text}</p>
                                    </a>
                                    <div className="footer_link-decorator">{link.decorator}</div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                {/* Which build this is, from vite.config.ts's define. The date is the build's, so in dev it's when the
                    server started, which is why it says so instead. */}
                <p className="footer_colophon">
                    Built with React, GSAP and the Outfit typeface. {import.meta.env.DEV ? "Running locally" : `Last deployed ${buildAge(__BUILD_TIME__)}`},
                    from <code>{__BUILD_COMMIT__}</code>.
                </p>
                {/* The site's own "do not press": a lamp that changes colour with each debug mode. */}
                <button onClick={cycle} className="footer_debug-button" data-mode={mode}>
                    Debug: {debugLabels[mode]}
                </button>
                <div className="footer_copyright">
                    <Copyright />
                </div>
            </div>
        </>
    );
};
