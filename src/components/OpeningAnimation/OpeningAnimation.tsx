import React, {useEffect, useRef, useState} from "react";
import "./OpeningAnimation.scss";
import {useGSAP} from "@gsap/react";
import {gsap} from "gsap";

export default function OpeningAnimation() {
    const [isAnimationComplete, setIsAnimationComplete] = useState(false);
    // const helloContainerRef = useRef(null);
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
        // gsap.to([topRef.current, bottomRef.current], {
        //     backgroundColor: "white",
        //     ease: "power1.out",
        //     duration: 2,
        //     delay: 0.2
        // });
        // gsap.to(helloRef.current, {
        //     color: "black",
        //     ease: "power1.out",
        //     duration: 2,
        //     delay: 0.2
        // });
        // slide away
        gsap.to([topRef.current, bottomRef.current], {
            height: 0,
            ease: "power1.out",
            duration: 1,
            delay: 0.2
        });
        // opacity 0
        gsap.to([topRef.current, bottomRef.current], {
            opacity: 0,
            ease: "power1.out",
            duration: 1,
            delay: 0.2
        });
        // // scale up
        // gsap.to(helloRef.current, {
        //     scale: 12,
        //     duration: 1,
        //     ease: "nativeEase",
        //     delay: 0.2
        // });
        // // opacity 0
        // gsap.to(helloRef.current, {
        //     opacity: 0,
        //     duration: 0.35,
        //     ease: "power1.out",
        //     delay: 0.2
        // });
    });

    if (isAnimationComplete) return null;

    return (
        <div className="opening-animation">
            {/*<div ref={helloContainerRef} style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100vh"}}>*/}
            {/*    <h1 className="hello-text" ref={helloRef}>Hello</h1>*/}
            {/*</div>*/}
            <div ref={topRef} className="top-half" />
            <div ref={bottomRef} className="bottom-half" />
        </div>
    );
}