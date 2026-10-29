import type {ComponentProps} from "react";
import {LoaderCircle, type LucideIcon} from "lucide-react";
import "./Button.scss";

interface ButtonProps extends ComponentProps<"button"> {
    // main: the one action to take on a screen, in the accent. plain: the others, outlined. danger: outlined in red, for
    // what deletes, stops or aborts.
    variant?: "main" | "plain" | "danger";
    // big: the stopwatch's and the countdown's own buttons, the main thing to press on their screen.
    size?: "normal" | "big";
    // Icons before and after the label, drawn at the button's icon size. With no label, the button is its icon alone.
    start?: LucideIcon;
    end?: LucideIcon;
    // Waiting on what it started (a call to the API): a spinner in its icon's place (the start's, else the end's, else
    // before the label), its colours kept. Feedback only: clicks still go through (Jerry: a button stuck busy by some
    // obscure case must still be pressable).
    busy?: boolean;
}

/** The site's button (Expedite, the Time page). `className` is for the page's own layout: a row's width, a state. */
export default function Button(
    {variant = "plain", size = "normal", start: Start, end: End, busy = false, className, type = "button", children, ...rest}: ButtonProps
) {
    const iconOnly = children == null || children === false;
    // Beside a label, an icon as tall as the text; alone, a little bigger (Expedite's trash), or the big buttons' (the mute).
    const iconSize = size === "big" ? 20 : iconOnly ? 16 : 14;
    const classes = ["btn", variant !== "plain" && `btn--${variant}`, size === "big" && "btn--big", iconOnly && "btn--icon", busy && "btn--busy", className];
    const spinner = <LoaderCircle size={iconSize} className="spinning" aria-hidden />;
    return (
        <button type={type} className={classes.filter(Boolean).join(" ")} aria-busy={busy || undefined} {...rest}>
            {busy && (Start || !End) ? spinner : Start && <Start size={iconSize} aria-hidden />}
            {children}
            {busy && !Start && End ? spinner : End && <End size={iconSize} aria-hidden />}
        </button>
    );
}
