import type {commonTreatment, SymptomIds} from "./symptoms.ts";
import type {Contexts} from "./context.ts";

export type Condition = {
    id: string;
    label: string;
    description?: string;
    rule: RuleNode;
    contextBonus?: {
        contextLabel: Contexts;
        bonus: number;
    }[];
    riskFactors?: string[];
    immediateActions?: (commonTreatment | string)[];
    recommendedActions: (commonTreatment | string)[];
    medication?: (commonTreatment | string)[];
    monitorFor: (SymptomIds | string)[];
};

export type RuleNode =
    | { type: "SYMPTOM"; symptomId: SymptomIds, weight?: number } // must have this symptom
    | { type: "OR"; rules: RuleNode[], weight?: number }      // any of these rules is true
    | { type: "AND"; rules: RuleNode[], weight?: number }     // all of these rules are true
    | { type: "XOR"; rules: RuleNode[], weight?: number }     // only one of these is true
    | { type: "NOT"; rule: RuleNode, weight?: number }        // this rule must NOT be true
    | { type: "NAND"; rules: RuleNode[], weight?: number }    // not all of these are true
    | { type: "NOR"; rules: RuleNode[], weight?: number }     // none of these are true
    | { type: "IMPLIES"; if: RuleNode; then: RuleNode, weight?: number } // if A, then B (B must be true if A is)
    | { type: "ADD"; rules: RuleNode[], weight?: number }     // additive scoring for multiple symptoms

