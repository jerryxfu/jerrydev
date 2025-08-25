import React from "react";
import SelectableButton from "./SelectableButton";
import "./BpSelector.scss";

export type SystolicRange = typeof systolicLabelsRange[number];
export type DiastolicRange = typeof diastolicLabelsRange[number];

export interface BloodPressure {
    systolic: SystolicRange | null;
    diastolic: DiastolicRange | null;
    systolicIndex: number | null;
    diastolicIndex: number | null;
}

interface BpSelectorProps {
    className?: string;
    onChange?: (bp: BloodPressure) => void;
    value?: {
        systolicIndex: number | null;
        diastolicIndex: number | null;
    };
}

// based on systolic numbers
const bpColors = [
    "#5a2781", // <60 — critically low
    "#6b3f93", // 60–65 — very low
    "#8563af", // 65–70 — low
    "#9a85c4", // 70–75 — borderline low
    "#7b9edd", // 75–80 — low‑normal
    "#59aadf", // 80–90 — normal-lower
    "#4ab7b2", // 90–100 — normal
    "#54c48a", // 100–110 — normal-upper
    "#8bd88f", // 110–120 — ideal
    "#c2e49a", // 120–130 — elevated
    "#fce38a", // 130–140 — stage 1 HTN
    "#f9b672", // 140–160 — stage 2 HTN
    "#e17f6f"  // >160 crisis
];

const systolicLabelsRange = [
    "<60", "60–65", "65–70", "70–75", "75–80",
    "80–90", "90–100", "100–110", "110–120",
    "120–130", "130–140", "140–160", ">160"
] as const;

const diastolicLabelsRange = [
    "<40", "40–45", "45–50", "50–55", "55–60",
    "60–65", "65–70", "70–75", "75–80",
    "80–85", "85–90", "90–100", ">100"
] as const;

const BPColorGrid = ({className = "", onChange, value}: BpSelectorProps) => {
    // Use local state but sync with parent if provided
    const [selectedSys, setSelectedSys] = React.useState<number | null>(value?.systolicIndex ?? null);
    const [selectedDia, setSelectedDia] = React.useState<number | null>(value?.diastolicIndex ?? null);

    // Update local state and notify parent
    const handleSysSelect = (index: number) => {
        const newIndex = selectedSys === index ? null : index;
        setSelectedSys(newIndex);

        if (onChange) {
            onChange({
                systolic: newIndex !== null ? systolicLabelsRange[newIndex] as SystolicRange : null,
                diastolic: selectedDia !== null ? diastolicLabelsRange[selectedDia] as DiastolicRange : null,
                systolicIndex: newIndex,
                diastolicIndex: selectedDia
            });
        }
    };

    const handleDiaSelect = (index: number) => {
        const newIndex = selectedDia === index ? null : index;
        setSelectedDia(newIndex);

        if (onChange) {
            onChange({
                systolic: selectedSys !== null ? systolicLabelsRange[selectedSys] as SystolicRange : null,
                diastolic: newIndex !== null ? diastolicLabelsRange[newIndex] as DiastolicRange : null,
                systolicIndex: selectedSys,
                diastolicIndex: newIndex
            });
        }
    };

    // Update local state if parent state changes
    React.useEffect(() => {
        if (value && value.systolicIndex !== selectedSys) {
            setSelectedSys(value.systolicIndex);
        }
        if (value && value.diastolicIndex !== selectedDia) {
            setSelectedDia(value.diastolicIndex);
        }
    }, [value?.systolicIndex, value?.diastolicIndex]);

    return (
        <div className={`bp-selector ${className}`}>
            <div className="bp-column ${className}">
                {bpColors.map((color, index) => (
                    <SelectableButton
                        key={`sys-${index}`}
                        value={systolicLabelsRange[index] || ""}
                        selected={selectedSys === index}
                        onClick={() => handleSysSelect(index)}
                        color={`${color}c8`}
                        selectedColor={color}
                    />
                ))}
            </div>
            <div className="bp-column">
                {bpColors.map((color, index) => (
                    <SelectableButton
                        key={`dia-${index}`}
                        value={diastolicLabelsRange[index] || ""}
                        selected={selectedDia === index}
                        onClick={() => handleDiaSelect(index)}
                        color={`${color}c8`}
                        selectedColor={color}
                    />
                ))}
            </div>
        </div>
    );
};

export default BPColorGrid;