import {useEffect, useMemo, useState} from "react";
import {Clock, FileText, Mail} from "lucide-react";
import "./Contact.scss";
import SectionTitle from "../../../components/SectionTitle/SectionTitle.tsx";
import SubSectionTitle from "../../../components/SubTitle/SubSectionTitle.tsx";
import ContactCard from "./components/ContactCard.tsx";

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
    {title: "Github", username: "jerryxfu", image: "", url: "https://github.com/jerryxfu", chipText: "🟩", color: "#56d36410"},
    {title: "Instagram", username: "@jerryxfu", image: _instagram, url: "https://www.instagram.com/jerryxfu/", chipText: "📷", color: "#ffb5a610"},
    {
        title: "Steam",
        username: "jerryxf 1650859595",
        image: _steam,
        url: "https://steamcommunity.com/id/jerryxf/",
        chipText: "🎮",
        color: "#00adee10"
    },
    {
        title: "Discord",
        username: "@jerryxf",
        image: _discord,
        url: "https://discord.com/users/611633988515266562",
        chipText: "💬",
        color: "#e6a6ff10"
    }
    // {title: "YouTube", username: "@jerryxf", image: _youtube, url: "https://youtube.com/@jerryxf", chipText: "nothing here...", color: "#ff003310"},
    // {
    //     title: "Reddit",
    //     username: "u/jerryxf",
    //     image: _reddit,
    //     url: "https://reddit.com/user/jerryxf/",
    //     chipText: "",
    //     color: "#ffb5a610"
    // },
];

const MY_ZONE = "America/Toronto";

// Minutes that a zone is ahead of UTC at this instant. Intl gives the wall-clock reading in that zone;
// treating that reading as if it were UTC and subtracting the real instant yields the offset, DST and
// half-hour zones included. Rounded to the minute because the parts are only second-accurate.
function zoneOffsetMinutes(date: Date, timeZone: string): number {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone, hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(date);
    // Read by part type rather than through an Object.fromEntries lookup: that returns an index signature, and under noUncheckedIndexedAccess every field off it is string | undefined.
    const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    // hour is 0-23 under hour12: false, except that some engines emit 24 for midnight.
    const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
    return Math.round((asUTC - date.getTime()) / 60000);
}

export default function Contact() {
    const {currentTheme} = useTheme();

    // Same pairing the footer uses: light artwork on the dark themes, and the reverse. The small icon rides the link; the full lockup is the block's visual anchor.
    const dark = isDarkTheme(currentTheme);
    const unveilIcon = useMemo(() => dark ? _unveil_icon_light : _unveil_icon_dark, [dark]);
    const unveilMark = useMemo(() => dark ? _unveil_mark_light : _unveil_mark_dark, [dark]);

    // Ticks so the clock does not go stale on a tab left open. 30s rather than 1s: the display is only
    // accurate to the minute, so a per-second interval would re-render 60x for no visible change.
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 30_000);
        return () => clearInterval(id);
    }, []);
    // A named zone rather than a fixed offset, so all of this follows daylight saving on its own. Montreal is EST only from November to March; it is EDT the rest of the year.
    const clock = useMemo(() => {
        const parts = new Intl.DateTimeFormat("en-US", {
            hour: "numeric", minute: "2-digit", timeZone: MY_ZONE, timeZoneName: "short",
        }).formatToParts(now);
        const zone = parts.find((p) => p.type === "timeZoneName")?.value ?? "ET";
        const time = parts.filter((p) => p.type !== "timeZoneName").map((p) => p.value).join("").trim();

        // Positive means this clock is ahead of the reader's. getTimezoneOffset is minutes behind UTC, so it is negated to match the convention used above.
        const delta = zoneOffsetMinutes(now, MY_ZONE) + now.getTimezoneOffset();
        const abs = Math.abs(delta);
        const h = Math.floor(abs / 60), m = abs % 60;
        const span = m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
        const offset = delta > 0 ? `+${span} ahead` : delta < 0 ? `-${span} behind` : "+0h";

        return {time, zone, offset};
    }, [now]);

    const themedMedias = useMemo(() => medias.map((media) => {
        if (media.title !== "Github") return media;

        return {
            ...media,
            image: isDarkTheme(currentTheme) ? _github_da : _github_lt
        };
    }), [currentTheme]);


    return (
        <div className="section contact">
            <SectionTitle text={"Contact Me"} />

            <div className="contact_container">
                <div className="contact_online">
                    <SubSectionTitle text={"Find me online"} />
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

                <div className="contact_work">
                    <SubSectionTitle text={"Work with me"} />

                    <div className="contact_work-body">
                        <div className="contact_work-content">
                            <p className="contact_work-blurb">
                                I build websites and small tools for people, case by case depending on scope
                                and timing. If you have something in mind, an email is the best place to start.
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
                                    <a href="mailto:me@jerryxf.net">me@jerryxf.net</a>
                                </li>
                                <li className="contact_detail">
                                    <FileText size={17} aria-hidden="true" />
                                    <a href="https://cv.jerryxf.net" target="_blank" rel="noopener noreferrer">
                                        View curriculum vitae
                                    </a>
                                </li>
                                <li className="contact_detail">
                                    <Clock size={17} aria-hidden="true" />
                                    <span>{clock.time} my local time ({clock.zone}, {clock.offset})</span>
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
