import type {Condition} from "./conditions.ts";
import type {Contexts} from "./context.ts";
import type {SymptomIds} from "./symptoms.ts";

export type TriageResult = {
    conditionId: string;
    label: string;
    score: number;
    matchedPrimary: number;
    matchedSupporting: number;
}[];

export type TriageInput = {
    selectedSymptoms: SymptomIds[];
    activeContexts: Contexts[];
};

export function evaluateConditions(
    input: TriageInput,
    conditions: Condition[]
): TriageResult {
    const symptoms = new Set(input.selectedSymptoms);
    const contexts = new Set(input.activeContexts);

    return conditions
        .map(condition => {
            const primaryTotal = condition.primarySymptoms.length;
            const supportingTotal = (condition.supportingSymptoms ?? []).length;
            const excludingTotal = (condition.excludingSymptoms ?? []).length;

            const primaryMatches = condition.primarySymptoms.filter(s => symptoms.has(s)).length;
            const supportingMatches = (condition.supportingSymptoms ?? []).filter(s => symptoms.has(s)).length;
            const excludingMatches = (condition.excludingSymptoms ?? []).filter(s => symptoms.has(s)).length;
            const contextMatches = (condition.relevantContexts ?? []).filter(c => contexts.has(c)).length;

            // Must have at least 1 primary symptom
            if (primaryMatches === 0) {
                return null;
            }

            // Calculate ratios (0-1)
            const primaryRatio = primaryMatches / primaryTotal;
            const supportingRatio = supportingTotal > 0 ? supportingMatches / supportingTotal : 0;
            const excludingPenalty = excludingTotal > 0 ? (excludingMatches / excludingTotal) * 0.3 : 0;
            const contextBonus = contextMatches > 0 ? 0.05 : 0;

            // Weighted combination: primary is more important
            const score = Math.max(0, Math.min(1,
                (0.6 * primaryRatio) + (0.4 * supportingRatio) - excludingPenalty + contextBonus
            ));

            return {
                conditionId: condition.id,
                label: condition.label,
                score,
                matchedPrimary: primaryMatches,
                matchedSupporting: supportingMatches
            };
        })
        .filter((result): result is NonNullable<typeof result> => result !== null && result.score > 0)
        .sort((a, b) => b.score - a.score);
}

