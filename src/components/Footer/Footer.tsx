import React from "react";
import "./Footer.scss";
import Copyright from "../Copyright.tsx";
import {useDebugMode} from "../../hooks/useDebugMode.ts";

const debugLabels = ["Off", "Outlines", "Spacing", "All"];

export default function Footer() {
    const {mode, cycle} = useDebugMode();

    const links: Array<{
        category: string;
        content: Array<{
            text: string;
            url: string;
            decorator: React.ReactNode;
        }>
    }> = [
        {
            category: "Links",
            content: [
                {text: "Status Page", url: "https://status.jerryxf.net", decorator: <></>},
                {text: "Curriculum Vitae", url: "https://cv.jerryxf.net", decorator: <></>}
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
                            <h3 className="text">{section.category}</h3>

                            {section.content.map((link) => (
                                <div
                                    style={{display: "flex", flexDirection: "row", alignItems: "center"}}
                                    key={link.text.toLowerCase().replace(" ", "")}
                                >
                                    <div className="footer_link-decorator">{link.decorator}</div>

                                    <a href={link.url}>
                                        <p className="footer_link">{link.text}</p>
                                    </a>
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
