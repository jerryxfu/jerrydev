import type {commonTreatment, SymptomIds} from "./symptoms.ts";
import type {Contexts} from "./context.ts";

export type Condition = {
    id: string;
    label: string;
    description?: string;
    /** Must have at least one of these symptoms */
    primarySymptoms: SymptomIds[];
    /** Having more of these increases confidence */
    supportingSymptoms?: SymptomIds[];
    /** If any of these are present, reduce likelihood */
    excludingSymptoms?: SymptomIds[];
    /** Contexts that make this condition more likely */
    relevantContexts?: Contexts[];
    riskFactors?: string[];
    immediateActions?: (commonTreatment | string)[];
    recommendedActions: (commonTreatment | string)[];
    medication?: (commonTreatment | string)[];
    monitorFor: (SymptomIds | string)[];
};

export const conditions: Condition[] = [
    {
        id: "myocardial_infarction",
        label: "Myocardial Infarction (Heart Attack)",
        description: "A serious condition caused by sudden blockage of blood flow to the heart muscle, requiring immediate medical attention.",
        primarySymptoms: ["chest_pain", "chest_pressure", "left_arm_pain"],
        supportingSymptoms: ["jaw_pain", "shortness_of_breath", "neck_pain", "diaphoresis", "nausea", "vomiting", "lightheadedness"],
        recommendedActions: [
            "Call emergency services immediately",
            "Chew aspirin if not allergic and instructed by medical personnel",
            "Rest and avoid exertion until help arrives"
        ],
        monitorFor: [
            "worsening chest pain",
            "loss of consciousness",
            "severe shortness of breath"
        ]
    },
    {
        id: "dehydration",
        label: "Dehydration",
        description: "Not enough fluid in the body leading to reduced blood volume. Presents with dizziness, dry mouth, decreased urine output, and sometimes rapid heartbeat.",
        primarySymptoms: ["dizziness", "lightheadedness"],
        supportingSymptoms: ["fatigue", "headache", "nausea"],
        excludingSymptoms: ["fever"],
        riskFactors: ["prolonged exercise", "fever", "vomiting/diarrhea", "inadequate fluid intake"],
        recommendedActions: [
            "Sip small amounts of water or electrolyte solution frequently",
            "Rest in a cool, shaded place"
        ],
        medication: ["pain relief (acetaminophen, Tylenol)", "NSAIDs (ibuprofen, Advil, Motrin, aspirin)"],
        monitorFor: ["persistent dizziness", "decreased urine output", "confusion"]
    },
    {
        id: "hypotension",
        label: "Low Blood Pressure (Hypotension)",
        description: "A drop in blood pressure causing dizziness, fatigue, and fainting.",
        primarySymptoms: ["lightheadedness", "dizziness", "syncope"],
        supportingSymptoms: ["blurred_vision", "nausea", "fatigue"],
        recommendedActions: [
            "Lie down and elevate legs",
            "Drink fluids",
            "Avoid sudden standing"
        ],
        monitorFor: ["fainting", "confusion", "chest pain"]
    },
    {
        id: "stroke",
        label: "Stroke",
        description: "Interruption of blood flow to the brain. Look for sudden speech difficulty, facial droop, weakness on one side, or vision changes.",
        primarySymptoms: ["difficulty_speaking", "confusion", "vision_loss", "numbness"],
        supportingSymptoms: ["loss_of_balance", "headache", "dizziness"],
        riskFactors: ["atrial fibrillation", "high cholesterol", "age > 55"],
        recommendedActions: [
            "Call emergency services immediately (note time of onset)",
            "Keep patient safe and lying flat"
        ],
        monitorFor: ["worsening weakness", "level of consciousness", "unequal pupils"]
    },
    {
        id: "appendicitis",
        label: "Appendicitis",
        description: "Inflammation of the appendix causing sharp right lower abdominal pain, often with nausea and low-grade fever.",
        primarySymptoms: ["abdominal_pain"],
        supportingSymptoms: ["nausea", "vomiting", "loss_of_appetite", "fever"],
        excludingSymptoms: ["diarrhea"],
        riskFactors: ["age 10–30", "male sex"],
        recommendedActions: [
            "Seek immediate surgical evaluation",
            "Do not eat or drink until seen by a doctor"
        ],
        monitorFor: ["worsening pain", "inability to pass gas", "rising fever"]
    },
    {
        id: "pneumonia",
        label: "Pneumonia",
        description: "Infection of the lung tissue, presenting with fever, productive cough, chest pain, and shortness of breath.",
        primarySymptoms: ["fever", "cough"],
        supportingSymptoms: ["shortness_of_breath", "chest_pain", "fatigue", "chills"],
        riskFactors: ["age > 65", "smoking", "chronic lung disease"],
        recommendedActions: [
            "See a healthcare provider within 24 hours",
            "Stay hydrated and rest"
        ],
        monitorFor: ["increased breathing difficulty", "chest pain", "persistent high fever"]
    },
    {
        id: "urinary_tract_infection",
        label: "Urinary Tract Infection (UTI)",
        description: "Bacterial infection of urinary tract. Look for burning on urination, urgency/frequency, and possible blood in urine.",
        primarySymptoms: ["hematuria"],
        supportingSymptoms: ["fever", "abdominal_pain"],
        riskFactors: ["female sex", "recent catheterization", "history of UTIs"],
        recommendedActions: [
            "Increase fluids to flush bacteria",
            "Urinate regularly to relieve discomfort"
        ],
        monitorFor: ["development of fever", "flank pain", "worsening urgency"]
    },
    {
        id: "anaphylaxis",
        label: "Anaphylaxis",
        description: "Severe, rapid allergic reaction causing airway swelling, hypotension, hives, and possible collapse.",
        primarySymptoms: ["rash", "shortness_of_breath"],
        supportingSymptoms: ["palpitations", "dizziness", "nausea", "syncope"],
        riskFactors: ["known severe allergy", "previous anaphylaxis"],
        recommendedActions: [
            "Administer epinephrine auto-injector immediately",
            "Call emergency services"
        ],
        monitorFor: ["airway swelling", "drop in blood pressure", "worsening breathing"]
    },
    {
        id: "migraine",
        label: "Migraine",
        description: "Recurrent moderate-to-severe headache often with nausea, light sensitivity, or visual aura.",
        primarySymptoms: ["headache"],
        supportingSymptoms: ["nausea", "blurred_vision", "dizziness"],
        excludingSymptoms: ["fever"],
        riskFactors: ["family history of migraine", "stress", "sleep disturbance"],
        recommendedActions: [
            "Move to a dark, quiet room",
            "Apply a cold compress to your head"
        ],
        monitorFor: ["vision changes", "weakness", "worsening headache"]
    },
    {
        id: "vasovagal_syncope",
        label: "Vasovagal Syncope",
        description: "Fainting caused by sudden drop in heart rate and blood pressure.",
        primarySymptoms: ["lightheadedness", "dizziness", "syncope"],
        supportingSymptoms: ["nausea", "diaphoresis", "blurred_vision"],
        excludingSymptoms: ["chest_pain", "palpitations"],
        recommendedActions: [
            "Lie down with legs elevated",
            "Avoid triggers like stress or prolonged standing"
        ],
        monitorFor: ["repeat fainting episodes", "injuries due to falls"]
    }
];
