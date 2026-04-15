import type {TemplateSource, CsvSource} from "./useSweepRenderer";

export type Palette = {
    ecg: string;
    pleth: string;
    resp: string;
    bp: string;
    spo2: string;
    rr: string;
    etco2: string;
    fio2: string;
    temp: string;
    defaultText: string;
};

export const DEFAULT_PALETTE: Palette = {
    ecg: "#00ff00",
    pleth: "#00e5ff",
    resp: "#ffffff",
    bp: "#ff5252",
    spo2: "#00e5ff",
    rr: "#ffffff",
    etco2: "#ffffff",
    fio2: "#ffffff",
    temp: "#ffffff",
    defaultText: "#d7e0ea",
};

export const CFG = {
    DEFAULT_SHOW_SECONDS: 10,
    WINDOW_CHOICES: [1, 4, 6, 8, 10, 12, 15, 20] as const,
} as const;

export type FlashMode = "invert" | "red-block" | "yellow-block" | "red-text" | "yellow-text" | "auto";
export type AlarmLevelOrNull = "critical" | "warning" | "advisory" | null;

export type CsvWaveData = {
    sampleHz: number;
    columns: { name: string; values: Float32Array; yMin: number; yMax: number }[];
};

export type RowDef = {
    key: string;
    label: string;
    color: string;
    className?: string;
    source: TemplateSource | CsvSource;
    showVital?: "hr" | "spo2" | "rr";
    yMin?: number;
    yMax?: number;
    sampleHz?: number;
};

export type DisplayVitals = {
    hr: number | "-?-";
    spo2: number | "-?-";
    rr: number | "-?-";
    bpSys: number | "-?-";
    bpDia: number | "-?-";
    pulse: number | "-?-";
};

export type AdditionalVital = {
    key: string;
    label: string;
    value: string;
    color: string;
    alarmLevel?: AlarmLevelOrNull;
};
