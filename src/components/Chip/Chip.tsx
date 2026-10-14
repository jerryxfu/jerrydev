import "./Chip.scss";

// No fill, only a hairline outline: chips sit on cards. One over a picture would need a fill of its own.
export default function Chip({children, size = "sm", className = ""}: {
    children: React.ReactNode;
    size?: "xs" | "sm" | "md" | "lg";
    className?: string;
}) {
    return (
        <span className={`chip chip-${size} ${className}`}>
            {children}
        </span>
    );
}
