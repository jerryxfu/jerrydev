import {useEffect, useState} from "react";
import "./Contact.scss";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";
import SubTitle from "../../../components/SubTitle/SubTitle.tsx";
// @ts-ignore
import baffle from "baffle";
import ContactCard from "./components/ContactCard.tsx";

import _discord from "../../../assets/socials/discord_mark.svg";
import _instagram from "../../../assets/socials/instagram_mark.svg";
import _github_lt from "../../../assets/skills/github.svg";
import _github_da from "../../../assets/skills/github_white.svg";
import useThemeSwitcher from "../../../hooks/useThemeSwitcher.ts";
import {AlternateEmailRounded, OpenInNewRounded} from "@mui/icons-material";
import _steam from "../../../assets/socials/steam_mark.svg";
import {Button} from "@mui/joy";

const medias = [
    {title: "Instagram", username: "@jerryxfu", image: _instagram, url: "https://www.instagram.com/jerryxfu/", chipText: "", color: "#ffb5a610"},
    {
        title: "Discord",
        username: "@jerrydev",
        image: _discord,
        url: "https://discord.com/users/611633988515266562",
        chipText: "",
        color: "#e6a6ff10"
    },
    {
        title: "LinkedIn",
        username: "in/jerryfu-dev",
        image: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linkedin/linkedin-original.svg",
        url: "https://www.linkedin.com/in/jerryfu-dev/",
        color: "#0a66c210"
    },
    // {title: "YouTube", username: "@jerryxf", image: _youtube, url: "https://youtube.com/@jerryxf", chipText: "nothing here...", color: "#ff003310"},
    {title: "Github", username: "jerryxfu", image: "", url: "https://github.com/jerryxfu", chipText: "🟩", color: "#56d36410"},
    // {
    //     title: "Reddit",
    //     username: "u/jerryxf",
    //     image: _reddit,
    //     url: "https://reddit.com/user/jerryxf/",
    //     chipText: "",
    //     color: "#ffb5a610"
    // },
    {
        title: "Steam",
        username: "jerryxf",
        image: "https://favicon.im/store.steampowered.com?larger=true",
        url: "https://steamcommunity.com/id/jerryxf/",
        chipText: "",
        color: "#00adee10"
    }
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
        // updateMediaImage("Snapchat", currentTheme === "night" ? _snapchat_da : _snapchat_lt);
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
                    {/*<SubTitle text={"Public social media"} />*/}
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
                            <a className="text" href="mailto:me@jerryxf.net">me@jerryxf.net</a>
                        </li>
                    </ul>
                    <div className="contact_cv">
                        <SubTitle text={"Curriculum Vitae"} />
                        <Button variant="outlined" color="neutral" href="https://cv.jerryxf.net" target="_blank" rel="noopener noreferrer"
                                startDecorator={<OpenInNewRounded />}>
                            View CV
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
