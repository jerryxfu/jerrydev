import {useState} from "react";
import Calendar from "@/components/Calendar/Calendar.tsx";
import "./RangeCalendar.scss";

type Props = {
    first: string | null;   // YYYY-MM-DD, the days as clicked (in any order)
    second: string | null;
    onPick: (day: string) => void;
};

// A month to pick two days on. With only the first one picked, the day under the pointer shows where the range would
// end. Dates are compared as YYYY-MM-DD strings, which sort as the days do.
export default function RangeCalendar({first, second, onPick}: Props) {
    const [hover, setHover] = useState<string | null>(null);

    const preview = Boolean(first && !second && hover);
    const end = second ?? (preview ? hover : first);
    const [lo, hi] = first && end ? (first <= end ? [first, end] : [end, first]) : [null, null];

    return (
        <Calendar
            className="rangecal"
            gridProps={{className: preview ? "is-preview" : undefined, onMouseLeave: () => setHover(null)}}
            dayProps={(day) => ({
                className: [
                    lo !== null && hi !== null && day >= lo && day <= hi && "is-in",
                    day === lo && "is-lo",
                    day === hi && "is-hi",
                ].filter(Boolean).join(" "),
                "aria-pressed": day === first || day === second,
                onClick: () => onPick(day),
                onMouseEnter: () => setHover(day),
            })}
        />
    );
}
