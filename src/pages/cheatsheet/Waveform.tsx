import React from "react";

type ECGLead = { lead: string, placement: string, view: string };

const limb_leads: ECGLead[] = [
    {lead: "Lead I", placement: "LA ➡️ RA", view: "Lateral wall of left ventricle"},
    {lead: "Lead II", placement: " LL ↗️ RA", view: "Inferior wall of left ventricle"},
    {lead: "Lead III", placement: "LL ⬆️ LA", view: "Inferior wall of left ventricle"}
];
const augmented_limb_leads: ECGLead[] = [
    {lead: "aVR", placement: "RA", view: "Right atrium, cavity of the heart"},
    {lead: "aVL", placement: "LA", view: "Lateral wall of heart"},
    {lead: "aVF", placement: "LL", view: "Inferior wall of heart"}
];
const precordial_leads: ECGLead[] = [
    {lead: "V1", placement: "4th intercostal space", view: "Septum, right ventricle"},
    {lead: "V2", placement: "4th intercostal space", view: "Septum, anterior heart"},
    {lead: "V3", placement: "Between V2 and V4", view: "Anterior heart"},
    {lead: "V4", placement: "5th intercostal space, midclavicular line ", view: "Anterior wall, apex"},
    {lead: "V5", placement: "Same level as V4, anterior axillary line ", view: "Lateral wall of left ventricle"},
    {lead: "V6", placement: "Same level as V4, midaxillary line", view: "Anterior wall of left ventricle"}
];

export default function Waveform() {
    return (
        <div className="layout-column">
            <h1>WAVEFORM AND SIG NAMES</h1>
            <h2>ECG Leads - Electrocardiogram</h2>
            <div className="layout-row">
                <div className="container wave_leads-table">
                    <h3>Limb Leads (Bipolar)</h3>
                    <div className="wave_leads-table">
                        <table>
                            <thead>
                            <tr>
                                <th>Lead</th>
                                <th>Placement (+ to -)</th>
                                <th>View</th>
                            </tr>
                            </thead>
                            <tbody>
                            {limb_leads.map((lead) => (
                                <tr key={lead.lead.toLowerCase()}>
                                    <td>{lead.lead}</td>
                                    <td>{lead.placement}</td>
                                    <td>{lead.view}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    <h3>Augmented Limb leads (Unipolar)</h3>
                    <div className="wave_leads-table">
                        <table>
                            <thead>
                            <tr>
                                <th>Lead</th>
                                <th>Placement (+)</th>
                                <th>View</th>
                            </tr>
                            </thead>
                            <tbody>
                            {augmented_limb_leads.map((lead) => (
                                <tr key={lead.lead.toLowerCase()}>
                                    <td>{lead.lead}</td>
                                    <td>{lead.placement}</td>
                                    <td>{lead.view}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    <h3>Precordial (Chest) Leads</h3>
                    <div className="wave_leads-table">
                        <table>
                            <thead>
                            <tr>
                                <th>Lead</th>
                                <th>Placement</th>
                                <th>View</th>
                            </tr>
                            </thead>
                            <tbody>
                            {precordial_leads.map((lead) => (
                                <tr key={lead.lead.toLowerCase()}>
                                    <td>{lead.lead}</td>
                                    <td>{lead.placement}</td>
                                    <td>{lead.view}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="container">
                    IMAGES
                </div>
            </div>
            <div className="container">
                <h2>RESP - Respiration</h2>

                <p>Measures chest movement or airflow</p>
                <p>Origin: Derived from impedance or airflow sensors?</p>
            </div>
            <div className="container">
                <h2>PLETH - Plethysmpgraphh</h2>

                <p>Blood volume changes with each heartbeat</p>
                <p>Origin: Pulse oximeter</p>
            </div>
            <div className="container">
                <h2>ETCO2 - End-Tidal CO2</h2>

                <p>Measures exhaled CO2 at the end of a breath</p>
            </div>
            <div className="container">
                <h2>ART - Arterial Line Pressure</h2>

                <p>Higher precision Systolic, Diastolic, and Mean readings than ABP.</p>
                <p>Origin: Invasive arterial blood pressure</p>
            </div>
            <div className="container">
                <h2>ICP - Intracranial Pressure</h2>

                <p>Pressure inside the skull</p>
                <p>Origin: Sensors</p>
            </div>
            <div className="container">
                <h2>CVP</h2>
                <p>Pressure in the thoracic vena cava</p>

                <p>Origin: Invasive and often used with central lines</p>
            </div>
            <div className="container">
                <h2>ABP - Arterial Blood Pressure</h2>
                <p>Systolic/Diastolic/Mean</p>

                <p>Origin: Non invasive arterial blood pressure</p>
            </div>
            <div className="container">
                <h2>SpO2 - Oxygen Situation</h2>
                <p>Precent of oxygenated hemoglobin</p>
                <p> Origin: Pulse oximeter</p>
            </div>
        </div>
    );
};
