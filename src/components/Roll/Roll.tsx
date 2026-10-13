import {Fragment, useState} from "react";
import "./Roll.scss";

// Numbers changing the way an odometer's do, where Morph is for words: in a text, each number rolls to its new value
// (up when it grew, down when it shrank) and the words between them fade in when they change. Quick, and the old and
// new figures move together by exactly one line in a window that clips them, so there's no empty moment. The digits a
// number shares at the front with the one before stay put: 14 to 15 rolls the 4 alone. Usage:
//
//     <Roll text={`${days} days`} />          the first text fades in; each change rolls its numbers, fades its words
//     <Roll text={count} direction="up" />    always one way, whatever the values

type Direction = "up" | "down";

// A number, with its thousands separators: a comma in English, a narrow space in French.
const NUMBER = /(\d(?:[\d,.\u00a0\u202f]*\d)?)/;

// Its digits as one figure, to tell up from down: two numbers written the same way (separators, decimals) compare right.
const sizeOf = (number: string) => Number(number.replace(/\D/g, ""));

type Props = {
    text: string;
    // Which way every number rolls; unless said, each goes by its own values.
    direction?: Direction;
    className?: string;
};

export default function Roll({text, direction, className}: Props) {
    // Odd parts are the numbers. A word is keyed by its text: a changed word is a new element and fades in once.
    return (
        <span className={className ? `roll ${className}` : "roll"}>
            {text.split(NUMBER).map((part, i) => i % 2
                ? <Figure key={i} value={part} direction={direction} />
                : <Fragment key={`${i}:${part}`}>{part && <span className="roll_fade">{part}</span>}</Fragment>)}
        </span>
    );
}

function Figure({value, direction}: { value: string; direction?: Direction }) {
    const [shown, setShown] = useState({value, before: "", up: true, turn: 0});
    if (value !== shown.value) {
        const up = direction ? direction === "up" : sizeOf(value) >= sizeOf(shown.value);
        setShown({value, before: shown.value, up, turn: shown.turn + 1});
    }

    // The first value only fades in, as the words do.
    if (shown.turn === 0) return <span className="roll_fade">{shown.value}</span>;

    let keep = 0;
    while (keep < shown.value.length && keep < shown.before.length && shown.value[keep] === shown.before[keep]) keep++;

    // Keyed by the turn, so each change is a new pair of elements and plays its roll once.
    return (
        <span className="roll_figure">
            {shown.value.slice(0, keep)}
            <span className={`roll_window ${shown.up ? "is-up" : "is-down"}`}>
                <span key={`old${shown.turn}`} className="roll_old" aria-hidden>{shown.before.slice(keep)}</span>
                <span key={`new${shown.turn}`} className="roll_new">{shown.value.slice(keep)}</span>
            </span>
        </span>
    );
}
