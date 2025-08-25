export type Category =
    | "constitutional"  // whole-body symptoms (e.g., fatigue, fever)
    | "respiratory"     // lungs and breathing
    | "gastrointestinal"// digestion and GI tract
    | "neurological"    // brain, nerves, coordination
    | "cardiovascular"  // heart and circulation
    | "musculoskeletal" // muscles, bones, joints
    | "psychiatric"     // mood, behavior, mental health
    | "dermatological"  // skin, hair, nails
    | "genitourinary"   // urinary and reproductive systems

export type commonTreatment =
    "rest"
    | "hydration"
    | "hydration (sips)"
    | "nutrition"
    | "eat"
    | "eat small meals"
    | "antihistamine (Benadryl)"
    | "eat bland food"
    | "pain relief (acetaminophen, Tylenol)"
    | "antacids"
    | "antibiotics"
    | "antipyretics (acetaminophen, NSAIDs)"
    | "NSAIDs (ibuprofen, Advil, Motrin, aspirin)"
    | "corticosteroids"
    | "ensure safety"
    | "loosen clothing"
    | "recovery position"
    | "stop activity"
    | "aspirin"
    | "sit or lie down"
    | "sit up"
    | "lie down"
    | "avoid lying flat"
    | "lie down with legs elevated"
    | "call emergency services"
    | "call emergency services if over 1 minute"
    | "call emergency services if over 5 minutes"
    | "call emergency services if severe"
    | "call emergency services if injured"
    | "address underlying cause";

export type SymptomIds = typeof symptoms[number]["id"];

export type Symptom = {
    id: string;
    label: string;
    categories: Category[];
    description: string;
    // "any" means the symptom may appear in any of the following forms, not that it's unknown
    severity: "any" | ("mild" | "moderate" | "severe")[];
    duration: "any" | ("acute" | "chronic" | "intermittent")[];
    onset: "any" | "sudden" | "gradual";
    immediateRedFlag: boolean;
    priority: number;
    _meta: {
        quickAccessDisplay: boolean;
    };
    contagious: boolean;
    riskFactors: string[];
    complications: string[];
    immediateActions?: (commonTreatment | string)[]; // what to do immediately to avoid worsening
    treatments: (commonTreatment | string)[]; // what to do to treat the symptom (default: address underlying cause)
    additionalInfo?: string;
    origin?: ("infectious" | "autoimmune" | "trauma" | "cancer")[];
};

/*
    text list for quick copying:
    - abdominal pain
    - chest pain
    - chills
    - confusion
    - cough
    - cyanosis
    - difficulty speaking
    - dizziness
    - fatigue
    - fever
    - headache
    - hematuria
    - hemoptysis
    - joint pain
    - lightheadedness
    - leg swelling
    - loss of balance
    - menstrual pain
    - nausea
    - numbness
    - palpitations
    - rash
    - seizure
    - shortness of breath
    - rectal bleeding
    - runny nose
    - vertigo
    - vision loss (sudden)
    - vomiting
 */
