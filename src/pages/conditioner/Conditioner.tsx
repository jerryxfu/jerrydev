import "./Conditioner.scss";
import {Checkbox, FormControlLabel, FormGroup} from "@mui/material";
import BpSelector, {type BloodPressure} from "./components/BpSelector.tsx";
import CategoryDropdown from "./components/CategoryDropdown.tsx";
import {useEffect, useState} from "react";
import {type Symptom, symptoms} from "./symptoms.ts";
import {evaluateConditions, type TriageInput, type TriageResult} from "./triageEngine.ts";
import {conditions} from "./conditions.ts";
import {type Contexts, contexts} from "./context.ts";

export type FormData = Record<string, boolean>;
export type ContextData = Record<string, boolean>;

export type bgBlink = "red" | "yellow" | "green" | null;

const checkboxStyles = {
    padding: "2px",
    "& .MuiSvgIcon-root": {
        fontSize: "0.85rem"
    },
    margin: "0px",
    "& + .MuiFormControlLabel-label": {
        fontSize: "0.80rem",
        marginLeft: "2px"
    }
};

const symptomsByCategory = symptoms.reduce((acc, symptom) => {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR_assignment
    symptom.categories.forEach(category => {
        (acc[category] ||= []).push(symptom);
    });
    return acc;
}, {} as Record<string, Symptom[]>);


