import React, {useMemo} from "react";
import "./Footer.scss";
import Copyright from "../Copyright.tsx";
import {useDebugMode} from "../../hooks/useDebugMode.ts";
import {useTheme} from "../../context/ThemeContext.tsx";
import _unveil_light from "../../assets/projects/unveil/unveil_icon_light.png";
import _unveil_dark from "../../assets/projects/unveil/unveil_icon_dark.png";
import {ExternalLink} from "lucide-react";

const debugLabels = ["Off", "Outlines", "Spacing", "All"];

export default function Footer() {
    const {mode, cycle} = useDebugMode();

    const {currentTheme} = useTheme();

    // Theme-aware icon for the Unveil Technologies footer link.
    const unveilIcon = useMemo(() => currentTheme === "night" ? _unveil_light : _unveil_dark, [currentTheme]);


    const links: Array<{
        category: string;
        content: Array<{ text: string; url: string; decorator: React.ReactNode; }>
    }> = [
        {
            category: "Links",
            content: [
                {text: "Status Page", url: "https://status.jerryxf.net", decorator: <></>},
                {text: "Curriculum Vitae", url: "https://cv.jerryxf.net", decorator: <> <ExternalLink size={16} /></>},
                {text: "Unveil Technologies", url: "https://unveiltechnologies.com", decorator: <img src={unveilIcon} alt="Unveil icon" />}
            ]
        },
        {
            category: "Special mentions",
            content: [
                {
                    text: "raphdf201.net",
                    url: "https://www.raphdf201.net/",
                    decorator: <img src="https://assets.raphdf201.net/favicon.ico" alt="raphdf201 favicon" />
                },
            ]
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
                <button
                    onClick={cycle}
                    className="footer_debug-button"
                    style={{opacity: mode > 0 ? 1 : 0.35}}
                >
                    Debug: {debugLabels[mode]}
                </button>
                <div className="footer_copyright">
                    <Copyright />
                </div>
            </div>
        </>
    );
};