export const symptoms: Symptom[] = [
    {

        id: "princess_attitude",
        label: "Princess attitude",
        categories: ["constitutional"],
        description: "A persistent attitude of entitlement.",
        severity: ["severe"],
        duration: ["chronic"],
        onset: "sudden",
        immediateRedFlag: false,
        priority: 1,
        _meta: {quickAccessDisplay: false},
        contagious: true,
        riskFactors: ["being a princess"],
        treatments: [""],
        complications: ["spoiled behavior", "entitlement"],
        additionalInfo: "DO NOT CONSIDER DURING TRIAGE, this is a joke."
    },
    {
        id: "abdominal_pain",
        label: "Abdominal Pain",
        categories: ["gastrointestinal", "genitourinary"],
        description: "Pain or discomfort in the abdomen, may be localized or diffuse, sharp or dull.",
        severity: ["mild", "moderate", "severe"],
        duration: "any",
        onset: "any",
        immediateRedFlag: false,
        priority: 2,
        _meta: {quickAccessDisplay: true},
        contagious: false,
        riskFactors: ["dietary habits", "infections", "previous surgeries"],
        complications: ["appendicitis", "bowel obstruction", "pelvic inflammatory disease"],
        treatments: ["pain relief (acetaminophen, Tylenol)", "antacids", "hydration"],
        additionalInfo: "Consider gynecological and urinary causes in females.",
        origin: ["infectious", "trauma"]
    },
    {
        id: "chest_pain",
        label: "Chest Pain",
        categories: ["cardiovascular", "respiratory"],
        description: "A sensation of pressure, tightness, or burning in the chest that may radiate to the neck, jaw, or arms.",
        severity: ["mild", "moderate", "severe"],
        duration: ["acute", "intermittent"],
        onset: "sudden",
        immediateRedFlag: true,
        priority: 1,
        _meta: {quickAccessDisplay: false},
        contagious: false,
        riskFactors: ["hypertension", "smoking", "high cholesterol", "family history of heart disease"],
        complications: ["myocardial infarction", "cardiac arrest", "heart failure"],
        immediateActions: ["sit or lie down", "aspirin", "nitroglycerin (if prescribed)", "call emergency services"],
        treatments: ["address underlying cause"],
        origin: ["trauma", "cancer"]
    },
    {
        id: "chills",
        label: "Chills",
        categories: ["constitutional"],
        description: "A feeling of coldness often accompanied by shivering.",
        severity: ["mild", "moderate"],
        duration: ["acute"],
        onset: "sudden",
        immediateRedFlag: false,
        priority: 2,
        _meta: {quickAccessDisplay: false},
        contagious: false,
        riskFactors: ["infection", "cold exposure"],
        complications: ["fever", "sepsis (if severe infection)"],
        immediateActions: ["warmth (blankets, warm fluids)", "monitor temperature"],
        treatments: ["antipyretics (if fever present)", "address underlying cause"],
        origin: ["infectious"]
    },
    {
        id: "confusion",
        label: "Confusion",
        categories: ["neurological", "psychiatric", "constitutional"],
        description: "A sudden change in awareness, memory, or ability to think clearly.",
        severity: ["moderate", "severe"],
        duration: ["acute"],
        onset: "sudden",
        immediateRedFlag: true,
        priority: 1,
        _meta: {quickAccessDisplay: false},
        contagious: false,
        riskFactors: ["stroke", "infection", "medication side effects", "low blood sugar"],
        complications: ["falls", "inability to communicate", "seizures"],
        immediateActions: ["ensure safety", "check blood sugar", "monitor vital signs"],
        treatments: ["address underlying cause", "rehydration", "nutritional support"],
        origin: ["trauma", "infectious", "autoimmune"]
    },
    {
        id: "cough",
        label: "Cough",
        categories: ["respiratory"],
        description: "A reflex to clear the airways of mucus or irritants.",
        severity: ["mild", "moderate", "severe"],
        duration: ["acute", "intermittent"],
        onset: "any",
        immediateRedFlag: false,
        priority: 2,
        _meta: {quickAccessDisplay: false},
        contagious: true,
        riskFactors: ["cold", "flu", "asthma", "smoking"],
        complications: ["sore throat", "rib strain", "pneumonia"],
        treatments: ["cough suppressants (dextromethorphan)", "expectorants (guaifenesin)", "hydration", "honey (if over 1 y/o)"],
        origin: ["infectious"]
    },
    {
        id: "cyanosis",
        label: "Bluish lips or fingertips",
        categories: ["cardiovascular", "respiratory"],
        description: "A bluish discoloration of the skin due to low oxygen levels.",
        severity: ["moderate", "severe"],
        duration: ["acute"],
        onset: "sudden",
        immediateRedFlag: true,
        priority: 1,
        _meta: {quickAccessDisplay: false},
        contagious: false,
        riskFactors: ["COPD", "asthma", "pulmonary embolism", "heart disease"],
        complications: ["hypoxia", "organ failure"],
        immediateActions: ["call emergency services", "administer oxygen if available", "monitor vital signs", "loosen clothing", "sit upright"],
        treatments: ["address underlying cause"],
        origin: ["infectious", "trauma"]
    },
    {
        id: "difficulty_speaking",
        label: "Difficulty speaking",
        categories: ["neurological"],
        description: "Trouble forming words or understanding language (aphasia or dysarthria).",
        severity: ["moderate", "severe"],
        duration: ["acute"],
        onset: "sudden",
        immediateRedFlag: true,
        priority: 1,
        _meta: {quickAccessDisplay: false},
        contagious: false,
        riskFactors: ["stroke", "head trauma", "brain tumor"],
        complications: ["inability to communicate", "social isolation"],
        immediateActions: ["ensure safety", "call emergency services", "note time of onset", "keep person calm", "monitor for other neurological signs"],
        treatments: ["address underlying cause"],
        origin: ["trauma", "cancer"]
    },
    {
        id: "dizziness",
        label: "Dizziness",
        categories: ["neurological", "musculoskeletal", "cardiovascular"],
        description: "A sensation of unsteadiness, imbalance, or loss of equilibrium, without a spinning sensation.",
        severity: ["mild", "moderate", "severe"],
        duration: ["acute", "intermittent"],
        onset: "any",
        immediateRedFlag: false,
        priority: 3,
        _meta: {quickAccessDisplay: true},
        contagious: false,
        riskFactors: ["inner ear disorders", "neuropathy", "stroke", "medication side effects"],
        complications: ["falls", "injury"],
        immediateActions: ["sit or lie down", "avoid sudden movements", "hydration"],
        treatments: ["eat if low blood sugar", "address underlying cause"],
        origin: ["trauma", "autoimmune"]
    },
    {
        id: "fatigue",
        label: "Fatigue",
        categories: ["constitutional", "psychiatric"],
        description: "A persistent feeling of tiredness or lack of energy not relieved by rest.",
        severity: "any",
        duration: ["chronic", "intermittent"],
        onset: "gradual",
        immediateRedFlag: false,
        priority: 4,
        _meta: {quickAccessDisplay: true},
        contagious: false,
        riskFactors: ["depression", "hypothyroidism", "chronic disease"],
        complications: ["decreased quality of life", "functional impairment"],
        treatments: ["rest", "nutrition", "sleep", "monitor other symptoms"],
        origin: []
    },
    {
        id: "fever",
        label: "Fever",
        categories: ["constitutional"],
        description: "An elevated body temperature above the normal range, usually in response to infection or inflammation.",
        severity: "any",
        duration: ["acute", "chronic"],
        onset: "gradual",
        immediateRedFlag: false,
        priority: 3,
        _meta: {quickAccessDisplay: true},
        contagious: true,
        riskFactors: ["recent infection", "immunosuppression", "travel history"],
        complications: ["sepsis", "febrile seizures"],
        treatments: ["antipyretics (acetaminophen, ibuprofen)", "hydration", "rest", "dark quiet room", "comfortable room temperature", "monitor other symptoms"],
        origin: ["infectious"]
    },
    {
        id: "headache",
        label: "Headache",
        categories: ["neurological", "psychiatric"],
        description: "Pain or discomfort in the head, scalp, or neck regions.",
        severity: ["mild", "moderate", "severe"],
        duration: ["acute", "chronic"],
        onset: "gradual",
        immediateRedFlag: false,
        priority: 4,
        _meta: {quickAccessDisplay: true},
        contagious: false,
        riskFactors: ["stress", "dehydration", "hypertension", "poor sleep"],
        complications: ["migraine aura", "medication overuse headache"],
        treatments: ["hydration", "rest", "pain relief (acetaminophen, Tylenol)", "NSAIDs (ibuprofen, Advil, Motrin, aspirin)", "avoid triggers"],
        origin: []
    },
    {
        id: "hematuria",
        label: "Blood in urine",
        categories: ["genitourinary"],
        description: "Presence of visible or microscopic blood in the urine.",
        severity: ["mild", "moderate"],
        duration: ["acute"],
        onset: "sudden",
        immediateRedFlag: true,
        priority: 2,
        _meta: {quickAccessDisplay: false},
        contagious: false,
        riskFactors: ["UTI", "kidney stones", "bladder cancer", "trauma"],
        complications: ["anemia", "obstruction"],
        treatments: ["address underlying cause", "avoid strenuous activity"],
        origin: ["trauma", "cancer"]
    },
    {
        id: "hemoptysis",
        label: "Coughing up blood",
        categories: ["respiratory"],
        description: "Expelling blood from the respiratory tract, often mixed with mucus.",
        severity: ["moderate", "severe"],
        duration: ["acute"],
        onset: "sudden",
        immediateRedFlag: true,
        priority: 1,
        _meta: {quickAccessDisplay: false},
        contagious: true,
        riskFactors: ["tuberculosis", "bronchitis", "lung cancer", "pulmonary embolism"],
        complications: ["airway obstruction", "massive bleeding"],
        immediateActions: ["call emergency services", "sit upright", "avoid lying flat", "monitor for shock"],
        treatments: ["address underlying cause"],
        origin: ["infectious", "cancer"]
    },
    {
        id: "joint_pain",
        label: "Joint pain",
        categories: ["musculoskeletal"],
        description: "Discomfort, soreness, or aching in a joint.",
        severity: ["mild", "moderate", "severe"],
        duration: ["acute", "intermittent"],
        onset: "any",
        immediateRedFlag: false,
        priority: 2,
        _meta: {quickAccessDisplay: false},
        contagious: false,
        riskFactors: ["overuse", "arthritis", "infection"],
        complications: ["reduced mobility", "joint damage"],
        treatments: ["rest", "ice", "compression", "NSAIDs (ibuprofen, Advil, Motrin, aspirin)"],
        origin: ["autoimmune", "trauma"]
    },
    {
        id: "lightheadedness",
        label: "Lightheadedness",
        categories: ["cardiovascular", "neurological", "constitutional"],
        description: "A sensation of feeling faint, woozy, or like you might pass out, often due to reduced blood flow to the brain.",
        severity: ["mild", "moderate", "severe"],
        duration: ["acute", "intermittent"],
        onset: "sudden",
        immediateRedFlag: true,
        priority: 1,
        _meta: {quickAccessDisplay: true},
        contagious: false,
        riskFactors: ["dehydration", "low blood pressure", "anemia", "heart arrhythmias", "medication side effects"],
        complications: ["fainting", "falls", "injury"],
        immediateActions: ["sit or lie down", "lie down with legs elevated"],
        treatments: ["hydration", "eat", "salt if low blood pressure"],
        origin: ["trauma", "autoimmune", "infectious"]
    },
    {
        id: "leg_swelling",
        label: "Leg swelling",
        categories: ["cardiovascular", "musculoskeletal"],
        description: "Accumulation of fluid causing swelling in one or both legs.",
        severity: ["mild", "moderate", "severe"],
        duration: ["acute", "intermittent"],
        onset: "gradual",
        immediateRedFlag: true,
        priority: 2,
        _meta: {quickAccessDisplay: false},
        contagious: false,
        riskFactors: ["deep vein thrombosis (DVT)", "heart failure", "kidney disease"],
        complications: ["PE", "skin ulcer", "infection"],
        treatments: ["elevate legs", "avoid standing for long periods", "compression stockings"],
        origin: ["trauma", "autoimmune"]
    },
    {
        id: "loss_of_balance",
        label: "Loss of balance",
        categories: ["neurological", "musculoskeletal"],
        description: "Difficulty maintaining posture or walking steadily.",
        severity: ["moderate", "severe"],
        duration: ["acute", "intermittent"],
        onset: "sudden",
        immediateRedFlag: true,
        priority: 1,
        _meta: {quickAccessDisplay: false},
        contagious: false,
        riskFactors: ["inner ear problems", "stroke", "multiple sclerosis", "intoxication"],
        complications: ["falls", "injury"],
        immediateActions: ["sit or lie down", "ensure safety", "avoid sudden movements"],
        treatments: ["address underlying cause"],
        origin: ["trauma", "autoimmune"]
    },
    {
        id: "menstrual_pain",
        label: "Menstrual Pain",
        categories: ["genitourinary"],
        description: "Cramping or aching pain in the lower abdomen related to menstruation.",
        severity: ["mild", "moderate", "severe"],
        duration: ["intermittent"],
        onset: "gradual",
        immediateRedFlag: false,
        priority: 5,
        _meta: {quickAccessDisplay: true},
        contagious: false,
        riskFactors: ["age 15-25", "family history", "endometriosis"],
        complications: ["anemia", "infertility in severe cases"],
        treatments: ["heat pad", "NSAIDs (ibuprofen, Advil, Motrin, aspirin)", "rest", "hydration", "nutrition", "comfortable room temperature"],
        origin: []
    },
    {
        id: "nausea",
        label: "Nausea",
        categories: ["gastrointestinal", "neurological"],
        description: "An uncomfortable sensation in the stomach often preceding vomiting.",
        severity: ["mild", "moderate"],
        duration: ["acute", "intermittent"],
        onset: "any",
        immediateRedFlag: false,
        priority: 4,
        _meta: {quickAccessDisplay: true},
        contagious: false,
        riskFactors: ["medications", "infection"],
        complications: ["dehydration", "electrolyte imbalance"],
        treatments: ["hydration (sips)", "eat bland foods", "ginger or peppermint"],
        origin: []
    },
    {
        id: "numbness",
        label: "Tingling or numbness",
        categories: ["neurological"],
        description: "A pins-and-needles feeling or loss of sensation.",
        severity: ["mild", "moderate", "severe"],
        duration: ["acute", "intermittent"],
        onset: "sudden",
        immediateRedFlag: true,
        priority: 1,
        _meta: {quickAccessDisplay: true},
        contagious: false,
        riskFactors: ["nerve compression", "stroke", "diabetes"],
        complications: ["loss of function", "falls"],
        immediateActions: ["call emergency services if facial", "stop activity"],
        treatments: ["address underlying cause"],
        origin: ["trauma", "autoimmune"]
    },
    {
        id: "palpitations",
        label: "Heart palpitations",
        categories: ["cardiovascular", "constitutional"],
        description: "A sensation of rapid, fluttering, or pounding heartbeat.",
        severity: ["mild", "moderate", "severe"],
        duration: ["acute", "intermittent"],
        onset: "sudden",
        immediateRedFlag: true,
        priority: 1,
        _meta: {quickAccessDisplay: false},
        contagious: false,
        riskFactors: ["stress", "caffeine", "arrhythmias", "anemia"],
        complications: ["fainting", "stroke (if arrhythmia)", "cardiac arrest (rare)"],
        immediateActions: ["sit or lie down", "breathe slowly", "monitor for other symptoms"],
        treatments: ["address underlying cause"],
        origin: ["trauma"]
    },
    {
        id: "rash",
        label: "Skin Rash",
        categories: ["dermatological"],
        description: "An area of irritated or swollen skin, often red and itchy.",
        severity: ["mild", "moderate", "severe"],
        duration: "any",
        onset: "any",
        immediateRedFlag: false,
        priority: 5,
        _meta: {quickAccessDisplay: false},
        contagious: true,
        riskFactors: ["allergies", "autoimmune disorders", "contact with irritants"],
        complications: ["infection", "scarring"],
        treatments: ["antihistamine (Benadryl)", "cool compresses", "corticosteroids", "avoid irritants"],
        origin: ["infectious", "autoimmune"]
    },
    {
        id: "seizure",
        label: "Seizure",
        categories: ["neurological"],
        description: "A sudden, uncontrolled electrical disturbance in the brain that may cause convulsions, loss of consciousness, or unusual behavior.",
        severity: ["moderate", "severe"],
        duration: ["acute"],
        onset: "sudden",
        immediateRedFlag: true,
        priority: 1,
        _meta: {quickAccessDisplay: true},
        contagious: false,
        riskFactors: ["epilepsy", "head trauma", "fever", "alcohol withdrawal", "brain tumor"],
        complications: ["injury", "status epilepticus", "aspiration"],
        immediateActions: ["ensure safety", "call emergency services if over 5 minutes", "do not restrain", "do not put anything in mouth", "recovery position", "note duration of onset"],
        treatments: ["address underlying cause"],
        origin: ["trauma", "cancer", "autoimmune"]
    },
    {
        id: "shortness_of_breath",
        label: "Shortness of breath",
        categories: ["respiratory", "cardiovascular"],
        description: "Feeling unable to get enough air, difficulty breathing, or rapid breathing.",
        severity: ["moderate", "severe"],
        duration: ["acute", "chronic"],
        onset: "sudden",
        immediateRedFlag: true,
        priority: 1,
        _meta: {quickAccessDisplay: true},
        contagious: false,
        riskFactors: ["asthma", "COPD", "heart failure", "smoking"],
        complications: ["respiratory failure", "pulmonary embolism"],
        immediateActions: ["sit upright", "avoid lying flat", "loosen clothing", "call emergency services if severe"],
        additionalInfo: "Urgent evaluation for severe or sudden onset.",
        treatments: ["address underlying cause"],
        origin: ["autoimmune", "cancer"]
    },
    {
        id: "rectal_bleeding",
        label: "Rectal bleeding",
        categories: ["gastrointestinal"],
        description: "Blood visible in stool or on toilet paper.",
        severity: ["mild", "moderate", "severe"],
        duration: ["acute", "intermittent"],
        onset: "sudden",
        immediateRedFlag: true,
        priority: 2,
        _meta: {quickAccessDisplay: false},
        contagious: false,
        riskFactors: ["hemorrhoids", "anal fissure", "colorectal cancer", "IBD"],
        complications: ["anemia", "shock (if severe)"],
        immediateActions: ["avoid straining"],
        treatments: ["address underlying cause"],
        origin: ["cancer", "autoimmune"]
    },
    {
        id: "runny_nose",
        label: "Runny nose",
        categories: ["respiratory"],
        description: "Discharge of fluid from the nostrils.",
        severity: ["mild", "moderate"],
        duration: ["acute"],
        onset: "gradual",
        immediateRedFlag: false,
        priority: 3,
        _meta: {quickAccessDisplay: false},
        contagious: true,
        riskFactors: ["cold", "flu", "allergies"],
        complications: ["sinusitis", "post-nasal drip"],
        treatments: ["address underlying cause", "blow nose", "saline nasal spray", "antihistamines (if allergic)"],
        origin: ["infectious", "autoimmune"]
    },
    {
        id: "vertigo",
        label: "Vertigo",
        categories: ["neurological", "constitutional"],
        description: "A false sensation that you or your surroundings are spinning or moving, often related to inner ear or neurological problems.",
        severity: ["mild", "moderate", "severe"],
        duration: ["acute", "intermittent"],
        onset: "sudden",
        immediateRedFlag: false,
        priority: 2,
        _meta: {quickAccessDisplay: false},
        contagious: false,
        riskFactors: ["inner ear infection", "vestibular neuronitis", "migraine", "stroke"],
        complications: ["falls", "nausea", "vomiting"],
        immediateActions: ["lie still in a dark, quiet room"],
        treatments: ["hydration", "avoid sudden movements", "Epley maneuver (for BPPV)"],
        origin: ["infectious", "trauma", "autoimmune"]
    },
    {
        id: "vision_loss",
        label: "Vision loss (sudden)",
        categories: ["neurological"],
        description: "Partial or complete loss of vision in one or both eyes.",
        severity: ["severe"],
        duration: ["acute"],
        onset: "sudden",
        immediateRedFlag: true,
        priority: 1,
        _meta: {quickAccessDisplay: false},
        contagious: false,
        riskFactors: ["retinal detachment", "stroke", "optic neuritis", "glaucoma"],
        complications: ["permanent vision loss", "injury"],
        immediateActions: ["address underlying cause", "ensure safety", "call emergency services if severe", "keep person calm", "avoid bright lights", "do not apply pressure"],
        treatments: ["address underlying cause"],
        origin: ["autoimmune", "trauma"]
    },
    {
        id: "vomiting",
        label: "Vomiting",
        categories: ["gastrointestinal"],
        description: "Forceful expulsion of stomach contents through the mouth.",
        severity: ["moderate", "severe"],
        duration: ["acute"],
        onset: "sudden",
        immediateRedFlag: false,
        priority: 2,
        _meta: {quickAccessDisplay: false},
        contagious: true,
        riskFactors: ["infection", "food poisoning", "pregnancy", "migraine"],
        complications: ["dehydration", "electrolyte imbalance"],
        immediateActions: ["hydration (sips)", "avoid solid food"],
        treatments: ["address underlying cause", "rest stomach"],
        origin: ["infectious"]
    },
    {
        id: "loss_of_appetite",
        label: "Loss of appetite",
        categories: ["gastrointestinal", "constitutional"],
        description: "Reduced desire to eat or lack of interest in food.",
        severity: ["mild", "moderate"],
        duration: ["acute", "chronic"],
        onset: "gradual",
        immediateRedFlag: false,
        priority: 4,
        _meta: {quickAccessDisplay: false},
        contagious: false,
        riskFactors: ["infection", "stress", "medication side effects"],
        complications: ["weight loss", "malnutrition"],
        treatments: ["address underlying cause", "small frequent meals", "nutrition"],
        origin: ["infectious"]
    },
    {
        id: "loss_of_appetite",
        label: "Loss of Appetite",
        categories: ["gastrointestinal", "constitutional", "psychiatric"],
        description: "Reduced desire to eat or lack of interest in food.",
        severity: "any",
        duration: "any",
        onset: "gradual",
        immediateRedFlag: false,
        priority: 4,
        _meta: {quickAccessDisplay: false},
        contagious: false,
        riskFactors: ["recent illness", "depression", "medications", "stress", "chronic disease", "pregnancy"],
        complications: ["weight loss", "malnutrition", "fatigue", "weakness"],
        immediateActions: ["hydration", "eat small meals"],
        treatments: ["address underlying cause"],
        origin: ["infectious", "autoimmune", "cancer"]
    },
    {
        id: "diarrhea",
        label: "Diarrhea",
        categories: ["gastrointestinal"],
        description: "Frequent loose or watery bowel movements.",
        severity: "any",
        duration: ["acute", "chronic"],
        onset: "sudden",
        immediateRedFlag: false,
        priority: 2,
        _meta: {quickAccessDisplay: false},
        contagious: true,
        riskFactors: ["recent travel", "contaminated food", "infection", "antibiotic use", "chronic GI conditions"],
        complications: ["dehydration", "electrolyte imbalance", "weight loss"],
        immediateActions: ["hydration", "oral rehydration salts", "avoid dairy and greasy food"],
        treatments: ["address underlying cause", "loperamide (if non-infectious)", "probiotics"],
        origin: ["infectious", "autoimmune"]
    },
    {
        id: "syncope",
        label: "Syncope",
        categories: ["cardiovascular", "neurological"],
        description: "A sudden, brief loss of consciousness and posture, commonly known as fainting.",
        severity: "any",
        duration: ["acute"],
        onset: "sudden",
        immediateRedFlag: true,
        priority: 1,
        _meta: {quickAccessDisplay: false},
        contagious: false,
        riskFactors: ["dehydration", "low blood pressure", "vasovagal episodes", "heart conditions"],
        complications: ["fall injuries", "head trauma", "underlying cardiac event"],
        immediateActions: ["lie down", "monitor vital signs", "call emergency services if over 1 minute", "call emergency services if injured", "loosen clothing"],
        treatments: ["address underlying cause", "hydration"],
    },
    {
        id: "blurred_vision",
        label: "Blurred vision",
        categories: ["neurological", "cardiovascular"],
        description: "Lack of sharpness in vision, causing objects to appear out of focus or hazy.",
        severity: ["mild", "moderate", "severe"],
        duration: ["acute", "intermittent", "chronic"],
        onset: "any",
        immediateRedFlag: true,
        priority: 2,
        _meta: {
            quickAccessDisplay: false,
        },
        contagious: false,
        riskFactors: ["diabetes", "hypertension", "migraine", "eye injury", "medications", "stroke",],
        complications: ["vision loss", "fall risk", "brain injury"],
        immediateActions: ["stop activity", "rest eyes", "seek urgent care if sudden", "monitor for other symptoms", "avoid bright lights"],
        treatments: ["address underlying cause"],
        origin: ["trauma", "infectious"],
    },
    {
        id: "left_arm_pain",
        label: "Left arm pain",
        categories: ["cardiovascular", "musculoskeletal", "neurological"],
        description: "Pain or discomfort in the left arm, which can be sharp, dull, or burning.",
        severity: "any",
        duration: "any",
        onset: "any",
        immediateRedFlag: true,
        priority: 2,
        _meta: {quickAccessDisplay: false},
        contagious: false,
        riskFactors: ["heart disease", "injury", "nerve compression"],
        complications: ["heart attack", "nerve damage"],
        immediateActions: ["stop activity", "rest arm", "call emergency services if associated with chest pain"],
        treatments: ["address underlying cause", "pain relief (acetaminophen, Tylenol)"],
        origin: ["trauma", "cancer"]
    },
    {
        id: "jaw_pain",
        label: "Jaw pain",
        categories: ["cardiovascular", "musculoskeletal"],
        description: "Discomfort or pain in the jaw area, which can be sudden or gradual.",
        severity: "any",
        duration: "any",
        onset: "any",
        immediateRedFlag: true,
        priority: 2,
        _meta: {
            quickAccessDisplay: false
        },
        contagious: false,
        riskFactors: ["TMJ disorder", "heart disease", "dental issues"],
        complications: ["heart attack", "infection"],
        immediateActions: ["rest jaw", "avoid hard chewing", "seek urgent care if associated with chest pain"],
        treatments: ["treat underlying cause", "pain relief (acetaminophen, Tylenol)"],
        origin: ["trauma", "cancer"]
    },
    {
        id: "neck_pain",
        label: "Neck pain",
        categories: ["musculoskeletal", "neurological"],
        description: "Pain or stiffness in the neck area, often due to muscle strain or nerve irritation.",
        severity: "any",
        duration: "any",
        onset: "any",
        immediateRedFlag: false,
        priority: 3,
        _meta: {quickAccessDisplay: false},
        contagious: false,
        riskFactors: ["poor posture", "injury", "degenerative disc disease"],
        complications: ["nerve compression", "limited mobility"],
        immediateActions: ["rest", "apply heat or cold packs", "avoid strenuous activity"],
        treatments: ["address underlying cause"],
        origin: ["trauma"]
    },
    {
        id: "cold_sweat",
        label: "Cold Sweat",
        categories: ["cardiovascular", "neurological", "psychiatric"],
        description: "A sudden onset of sweating that feels cold and clammy, often unrelated to heat or exertion.",
        severity: ["mild", "moderate", "severe"],
        duration: ["acute", "intermittent"],
        onset: "sudden",
        immediateRedFlag: true,
        priority: 2,
        _meta: {quickAccessDisplay: false},
        contagious: false,
        riskFactors: ["shock", "heart attack", "anxiety", "hypoglycemia"],
        complications: ["cardiac arrest", "loss of consciousness"],
        immediateActions: [
            "sit or lie down",
            "monitor for other symptoms",
            "seek immediate medical attention if accompanied by chest pain, shortness of breath, or nausea"
        ],
        treatments: ["address underlying cause",],
        origin: ["trauma", "infectious"]
    },
    {
        id: "diaphoresis",
        label: "Diaphoresis",
        categories: ["cardiovascular", "neurological", "psychiatric"],
        description: "Excessive sweating that may occur without physical exertion or heat, often indicating an underlying condition.",
        severity: ["mild", "moderate", "severe"],
        duration: ["acute", "intermittent"],
        onset: "sudden",
        immediateRedFlag: true,
        priority: 2,
        _meta: {
            quickAccessDisplay: false
        },
        contagious: false,
        riskFactors: ["hypoglycemia", "myocardial infarction", "panic attack", "sepsis", "pheochromocytoma"],
        complications: ["shock", "loss of consciousness"],
        immediateActions: [
            "assess for accompanying symptoms like chest pain, dizziness, or confusion",
            "monitor blood sugar if diabetic",
            "seek emergency care if associated with serious symptoms"
        ],
        treatments: [
            "address underlying cause",
            "cool environment",
            "hydration"
        ],
        origin: ["infectious", "trauma"]
    },
    {
        id: "chest_pressure",
        label: "Chest Pressure",
        categories: ["cardiovascular", "respiratory"],
        description: "A feeling of tightness, heaviness, or squeezing sensation in the chest that can be constant or intermittent.",
        severity: ["mild", "moderate", "severe"],
        duration: ["acute", "intermittent"],
        onset: "sudden",
        immediateRedFlag: true,
        priority: 1,
        _meta: {
            quickAccessDisplay: false
        },
        contagious: false,
        riskFactors: ["hypertension", "coronary artery disease", "smoking", "high cholesterol"],
        complications: ["myocardial infarction", "angina", "heart failure"],
        immediateActions: [
            "stop activity",
            "rest",
            "call emergency services if severe or persistent",
            "administer nitroglycerin if prescribed"
        ],
        treatments: [
            "address underlying cardiac or respiratory cause",
            "lifestyle changes",
            "medications as prescribed"
        ],
        origin: ["trauma", "cancer"]
    }

];
