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
        }, 3000); // ms

        return () => clearTimeout(timer);
    }, []);

    useGSAP(() => {
        const tl = gsap.timeline();

        tl.to([topRef.current, bottomRef.current], {
            backgroundColor: "white",
            ease: "power2.out",
            duration: 2
        }, 0.35);
        tl.to(helloRef.current, {
            color: "black",
            ease: "power2.out",
            duration: 2
        }, 0.35);
        // slide away
        tl.to([topRef.current, bottomRef.current], {
            height: 0,
            ease: "power1.out",
            duration: 1
        }, 1.50);
        // opacity 0
        tl.to([topRef.current, bottomRef.current], {
            opacity: 0,
            ease: "power1.out",
            duration: 1
        }, 1.50);
        // scale up
        tl.to(helloRef.current, {
            scale: 12,
            duration: 1,
            ease: "nativeEase",
        }, 1.50);
        // opacity 0
        tl.to(helloRef.current, {
            opacity: 0,
            duration: 0.35,
            ease: "power1.out",
        }, 1.50);
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