export const conditions: Condition[] = [
    {
        id: "myocardial_infarction",
        label: "Myocardial Infarction (Heart Attack)",
        description: "A serious condition caused by sudden blockage of blood flow to the heart muscle, requiring immediate medical attention.",
        rule: {
            type: "OR",
            weight: 1.25,
            rules: [
                {
                    type: "OR",
                    weight: 1.19,
                    rules: [
                        {type: "SYMPTOM", symptomId: "chest_pain", weight: 1},
                        {type: "SYMPTOM", symptomId: "chest_pressure", weight: 1},
                        {type: "SYMPTOM", symptomId: "left_arm_pain", weight: 0.9},
                        {type: "SYMPTOM", symptomId: "jaw_pain", weight: 0.8},
                    ]
                },
                {
                    type: "AND",
                    weight: 1.19,
                    rules: [
                        {
                            type: "OR",
                            weight: 1,
                            rules: [
                                {type: "SYMPTOM", symptomId: "left_arm_pain", weight: 1},
                                {type: "SYMPTOM", symptomId: "jaw_pain", weight: 1},
                                {type: "SYMPTOM", symptomId: "shortness_of_breath", weight: 0.9},
                                {type: "SYMPTOM", symptomId: "neck_pain", weight: 0.8},
                                {type: "SYMPTOM", symptomId: "chest_pressure", weight: 0.5},
                            ]
                        },
                        {
                            type: "NOT",
                            weight: 0.1,
                            rule: {type: "SYMPTOM", symptomId: "chest_pain", weight: 1},
                        }
                    ]
                },
                {
                    type: "AND",
                    weight: 1,
                    rules: [
                        {type: "SYMPTOM", symptomId: "diaphoresis", weight: 1},
                        {type: "SYMPTOM", symptomId: "nausea", weight: 1},
                        {type: "SYMPTOM", symptomId: "vomiting", weight: 1},
                        {type: "SYMPTOM", symptomId: "lightheadedness", weight: 1}
                    ]
                }
            ]
        },
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
        description:
            "Not enough fluid in the body leading to reduced blood volume. Presents with dizziness, dry mouth, decreased urine output, and sometimes rapid heartbeat.",
        rule: {
            type: "AND",
            weight: 1,
            rules: [
                {
                    type: "OR",
                    weight: 0.8,
                    rules: [
                        {type: "SYMPTOM", symptomId: "dizziness", weight: 1},
                        {type: "SYMPTOM", symptomId: "lightheadedness", weight: 1}
                    ]
                },

                {type: "SYMPTOM", symptomId: "vomiting", weight: 0.5},
                {type: "SYMPTOM", symptomId: "fatigue", weight: 0.3}
            ]
        },
        riskFactors: ["prolonged exercise", "fever", "vomiting/diarrhea", "inadequate fluid intake"],
        recommendedActions: [
            "sip small amounts of water or electrolyte solution frequently",
            "rest in a cool, shaded place",
        ],
        medication: ["pain relief (acetaminophen, Tylenol)", "NSAIDs (ibuprofen, Advil, Motrin, aspirin)"],
        monitorFor: ["persistent dizziness", "decreased urine output", "confusion"]
    },
    {
        id: "hypotension",
        label: "Low Blood Pressure (Hypotension)",
        description: "A drop in blood pressure causing dizziness, fatigue, and fainting.",
        rule: {
            type: "AND",
            rules: [
                {
                    type: "OR",
                    weight: 1.45,
                    rules: [
                        {type: "SYMPTOM", symptomId: "lightheadedness", weight: 1.0},
                        {type: "SYMPTOM", symptomId: "dizziness", weight: 0.96},
                        {type: "SYMPTOM", symptomId: "syncope", weight: 0.8},
                    ]
                },
                {
                    type: "OR",
                    weight: 0.35,
                    rules: [
                        {type: "SYMPTOM", symptomId: "blurred_vision", weight: 0.6},
                        {type: "SYMPTOM", symptomId: "nausea", weight: 0.4},
                        {type: "SYMPTOM", symptomId: "fatigue", weight: 0.25}
                    ]
                }
            ]
        },
        recommendedActions: [
            "Lie down and elevate legs",
            "Drink fluids",
            "Avoid sudden standing"
        ],
        monitorFor: [
            "fainting",
            "confusion",
            "chest pain"
        ]
    },
    {
        id: "stroke",
        label: "Stroke",
        description:
            "Interruption of blood flow to the brain. Look for sudden speech difficulty, facial droop, weakness on one side, or vision changes.",
        rule: {
            type: "OR",
            weight: 1.0,
            rules: [
                {type: "SYMPTOM", symptomId: "difficulty_speaking", weight: 1.0},
                {type: "SYMPTOM", symptomId: "confusion", weight: 1.0},
                {type: "SYMPTOM", symptomId: "vision_loss", weight: 1.0},
                {
                    type: "AND",
                    weight: 0.9,
                    rules: [
                        {type: "SYMPTOM", symptomId: "numbness", weight: 1.0},
                        {type: "SYMPTOM", symptomId: "loss_of_balance", weight: 1.0}
                    ]
                }
            ]
        },
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
        description:
            "Inflammation of the appendix causing sharp right lower abdominal pain, often with nausea and low‑grade fever.",
        rule: {
            // type: "AND",
            // weight: 1.0,
            // rules: [
            //     {type: "SYMPTOM", symptomId: "abdominal_pain", weight: 1.0},
            //     {
            //         type: "OR",
            //         weight: 0.8,
            //         rules: [
            //             {type: "SYMPTOM", symptomId: "nausea", weight: 0.7},
            //             {type: "SYMPTOM", symptomId: "vomiting", weight: 0.7}
            //         ]
            //     },
            //     {
            //         type: "OR",
            //         weight: 0.5,
            //         rules: [
            //             {type: "SYMPTOM", symptomId: "fever", weight: 0.6},
            //             {type: "SYMPTOM", symptomId: "chills", weight: 0.5}
            //         ]
            //     }
            // ]
            type: "AND",
            rules: [
                {type: "SYMPTOM", symptomId: "abdominal_pain", weight: 1.0},

                {
                    type: "OR",
                    weight: 0.7,
                    rules: [
                        {type: "SYMPTOM", symptomId: "nausea", weight: 0.6},
                        {type: "SYMPTOM", symptomId: "vomiting", weight: 0.6},
                        {type: "SYMPTOM", symptomId: "loss_of_appetite", weight: 0.5}
                    ]
                },

                {
                    type: "OR",
                    weight: 0.4,
                    rules: [
                        {type: "SYMPTOM", symptomId: "fever", weight: 0.5}
                    ]
                },
                {
                    type: "NOT",
                    weight: 0.4,
                    rule: {type: "SYMPTOM", symptomId: "diarrhea"}
                }
            ]

        },
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
        description:
            "Infection of the lung tissue, presenting with fever, productive cough, chest pain, and shortness of breath.",
        rule: {
            type: "AND",
            weight: 1.0,
            rules: [
                {type: "SYMPTOM", symptomId: "fever", weight: 1.0},
                {type: "SYMPTOM", symptomId: "cough", weight: 1.0},
                {type: "SYMPTOM", symptomId: "shortness_of_breath", weight: 0.9}
            ]
        },
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
        description:
            "Bacterial infection of urinary tract. Look for burning on urination, urgency/frequency, and possible blood in urine.",
        rule: {
            type: "AND",
            weight: 1.0,
            rules: [
                {
                    type: "OR",
                    weight: 0.8,
                    rules: [
                        {type: "SYMPTOM", symptomId: "hematuria", weight: 0.7}
                    ]
                }
            ]
        },
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
        description:
            "Severe, rapid allergic reaction causing airway swelling, hypotension, hives, and possible collapse.",
        rule: {
            type: "AND",
            weight: 1.0,
            rules: [
                {type: "SYMPTOM", symptomId: "rash", weight: 1.0},
                {type: "SYMPTOM", symptomId: "shortness_of_breath", weight: 1.0},
                {type: "SYMPTOM", symptomId: "palpitations", weight: 0.8}
            ]
        },
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
        description:
            "Recurrent moderate‑to‑severe headache often with nausea, light sensitivity, or visual aura.",
        rule: {
            type: "AND",
            weight: 1.0,
            rules: [
                {type: "SYMPTOM", symptomId: "headache", weight: 1.0},
                {
                    type: "OR",
                    weight: 0.7,
                    rules: [
                        {type: "SYMPTOM", symptomId: "nausea", weight: 0.8}
                    ]
                }
            ]
        },
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
        rule: {
            type: "AND",
            weight: 1,
            rules: [
                {
                    type: "OR",
                    weight: 0.9,
                    rules: [
                        {type: "SYMPTOM", symptomId: "lightheadedness", weight: 0.9},
                        {type: "SYMPTOM", symptomId: "dizziness", weight: 0.85}
                    ]
                },
                {
                    type: "OR",
                    weight: 0.7,
                    rules: [
                        {type: "SYMPTOM", symptomId: "nausea", weight: 0.6}
                    ]
                }
            ]
        },
        recommendedActions: [
            "Lie down with legs elevated",
            "Avoid triggers like stress or prolonged standing"
        ],
        monitorFor: [
            "repeat fainting episodes",
            "injuries due to falls"
        ]
    }
];
