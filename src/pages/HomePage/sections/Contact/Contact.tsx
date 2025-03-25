import React from "react";
import "./Contact.scss";
import SectionTitle from "../../../../components/SectionTitle/SectionTitle.tsx";
import SubTitle from "../../../../components/SubTitle/SubTitle.tsx";
import ContactCard from "./components/ContactCard.tsx";

import _discord from "../../../../assets/socials/discord_mark.svg";
import _instagram from "../../../../assets/socials/instagram_mark.svg";


const medias = [
    {title: "Snapchat", username: "redacted", image: "", url: "", chipText: "private", color: ""},
    {title: "Instagram", username: "@jerryxfu", image: _instagram, url: "", chipText: "media", color: "#ffb5a622"},
    {title: "Discord", username: "@jerrydev", image: _discord, url: "", chipText: "public", color: "#e6a6ff22"},

];

const get_in_touch = [
    {}
];

export default function Contact() {
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
                    </div>
                    <div className="contact_cv_container">
                        <SubTitle text={"Curriculum Vitae"} />
                    </div>
                </div>
            </div>
        </div>
    );
};
