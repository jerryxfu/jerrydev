import React, {useEffect, useRef, useState} from "react";
import "./OpeningAnimation.scss";
import {useGSAP} from "@gsap/react";
import {gsap} from "gsap";

export default function OpeningAnimation() {
    const [isAnimationComplete, setIsAnimationComplete] = useState(false);
    const helloContainerRef = useRef(null);
    const helloRef = useRef(null);
    const topRef = useRef(null);
    const bottomRef = useRef(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsAnimationComplete(true);
        }, 2500); // ms

        return () => clearTimeout(timer);
    }, []);

    useGSAP(() => {
        gsap.to([topRef.current, bottomRef.current], {
            backgroundColor: "white",
            duration: 2
        });
        gsap.to(helloRef.current, {
            color: "black",
            duration: 2
        });
        gsap.to([topRef.current, bottomRef.current], {
            opacity: 0,
            duration: 1,
            delay: 1.175
        });
        gsap.to([helloContainerRef.current, helloRef.current], {
            opacity: 0,
            duration: 0.35,
            delay: 1.175
        });
    });

    if (isAnimationComplete) return null;

    return (
        <div className="opening-animation">
            <div ref={helloContainerRef} style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100vh"}}>
                <h1 className="hello-text" ref={helloRef}>Hello</h1>
            </div>
            <div ref={topRef} className="top-half"></div>
            <div ref={bottomRef} className="bottom-half"></div>
        </div>
    );
}
