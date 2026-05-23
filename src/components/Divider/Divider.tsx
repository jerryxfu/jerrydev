import "./Divider.scss";

interface DividerProps {
    spacing?: "sm" | "md" | "lg";
}

export default function Divider({spacing = "md"}: DividerProps) {
    return <hr className={`divider divider--${spacing}`} />;
}