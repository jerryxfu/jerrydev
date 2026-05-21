import "./RetrieveView.scss";

interface RetrieveViewProps {
    code: string;
    setCode: (code: string) => void;
    error: string | null;
    loading: boolean;
    onRetrieve: () => void;
    onCancel: () => void;
}

export default function RetrieveView({code, setCode, error, loading, onRetrieve, onCancel}: RetrieveViewProps) {
    return (
        <div className="expedite_retrieve">
            <input
                className="expedite_code-input"
                type="text"
                placeholder="Enter drop code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={5}
                autoFocus={true}
                onKeyDown={(e) => e.key === "Enter" && onRetrieve()}
            />
            {error && <p className="expedite_error">{error}</p>}
            <div className="expedite_btn-row">
                <button className="expedite_btn-secondary" onClick={onCancel}>Cancel</button>
                <button
                    className="expedite_btn-primary"
                    onClick={onRetrieve}
                    disabled={loading || code.trim().length < 3}
                >
                    {loading ? "Looking up..." : "Retrieve"}
                </button>
            </div>
        </div>
    );
}