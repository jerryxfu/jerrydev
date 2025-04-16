import React from "react";
import "./Footer.scss";

export default function Footer() {
    const links = [
        {text: "Curriculum Vitae", url: "https://cv.jerryxf.net", decorator: <></>},
        {text: "BapUtils Hypixel Skyblock Forge 1.8.9 mod", url: "https://cv.jerryxf.net", decorator: <></>},
    ];

    return (
        <>
            <hr className="footer_divider" />
            <div className="section footer">
                <div className="footer_links">
                    <h3 className="text">Links🔗</h3>
                    {links.map((link) => {
                        return (<div key={link.text.toLowerCase().replace(" ", "")}>
                            <div className="footer_link-decorator">{link.decorator}</div>
                            <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <p className="p-text footer_link">{link.text}</p>
                            </a>
                        </div>);
                    })}
                </div>
                <div className="footer_copyright" style={{backgroundColor: "var(--footer-color)", paddingTop: "0"}}>
                    <p>Copyright © 2022-{new Date().getFullYear()} Jerry</p>
                </div>
            </div>
        </>
    );
};
