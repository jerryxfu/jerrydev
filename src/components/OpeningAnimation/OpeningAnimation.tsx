import React, {useState, useEffect} from 'react';
import "./OpeningAnimation.scss";

export default function OpeningAnimation() {
    const [isAnimationComplete, setIsAnimationComplete] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsAnimationComplete(true);
            // total animation time: 1300ms
        }, 1400); // slightly more time for lag (because disappears before fully finished)

        return () => clearTimeout(timer);
    }, []);

    if (isAnimationComplete) return null;

    return (
        <div className="opening-animation">
            <div className="top-half"></div>
            <div className="bottom-half"></div>
        </div>
    );
}
