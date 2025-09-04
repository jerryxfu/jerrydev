import React, {useRef} from "react";
import "./Cath.scss";
import gsap from "gsap";
import {useGSAP} from "@gsap/react";

export default function Cath() {
    const glowBarRef = useRef(null);

    // Calculate days since departure
    const departureDate = new Date("2025-09-01");
    const currentDate = new Date();
    const timeDifference = currentDate.getTime() - departureDate.getTime();
    const daysSinceDeparture = Math.floor(timeDifference / (1000 * 3600 * 24));

    useGSAP(() => {
        gsap.to(glowBarRef.current, {
            width: "130%",
            opacity: 1,
            ease: "nativeEase",
            duration: 1,
        });
    });

    return (
        <div className="cath">
            <div className="cath_title-container">
                <h1 style={{fontWeight: "initial"}}>Farewell Catherine!</h1>
                <div className="cath_glowing-separator" ref={glowBarRef} />
            </div>
            <p className="cath_description">Wishing you all the best in your studies and future endeavors. May your journey be filled with success and
                happiness!</p>

            <div className="cath_content-container">
                <div className="cath_left">
                    <h3>Departed since</h3>
                    <p className="cath_date">September 1st, 2025</p>
                    <p className="cath_days-ago">{daysSinceDeparture} days ago</p>
                </div>
                <div className="cath_right">
                    <h4>Beijing Film Academy</h4>
                    <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3057.645003617578!2d116.354867!3d39.971689!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x35f047cdef69e12b%3A0x3e239be38b8ff2cb!2sBeijing%20Film%20Academy!5e0!3m2!1sen!2sca!4v1756694076388!5m2!1sen!2sca"
                        width="600" height="450" style={{border: 0}} allowFullScreen={false} loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade" />
                </div>
            </div>
        </div>
    );
};
