import {CalendarPlus, Users} from "lucide-react";
import "./IdleView.scss";

interface IdleViewProps {
    onCreateEvent: () => void;
    onJoinEvent: () => void;
}

export default function IdleView({onCreateEvent, onJoinEvent}: IdleViewProps) {
    return (
        <div className="rv_actions">
            <button className="rv_action-btn" onClick={onCreateEvent}>
                <CalendarPlus size={22} strokeWidth={1.5} />
                <div className="rv_action-text">
                    <span className="small-text">Create event</span>
                    <span className="smaller-caption-text">Pick dates and share with your group</span>
                </div>
            </button>

            <button className="rv_action-btn" onClick={onJoinEvent}>
                <Users size={22} strokeWidth={1.5} />
                <div className="rv_action-text">
                    <span className="small-text">Join event</span>
                    <span className="smaller-caption-text">Enter a code to add your availability</span>
                </div>
            </button>
        </div>
    );
}