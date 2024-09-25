import React, {useEffect, useState} from "react";
import {Chip} from "@mui/joy";
import {LinearProgress} from "@mui/material";
import "./SkillCard.scss";

export default function SkillCard({logo, title, description, score, url, chipText}: {
    logo: string,
    title: string,
    description?: string,
    score: number,
    url: string
    chipText: string,
}) {
    const [progress, setProgress] = useState<number>(0);
    const [buffer, setBuffer] = useState<number>(0);

    useEffect(() => {
        setProgress(score === 5 ? score * 20 - 15 : score * 20);
        const updateBuffer = () => {
            const minBuffer = progress + 8;
            const maxBuffer = progress + 11;
            const newBuffer = Math.random() * (maxBuffer - minBuffer) + minBuffer;
            setBuffer(newBuffer);
        };
        updateBuffer();
        const interval = setInterval(updateBuffer, 1350);

        return () => clearInterval(interval);
    }, [score]);

    return (
        <div className="skillcard">
            <a href={url} target="_blank" rel="noopener noreferrer">
                <img src={logo} alt={`${title} logo`} className="skillcard_logo" />
            </a>
            <div className="skillcard_content">
                <h3 className="skillcard_title">{title}</h3>
                <p className="skillcard_description">{description}</p>
                <LinearProgress variant="buffer" value={progress} valueBuffer={buffer} className="skillcard_progress" />
            </div>
            <Chip className="skillcard_chip">{chipText}</Chip>
        </div>
    );
}