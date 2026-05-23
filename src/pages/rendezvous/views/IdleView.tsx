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
                    <h3 className="text-small">Create event</h3>
                    <p className="text-caption">Pick dates and share with your group</p>
                </div>
            </button>

            <button className="rv_action-btn" onClick={onJoinEvent}>
                <Users size={22} strokeWidth={1.5} />
                <div className="rv_action-text">
                    <h3 className="text-small">Join event</h3>
                    <p className="text-caption">Enter a code to add your availability</p>
                </div>
            </button>
        </div>
    );
}