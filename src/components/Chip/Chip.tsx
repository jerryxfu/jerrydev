import "./Chip.scss";

export default function Chip({ children, size = "sm", className = "" }: {
    children: React.ReactNode;
    size?: "sm" | "md" | "lg";
    className?: string;
}) {
    return (
        <span className={`chip chip-${size} ${className}`}>
            {children}
        </span>
    );
}
