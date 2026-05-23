import React from "react";
import {Search} from "lucide-react";
import "./JoinView.scss";

interface JoinViewProps {
    code: string;
    setCode: (code: string) => void;
    error: string | null;
    loading: boolean;
    onJoin: () => void;
    onCancel: () => void;
}

export default function JoinView({code, setCode, error, loading, onJoin, onCancel}: JoinViewProps) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") onJoin();
    };

    return (
        <div className="rv_join">
            <p className="smaller-caption-text">Enter event code</p>
            <div className="rv_code-input-row">
                <input
                    className="rv_code-input"
                    type="text"
                    placeholder="ABC123"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    onKeyDown={handleKeyDown}
                    maxLength={8}
                    autoFocus
                />
                <button
                    className="rv_btn-primary"
                    onClick={onJoin}
                    disabled={loading || !code.trim()}
                    style={{flex: "none"}}
                >
                    {loading ? "..." : <Search size={16} />}
                </button>
            </div>

            {error && <p className="rv_error">{error}</p>}

            <button className="rv_btn-secondary rv_btn-full" onClick={onCancel}>Cancel</button>
        </div>
    );
}