export default function Conditioner() {
    const initialFormData: FormData = symptoms.reduce((acc, symptom) => {
        acc[symptom.id] = false;
        return acc;
    }, {} as FormData);

    const initialContextData: ContextData = contexts.reduce((acc, context) => {
        acc[context] = false;
        return acc;
    }, {} as ContextData);

    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [contextData, setContextData] = useState<ContextData>(initialContextData);
    const [bpFlash, setBpFlash] = useState<bgBlink>(null);
    const [triageResults, setTriageResults] = useState<TriageResult>([]);

    function setSymptom(symptomId: string, present: boolean) {
        setFormData(prev => ({
            ...prev,
            [symptomId]: present,
        }));
    }

    function setContext(context: Contexts, present: boolean) {
        setContextData(prev => ({
            ...prev,
            [context]: present,
        }));
    }

    useEffect(() => {
        const selectedSymptoms = Object.entries(formData)
            .filter(([_, present]) => present)
            .map(([symptomId]) => symptomId);

        const activeContexts = Object.entries(contextData)
            .filter(([_, active]) => active)
            .map(([label]) => label as Contexts);

        const input: TriageInput = {
            selectedSymptoms,
            activeContexts,
        };

        const result = evaluateConditions(input, conditions);
        setTriageResults(result);
    }, [formData, contextData, conditions]);


    const [bloodPressure, setBloodPressure] = useState<BloodPressure>({
        systolic: null,
        diastolic: null,
        systolicIndex: null,
        diastolicIndex: null
    });

    useEffect(() => {
        // 1 based index?
        if (!bloodPressure.systolicIndex || !bloodPressure.diastolicIndex) {
            return;
        } else if (bloodPressure.diastolicIndex <= 3
            || bloodPressure.systolicIndex <= 3
            || bloodPressure.diastolicIndex >= 11
            || bloodPressure.systolicIndex >= 11
        ) {
            setBpFlash("red");
        } else if (
            bloodPressure.diastolicIndex <= 5
            || bloodPressure.systolicIndex <= 5
            || bloodPressure.diastolicIndex >= 10
            || bloodPressure.systolicIndex >= 10
        ) {
            setBpFlash("yellow");
        } else {
            setBpFlash(null);
        }
    }, [bloodPressure]);

    return (<div className="app layout-column">
        <div className="layout-row">
            <div className="layout-column">
                <div className="container">
                    <h2>Symptoms</h2>
                    {Object.entries(symptomsByCategory).map(([category, categorySymptoms]) => {
                        const commonSymptoms = categorySymptoms.filter(symptom => symptom._meta?.quickAccessDisplay);
                        const regularSymptoms = categorySymptoms.filter(symptom => !symptom._meta?.quickAccessDisplay);

                        return (<CategoryDropdown
                            key={category}
                            header={`${category.charAt(0).toUpperCase()}${category.slice(1)} [${commonSymptoms.length}+${regularSymptoms.length}]`}
                            persistent={<FormGroup
                                sx={{display: "flex", flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", width: "100%"}}>
                                {commonSymptoms.map(({id, label}) => (
                                    <FormControlLabel
                                        key={id} label={label}
                                        control={
                                            <Checkbox
                                                size="small"
                                                sx={checkboxStyles}
                                                checked={formData[id]}
                                                onChange={(e) => setSymptom(id, e.target.checked)}
                                            />
                                        }
                                    />
                                ))}
                            </FormGroup>}>
                            <FormGroup sx={{display: "flex", flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", width: "100%"}}>
                                {regularSymptoms.map(({id, label}) => (
                                    <FormControlLabel
                                        key={id} label={label}
                                        control={
                                            <Checkbox
                                                size="small"
                                                sx={checkboxStyles}
                                                checked={formData[id]}
                                                onChange={(e) => setSymptom(id, e.target.checked)}
                                            />
                                        }
                                    />
                                ))}
                            </FormGroup>
                        </CategoryDropdown>);
                    })}
                </div>
                <div className="container">
                    <h2>Info</h2>
                </div>
            </div>
            <div className="layout-column">
                <div className="container" style={{alignItems: "flex-end"}}>
                    <h2>Vitals</h2>

                    <BpSelector
                        className={bpFlash === "red" ? "flash-bg-r" : bpFlash === "yellow" ? "flash-bg-y" : ""}
                        onChange={setBloodPressure}
                        value={{
                            systolicIndex: bloodPressure.systolicIndex,
                            diastolicIndex: bloodPressure.diastolicIndex
                        }}
                    />
                </div>
                <div className="container context" style={{alignItems: "flex-end"}}>
                    <h2>Context</h2>
                    <FormGroup
                        sx={{display: "flex", flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", width: "100%"}}
                        className="context-checkbox-container">
                        {contexts.map((label) => (
                            <FormControlLabel
                                key={label.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}
                                label={label}
                                control={
                                    <Checkbox
                                        size="small"
                                        sx={checkboxStyles}
                                        checked={contextData[label]}
                                        onChange={(e) => setContext(label, e.target.checked)}
                                    />
                                }
                            />
                        ))}
                    </FormGroup>
                </div>
            </div>
        </div>
        <div className="container">
            WEIGHTS ARE VERY POORLY ADJUSTED, RESULTS ARE LIKELY TO BE WRONG
            <p>Symptoms Selected: {Object.entries(formData).filter(([_, value]) => value).length}</p>
            {bloodPressure.systolic && bloodPressure.diastolic && (
                <div>Selected BP: {bloodPressure.systolic}/{bloodPressure.diastolic}</div>
            )}
            {triageResults.length > 0 && (
                <div>
                    <h3>Triage Results</h3>
                    <ul>
                        {triageResults
                            .filter(result => result.score > 0.1)
                            .map((result) => (
                                <li key={result.conditionId}>
                                    <strong>{result.label}</strong>: Score {result.score.toFixed(3)}
                                </li>
                            ))
                        }
                    </ul>
                </div>
            )}
        </div>
        <div className="container">
            <h2>Shortcuts</h2>

            <a href="snapchat://">Open Snapchat</a>
            <a href="snapchat://chat/jerryxfu">Snapchat to Jerry</a>
            <a href="instagram://">Open Instagram</a>
            <a href="instagram://direct_v2">Open Instagram DMs</a>

            *Dialing will usually not automatically call
            <a href="tel:14382258853" className="text-underline">Dial Jerry</a>
            {/*<a href="tel:911">Dial 9-1-1</a>*/}
            <a className="text-underline">Dial 9-1-1 (disabled during development)</a>
        </div>
    </div>);
}