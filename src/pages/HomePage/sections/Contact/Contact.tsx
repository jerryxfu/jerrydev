import React, {useEffect} from "react";
import "./Contact.scss";
import SectionTitle from "../../../../components/SectionTitle/SectionTitle.tsx";
import SubTitle from "../../../../components/SubTitle/SubTitle.tsx";
import ContactCard from "./components/ContactCard.tsx";

import _discord from "../../../../assets/socials/discord_mark.svg";
import _instagram from "../../../../assets/socials/instagram_mark.svg";
import _snapchat_lt from "../../../../assets/socials/snapchat_light.png";
import _snapchat_da from "../../../../assets/socials/snapchat_dark.png";
import useThemeSwitcher from "../../../../hooks/useThemeSwitcher.ts";
import {AlternateEmailRounded, Phone} from "@mui/icons-material";

const medias = [
    {title: "Snapchat", username: "redacted", image: "", url: "", chipText: "private", color: ""},
    {title: "Instagram", username: "@jerryxfu", image: _instagram, url: "", chipText: "media", color: "#ffb5a622"},
    {title: "Discord", username: "@jerrydev", image: _discord, url: "", chipText: "public", color: "#e6a6ff22"},
];

export default function Contact() {
    const {currentTheme} = useThemeSwitcher();

    useEffect(() => {
        medias[0]!.image = currentTheme === "light" ? _snapchat_da : _snapchat_lt;
    }, [currentTheme]);

    return (
        <div className="section contact">
            <SectionTitle text={"Contact Me"} />

            <div className="contact_container">
                <div className="contact_media-container">
                    <SubTitle text={"Social media"} />
                    <div className="contact_media-list">
                        {medias.map((media) => (
                            <ContactCard
                                title={media.title}
                                username={media.username}
                                image={media.image}
                                url={media.url}
                                chipText={media.chipText}
                                color={media.color}
                            />
                        ))}
                    </div>
                </div>
                <div className="contact_right-container">
                    <div className="contact_info-container">
                        <SubTitle text={"Get in touch"} />
                        <ul style={{paddingLeft: 0}}>
                            <li className="contact_list-element">
                                <AlternateEmailRounded />
                                <a href="mailto:jerryfu_mc@outlook.com">jerryfu_mc@outlook.com</a>
                            </li>
                            <li className="contact_list-element">
                                <Phone />
                                <a href="tel:+15146361234">redacted</a>
                            </li>
                        </ul>
                    </div>
                    <div className="contact_cv_container">
                        <SubTitle text={"Curriculum Vitae"} />
                    </div>
                </div>
            </div>
        </div>
    );
};
