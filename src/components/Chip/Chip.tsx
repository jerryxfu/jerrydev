import "./Chip.scss";

export default function Chip({children, size = "sm", transparent = false, className = ""}: {
    children: React.ReactNode;
    size?: "xs" | "sm" | "md" | "lg";
    // No fill, only a hairline outline: for a chip that sits on a card rather than over a picture.
    transparent?: boolean;
    className?: string;
}) {
    return (
        <span className={`chip chip-${size}${transparent ? " chip-transparent" : ""} ${className}`}>
            {children}
        </span>
    );
}
