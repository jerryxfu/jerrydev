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
                    <h3 className="text-small">New drop</h3>
                    <p className="text-caption">Share a file or text snippet</p>
                </div>
            </button>

            <button className="expedite_action-btn" onClick={onRetrieve}>
                <Download size={22} strokeWidth={1.5} />
                <div className="expedite_action-text">
                    <h3 className="text-small">Retrieve a drop</h3>
                    <p className="text-caption">Enter a code to access shared content</p>
                </div>
            </button>
        </div>
    );
}