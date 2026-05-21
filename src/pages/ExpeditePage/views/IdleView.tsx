import {Download, Upload} from "lucide-react";
import "./IdleView.scss";

interface IdleViewProps {
    onNewDrop: () => void;
    onRetrieve: () => void;
}

export default function IdleView({onNewDrop, onRetrieve}: IdleViewProps) {
    return (
        <div className="expedite_actions">
            <button className="expedite_action-btn" onClick={onNewDrop}>
                <Upload size={22} strokeWidth={1.5} />
                <div className="expedite_action-text">
                    <span className="small-text">New drop</span>
                    <span className="smaller-caption-text">Share a file or text snippet</span>
                </div>
            </button>

            <button className="expedite_action-btn" onClick={onRetrieve}>
                <Download size={22} strokeWidth={1.5} />
                <div className="expedite_action-text">
                    <span className="small-text">Retrieve a drop</span>
                    <span className="smaller-caption-text">Enter a code to access shared content</span>
                </div>
            </button>
        </div>
    );
}