import React from "react";
import "./Footer.scss";
import Copyright from "../Copyright.tsx";

export default function Footer() {
    const links = [
        {text: "Curriculum Vitae", url: "https://cv.jerryxf.net", decorator: <></>},
        {text: "BapUtils Minecraft Hypixel Skyblock mod", url: "https://github.com/jerryxfu/BapUtils", decorator: <></>},
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
                                <p className="footer_link">{link.text}</p>
                            </a>
                        </div>);
                    })}
                </div>
                <div style={{padding: "6px 0"}}>
                    <Copyright />
                </div>
            </div>
        </>
    );
};
