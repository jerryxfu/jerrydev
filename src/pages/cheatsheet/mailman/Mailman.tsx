import React from "react";
import "./Mailman.scss";


type TableEntry = { phrase: string, description: string };

const en_start: TableEntry[] = [
    {phrase: "Hello", description: "an expression"},
];
const en_end: TableEntry[] = [
    {phrase: "Best regards", description: "an expression"},
];

const fr_star: TableEntry[] = [
    {phrase: "bonjour", description: "une expression"},
];
const frg_end: TableEntry[] = [
    {phrase: "Bien à vous", description: "une expression"},
];


export default function Mailman() {
    return (
        <div className="layout-column">
            <h1>Mailman</h1>
            <h2>English start</h2>
            <div className="layout-row">
                <div className="">
                    <h3>English start</h3>
                    <table className="mailman_grid">
                        <thead>
                        <tr>
                            <th>Phrase</th>
                            <th>Description</th>
                        </tr>
                        </thead>
                        <tbody>
                        {en_start.map((expression) => (
                            <tr key={expression.phrase}>
                                <td>{expression.phrase}</td>
                                <td>{expression.description}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
