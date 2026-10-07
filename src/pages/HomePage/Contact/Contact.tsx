import {useMemo} from "react";
import {Clock, FileText, Mail} from "lucide-react";
import "./Contact.scss";
import SubSectionTitle from "../../../components/SubTitle/SubSectionTitle.tsx";
import ContactCard from "./components/ContactCard.tsx";
import Morph from "@/components/Morph/Morph.tsx";
import useLocalClock from "@/hooks/useLocalClock.ts";

import _discord from "../../../assets/socials/discord_mark.svg";
import _instagram from "../../../assets/socials/instagram_mark.png";
import _github_lt from "../../../assets/socials/github.svg";
import _github_da from "../../../assets/socials/github_white.svg";
import _steam from "../../../assets/socials/steam.svg";
import {isDarkTheme, useTheme} from "@/context/ThemeContext.tsx";
import _unveil_icon_light from "../../../assets/projects/unveil/unveil_icon_light.png";
import _unveil_icon_dark from "../../../assets/projects/unveil/unveil_icon_dark.png";
import _unveil_mark_light from "../../../assets/projects/unveil/unveil_light.png";
import _unveil_mark_dark from "../../../assets/projects/unveil/unveil_dark.png";

const medias = [
    {title: "Github", username: "jerryxfu", image: "", url: "https://github.com/jerryxfu", color: "#56d36410"},
    {title: "Instagram", username: "@jerryxfu", image: _instagram, url: "https://www.instagram.com/jerryxfu/", color: "#ffb5a610"},
    {
        title: "Discord",
        username: "@jerryxf",
        image: _discord,
        url: "https://discord.com/users/611633988515266562",
        color: "#e6a6ff10"
    },
    {
        title: "Steam",
        username: "jerryxf 1650859595",
        image: _steam,
        url: "https://steamcommunity.com/id/jerryxf/",
        color: "#00adee10"
    }
    // {title: "YouTube", username: "@jerryxf", image: _youtube, url: "https://youtube.com/@jerryxf", color: "#ff003310"},
    // {
    //     title: "Reddit",
    //     username: "u/jerryxf",
    //     image: _reddit,
    //     url: "https://reddit.com/user/jerryxf/",
    //     color: "#ffb5a610"
    // },
];

export default function Contact() {
    const {currentTheme} = useTheme();

    // Same pairing the footer uses: light artwork on the dark themes, and the reverse. The small icon rides the link; the full lockup is the block's visual anchor.
    const dark = isDarkTheme(currentTheme);
    const unveilIcon = useMemo(() => dark ? _unveil_icon_light : _unveil_icon_dark, [dark]);
    const unveilMark = useMemo(() => dark ? _unveil_mark_light : _unveil_mark_dark, [dark]);

    // Shared with the hero's Montréal card, ticking on the minute. The digits morph when they change, the way a Live
    // Activity's do: "8:41" to "8:42" only swaps the 1.
    const clock = useLocalClock();
    const offset = clock.delta > 0 ? `+${clock.span} ahead` : clock.delta < 0 ? `-${clock.span} behind` : "+0h";

    const themedMedias = useMemo(() => medias.map((media) => {
        if (media.title !== "Github") return media;

        return {
            ...media,
            image: isDarkTheme(currentTheme) ? _github_da : _github_lt
        };
    }), [currentTheme]);


    return (
        <div className="contact">
            <div className="contact_container">
                <div className="contact_online">
                    <SubSectionTitle
                        text={"Find me online"}
                        description={"Email is a good way to reach me, but any of these work. Ideas, questions, corrections and offers of work are all welcome."}
                    />
                    <div className="contact_grid">
                        {themedMedias.map((media) => (
                            <ContactCard
                                title={media.title}
                                username={media.username}
                                image={media.image}
                                url={media.url}
                                color={media.color}
                                key={media.title.toLowerCase().replace(" ", "-")}
                            />
                        ))}
                    </div>
                </div>

                <div className="contact_work">
                    <SubSectionTitle text={"Work with me"} />

                    <div className="contact_work-body">
                        <div className="contact_work-content">
                            <p className="contact_work-blurb">
                                I build websites, apps, and tools for people, case by case depending on scope and timing.
                                If you have something in mind, an email is the best place to start.
                            </p>

                            {/*<a*/}
                            {/*    className="contact_unveil"*/}
                            {/*    href="https://unveiltechnologies.com"*/}
                            {/*    target="_blank"*/}
                            {/*    rel="noopener noreferrer"*/}
                            {/*>*/}
                            {/*    <img className="contact_unveil-icon" src={unveilIcon} alt="" />*/}
                            {/*    <span>Visit company website</span>*/}
                            {/*    <span className="contact_unveil-arrow" aria-hidden="true">→</span>*/}
                            {/*</a>*/}
                            <p
                                className="contact_unveil"
                            >
                                <img className="contact_unveil-icon" src={unveilIcon} alt="" />
                                <span>Visit company website (under maintenance)</span>
                                <span className="contact_unveil-arrow" aria-hidden="true">→</span>
                            </p>

                            {/* Its own list so the whole group can move elsewhere in one piece. */}
                            <ul className="contact_details">
                                <li className="contact_detail">
                                    <Mail size={17} aria-hidden="true" />
                                    <a className="contact_email" href="mailto:me@jerryxf.net">me@jerryxf.net</a>
                                </li>
                                <li className="contact_detail">
                                    <FileText size={17} aria-hidden="true" />
                                    <a href="https://cv.jerryxf.net" target="_blank" rel="noopener noreferrer">
                                        View curriculum vitae
                                    </a>
                                </li>
                                <li className="contact_detail">
                                    <Clock size={17} aria-hidden="true" />
                                    <span><Morph text={clock.hm} /> {clock.period} my local time ({clock.zone}, {offset})</span>
                                </li>
                            </ul>
                        </div>

                        <img className="contact_work-mark" src={unveilMark} alt="Unveil Technologies" />
                    </div>
                </div>
            </div>
        </div>
    );
};
