import {type RefObject, useEffect} from "react";

// A field ready to type in when it appears (while `when` holds): on a device with a mouse or trackpad only, where a
// keyboard is at hand (on a phone the keyboard would come up over the page), and without scrolling the page to it.
export default function useAutoFocus(field: RefObject<HTMLElement | null>, when = true) {
    useEffect(() => {
        if (when && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
            field.current?.focus({preventScroll: true});
        }
    }, [field, when]);
}
