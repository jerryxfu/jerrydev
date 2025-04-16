import React, {useEffect, useState} from "react";
import "./Contact.scss";
import SectionTitle from "../../../../components/SectionTitle/SectionTitle.tsx";
import SubTitle from "../../../../components/SubTitle/SubTitle.tsx";
// @ts-ignore
import baffle from "baffle";
import ContactCard from "./components/ContactCard.tsx";

import _discord from "../../../../assets/socials/discord_mark.svg";
import _instagram from "../../../../assets/socials/instagram_mark.svg";
import _snapchat_lt from "../../../../assets/socials/snapchat_light.png";
import _snapchat_da from "../../../../assets/socials/snapchat_dark.png";
import _github_lt from "../../../../assets/dev_tools/github.svg";
import _github_da from "../../../../assets/dev_tools/github_white.svg";
import useThemeSwitcher from "../../../../hooks/useThemeSwitcher.ts";
import {AlternateEmailRounded, Phone} from "@mui/icons-material";

const medias = [
    {
        title: "Snapchat",
        username: <span className="obfuscate-str contact_obfuscated">jerryxfu</span>,
        image: "",
        url: "",
        chipText: "secret",
        color: ""
    },
    {title: "Instagram", username: "@jerryxfu", image: _instagram, url: "https://www.instagram.com/jerryxfu/", chipText: "media", color: "#ffb5a622"},
    {title: "Discord", username: "@jerrydev", image: _discord, url: "https://discord.com/users/[user id]", chipText: "public", color: "#e6a6ff22"},
    {title: "Github", username: "jerryxfu", image: "", url: "https://github.com/jerryxfu", chipText: "</>", color: "#ffffff22"},
];

export default function Contact() {
    const {currentTheme} = useThemeSwitcher();
    const [themedMedias, setThemedMedias] = useState(medias);

    const updateMediaImage = (mediaName: string, newImage: string) => {
        setThemedMedias((prevMedias) =>
            prevMedias.map((media) =>
                media.title === mediaName ? {...media, image: newImage} : media
            )
        );
    };

    useEffect(() => {
        updateMediaImage("Snapchat", currentTheme === "night" ? _snapchat_da : _snapchat_lt);
        updateMediaImage("Github", currentTheme === "night" ? _github_da : _github_lt);
    }, [currentTheme]);

    const baffle_num = baffle(".obfuscate-num", {
        characters: "0123456789#",
        speed: 12,
    });

    const baffle_str = baffle(".obfuscate-str", {
        characters: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#!._-()",
        speed: 12,
    });

    baffle_num.start();
    baffle_str.start();

    return (
        <div className="section contact">
            <SectionTitle text={"Contact Me"} />

            <div className="contact_container">
                <div className="contact_grid-container">
                    <SubTitle text={"Social media"} />
                    <div className="contact_grid">
                        {themedMedias.map((media) => (
                            <ContactCard
                                title={media.title}
                                username={media.username}
                                image={media.image}
                                url={media.url}
                                chipText={media.chipText}
                                color={media.color}
                                key={media.title.toLowerCase().replace(" ", "-")}
                            />
                        ))}
                    </div>
                </div>
                <div className="contact_info-container">
                    <SubTitle text={"Get in touch"} />
                    <ul style={{paddingLeft: 0}}>
                        <li className="contact_list-element">
                            <AlternateEmailRounded sx={{marginRight: "0.20rem"}} />
                            <a href="mailto:jerryfu_mc@outlook.com">jerryfu_mc@outlook.com</a>
                        </li>
                        <li className="contact_list-element">
                            <Phone sx={{marginRight: "0.20rem"}} />
                            <a href="tel:+10000000000">+1 (<span className="obfuscate-num">000</span>) <span className="obfuscate-num">000</span>
                                -<span className="obfuscate-num">0000</span></a>
                        </li>
                    </ul>
                    <div className="contact_cv">
                        <SubTitle text={"Curriculum Vitae"} />
                    </div>
                </div>
            </div>
        </div>
    );
};
