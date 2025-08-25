import React from "react";


export default function SelectableButton(
    {value, selected, onClick, color = "#ccc", selectedColor = "#1976d2", selectedTextColor = "var(--text-i-c)", className = ""}:
    {
        value: number | string; selected: boolean; onClick: () => void;
        color?: string;
        selectedColor?: string;
        selectedTextColor?: string;
        className?: string;
    }
) {
    const style: React.CSSProperties = {
        padding: "0.5rem 0.85rem",
        border: `1px solid ${selected ? color : selectedColor}`,
        fontSize: "0.865rem",
        fontWeight: 400,
        borderRadius: 0,
        cursor: "pointer",
        backgroundColor: selected ? selectedColor : color,
        color: selected ? selectedTextColor : "var(--text-c)",
        transition: "all 0.15s ease",
    };

    return (
        <button
            style={style}
            onClick={onClick}
            className={className}
        >
            {value}
        </button>
    );
};
