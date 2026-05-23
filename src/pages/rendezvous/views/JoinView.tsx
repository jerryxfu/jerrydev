import React from "react";
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
    return (
        <div className="rv_join">
            <input
                className="rv_code-input"
                type="text"
                placeholder="Enter event code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={5}
                autoFocus={true}
                onKeyDown={(e) => e.key === "Enter" && onJoin()}
            />
            {error && <p className="rv_error">{error}</p>}
            <div className="rv_btn-row">
                <button className="rv_btn-secondary" onClick={onCancel}>Cancel</button>
                <button
                    className="rv_btn-primary"
                    onClick={onJoin}
                    disabled={loading || code.trim().length < 3}
                >
                    {loading ? "Looking up..." : "Join"}
                </button>
            </div>
        </div>
    );
}