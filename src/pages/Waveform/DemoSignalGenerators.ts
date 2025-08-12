/**
 * Demo signal generators for waveform visualization
 * These functions generate realistic-looking medical waveforms for demonstration purposes
 */

// Demo data generator for any signal type
export function generateDemoSignal(
    offset: number,
    length: number,
    signalKey: string,
    samplingRate: number = 125
): { x: number[], y: number[] } {
    const x = Array.from({length}, (_, i) => i / samplingRate + offset);
    const y: number[] = [];
    const upperKey = signalKey.toUpperCase();

    for (let i = 0; i < x.length; i++) {
        const t = x[i] ?? 0;
        let value = 0;

        if (upperKey.includes("ECG") || ["II", "III", "V", "AVR", "AVL", "AVF"].some(lead => upperKey.includes(lead))) {
            value = generateECGSignal(t);
        } else if (upperKey.includes("ABP") || upperKey.includes("PRESS") || upperKey.includes("BP")) {
            value = generateBloodPressureSignal(t);
        } else if (upperKey.includes("PLETH") || upperKey.includes("PPG")) {
            value = generatePlethysmographySignal(t);
        } else if (upperKey.includes("SPO2") || upperKey.includes("SAT")) {
            value = generateSpO2Signal(t);
        } else if (upperKey.includes("RESP") || upperKey.includes("BREATH")) {
            value = generateRespiratorySignal(t);
        } else if (upperKey.includes("TEMP")) {
            value = generateTemperatureSignal(t);
        } else if (upperKey.includes("HR") || upperKey.includes("HEART")) {
            value = generateHeartRateSignal(t);
        } else {
            value = generateGenericSignal(t);
        }

        y.push(value);
    }

    return {x, y};
}

/**
 * Generate ECG-like signal with P, QRS, and T waves
 */
function generateECGSignal(t: number): number {
    const heartRate = 75;
    const rrInterval = 60 / heartRate;
    const cyclePosition = (t % rrInterval) / rrInterval;
    let value = 0;

    if (cyclePosition < 0.1) {
        // P wave
        value = 0.15 * Math.sin(Math.PI * cyclePosition / 0.1);
    } else if (cyclePosition >= 0.15 && cyclePosition < 0.35) {
        // QRS complex
        const qrsPhase = (cyclePosition - 0.15) / 0.2;
        if (qrsPhase < 0.3) {
            value = -0.1 * Math.sin(Math.PI * qrsPhase / 0.3); // Q wave
        } else if (qrsPhase < 0.7) {
            value = 1.2 * Math.sin(Math.PI * (qrsPhase - 0.3) / 0.4); // R wave
        } else {
            value = -0.3 * Math.sin(Math.PI * (qrsPhase - 0.7) / 0.3); // S wave
        }
    } else if (cyclePosition >= 0.45 && cyclePosition < 0.75) {
        // T wave
        value = 0.3 * Math.sin(Math.PI * (cyclePosition - 0.45) / 0.3);
    }

    // Add baseline drift and noise
    const baselineDrift = 0.05 * Math.sin(0.1 * t);
    const noise = 0.02 * (Math.random() - 0.5);

    return value + baselineDrift + noise;
}

/**
 * Generate blood pressure waveform with systolic/diastolic pattern
 */
function generateBloodPressureSignal(t: number): number {
    const heartRate = 75;
    const rrInterval = 60 / heartRate;
    const cyclePosition = (t % rrInterval) / rrInterval;
    const systolic = 120;
    const diastolic = 80;
    let value; // Remove redundant initializer

    if (cyclePosition < 0.3) {
        // Systolic upstroke
        value = diastolic + (systolic - diastolic) * Math.sin(Math.PI * cyclePosition / 0.6);
    } else {
        // Diastolic decay
        const diastolicPhase = (cyclePosition - 0.3) / 0.7;
        value = diastolic + (systolic - diastolic) * Math.exp(-3 * diastolicPhase);
    }

    // Add respiratory influence and noise
    const respInfluence = 2 * Math.sin(2 * Math.PI * 0.25 * t);
    const noise = 0.5 * (Math.random() - 0.5);

    return value + respInfluence + noise;
}

