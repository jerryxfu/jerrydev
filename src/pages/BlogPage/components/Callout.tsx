import type {ReactNode} from "react";
import {CircleAlert, Info, Lightbulb, OctagonAlert, TriangleAlert} from "lucide-react";
import "./Callout.scss";

// The guides arrived carrying GitHub-style <div style="background-color: #dafbe1"> callouts, which break twice over in MDX: a string `style` attribute
// compiles to a string style prop that React 19 refuses, and the palette is hardcoded light-mode hex that ignores the theme entirely. The variants
// below are the five labels the guides actually used, no more.
const KINDS = {
    tip: {label: "Tip", Icon: Lightbulb},
    note: {label: "Note", Icon: Info},
    important: {label: "Important", Icon: CircleAlert},
    warning: {label: "Warning", Icon: TriangleAlert},
    caution: {label: "Caution", Icon: OctagonAlert},
} as const;

export type CalloutKind = keyof typeof KINDS;

type Props = {
    kind?: CalloutKind;
    // Overrides the English default, which is what lets the Spanish Excel post read "Nota" without a second component or a locale lookup living in the blog.
    label?: string;
    children: ReactNode;
};

export default function Callout({kind = "note", label, children}: Props) {
    const {label: fallback, Icon} = KINDS[kind];

    return (
        <aside className={`callout callout--${kind}`}>
            <p className="callout_label">
                <Icon size={15} aria-hidden="true" />
                {label ?? fallback}
            </p>
            <div className="callout_body">{children}</div>
        </aside>
    );
}
