import "./Friends.scss";
import SubSectionTitle from "../SubTitle/SubSectionTitle.tsx";
import {friendList} from "./friends.ts";

// The footer's special mentions, brought up the page into About: who they are and why they're here, one line each.
export default function Friends() {
    return (
        <div className="friends">
            <SubSectionTitle
                text={"People I build with"}
                description={"Friends I make things with. Their corners of the web are worth the visit."}
            />
            <ul className="friends_list">
                {friendList.map((friend) => (
                    <li key={friend.url}>
                        <a className="friends_card" href={friend.url} target="_blank" rel="noopener noreferrer">
                            <img className="friends_icon" src={friend.icon} alt="" loading="lazy" decoding="async" />
                            <span className="friends_text">
                                <span className="friends_name">
                                    {friend.name}
                                    <span className="friends_site">{friend.site}</span>
                                </span>
                                <span className="friends_blurb">{friend.blurb}</span>
                            </span>
                            <span className="friends_arrow" aria-hidden="true">↗</span>
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}