/**
 * Generate plethysmography (pulse oximetry) waveform
 */
function generatePlethysmographySignal(t: number): number {
    const heartRate = 75;
    const rrInterval = 60 / heartRate;
    const cyclePosition = (t % rrInterval) / rrInterval;
    let plethValue; // Remove redundant initializer

    if (cyclePosition < 0.4) {
        // Systolic peak
        plethValue = Math.sin(Math.PI * cyclePosition / 0.4) * 35;
    } else {
        // Diastolic decay
        plethValue = 35 * Math.exp(-3 * (cyclePosition - 0.4) / 0.6);
    }

    // Add respiratory modulation, baseline drift, and noise
    const respModulation = 6 * Math.sin(1.57 * t);
    const baselineDrift = 2 * Math.sin(0.08 * t);
    const noise = 0.3 * (Math.random() - 0.5);

    return 50 + plethValue + respModulation + baselineDrift + noise;
}

/**
 * Generate SpO2 (oxygen saturation) signal
 */
function generateSpO2Signal(t: number): number {
    const heartRate = 75;
    const rrInterval = 60 / heartRate;
    const cyclePosition = (t % rrInterval) / rrInterval;
    const baseSpO2 = 97;

    // Small cardiac variation
    const cardiacVariation = 0.3 * Math.sin(2 * Math.PI * cyclePosition);

    // Respiratory modulation
    const respModulation = 0.5 * Math.sin(2 * Math.PI * 0.25 * t);

    // Slow drift
    const slowDrift = 0.8 * Math.sin(0.02 * t);

    // Noise
    const noise = 0.2 * (Math.random() - 0.5);

    const spo2Value = baseSpO2 + cardiacVariation + respModulation + slowDrift + noise;

    // Clamp to realistic range
    return Math.max(80, Math.min(100, spo2Value));
}

/**
 * Generate respiratory waveform
 */
function generateRespiratorySignal(t: number): number {
    // Primary respiratory frequency (15 breaths/min = 0.25 Hz)
    const primaryResp = 0.9 * Math.sin(2 * Math.PI * 0.25 * t);

    // Add some harmonics for realism
    const harmonics = 0.1 * Math.sin(2 * Math.PI * 0.5 * t);

    // Add noise
    const noise = 0.05 * (Math.random() - 0.5);

    return primaryResp + harmonics + noise;
}

/**
 * Generate temperature signal (body temperature)
 */
function generateTemperatureSignal(t: number): number {
    // Normal body temperature with slow variation
    const baseTemp = 37.0; // 37°C
    const slowVariation = 0.5 * Math.sin(0.01 * t);
    const noise = 0.1 * (Math.random() - 0.5);

    return baseTemp + slowVariation + noise;
}

/**
 * Generate heart rate signal
 */
function generateHeartRateSignal(t: number): number {
    // Base heart rate with natural variation
    const baseHR = 75;
    const slowVariation = 5 * Math.sin(0.1 * t);
    const noise = 2 * (Math.random() - 0.5);

    return baseHR + slowVariation + noise;
}

/**
 * Generate generic sinusoidal signal with variation
 */
function generateGenericSignal(t: number): number {
    // Varying frequency for interesting pattern
    const freq = 0.5 + 0.3 * Math.sin(0.1 * t);

    // Primary signal
    const primary = Math.sin(2 * Math.PI * freq * t);

    // Add harmonics
    const harmonics = 0.2 * Math.sin(2 * Math.PI * 2 * freq * t);

    // Add noise
    const noise = 0.1 * (Math.random() - 0.5);

    return primary + harmonics + noise;
}
