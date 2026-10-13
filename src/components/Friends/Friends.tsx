import "./Friends.scss";
import {friendList, hideBrokenIcon} from "./friends.ts";

// The footer's special mentions, brought up into About, under the highlighted projects: the same small title as theirs
// (About.scss's highlights_head) and small cards in the same frame, one line about each person.
export default function Friends() {
    return (
        <aside className="friends" aria-labelledby="friends-title">
            <div className="highlights_head">
                <h3 className="highlights_heading" id="friends-title">People I build with</h3>
                <p className="highlights_description">
                    Friends I make things with. Their corners of the web are worth the visit.
                </p>
            </div>
            <ul className="friends_list">
                {friendList.map((friend) => (
                    <li key={friend.url}>
                        <a className="friends_card" href={friend.url} target="_blank" rel="noopener noreferrer">
                            <span className="friends_top">
                                <img className="friends_icon" src={friend.icon} alt="" loading="lazy" decoding="async" onError={hideBrokenIcon} />
                                <span className="friends_name">
                                    {friend.name}
                                    <span className="friends_site">{friend.site}</span>
                                </span>
                                <span className="friends_arrow" aria-hidden="true">↗</span>
                            </span>
                            <span className="friends_blurb">{friend.blurb}</span>
                        </a>
                    </li>
                ))}
            </ul>
        </aside>
    );
}
