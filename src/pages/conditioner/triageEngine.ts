import type {Condition, RuleNode} from "./conditions.ts";
import type {Contexts} from "./context.ts";
import type {SymptomIds} from "./symptoms.ts";

export type TriageResult = {
    conditionId: string;
    label: string;
    score: number; // between 0 and 1
}[];

export type TriageInput = {
    selectedSymptoms: SymptomIds[];
    activeContexts: Contexts[];
};

export function softmax(numbers: number[], temperature = 0.5): number[] {
    const expScores = numbers.map(s => Math.exp(s / temperature));
    const sum = expScores.reduce((a, b) => a + b, 0);
    return expScores.map(e => e / sum);
}

export function evalSymptom(rule: RuleNode & { type: "SYMPTOM" }, symptomSet: Set<string>): number {
    const hasSymptom = symptomSet.has(rule.symptomId);
    const match = hasSymptom ? 1 : 0;
    console.log(`SYMPTOM '${rule.symptomId}' present: ${hasSymptom}, weight: ${rule.weight ?? 1}, score: ${match}`);
    return match;
}

// function fuzzyAnd(rule: RuleNode & { type: "AND" }, symptomSet: Set<string>): number {
//     if (rule.rules.length === 0) {
//         return 0;
//     }
//
//     // Evaluate each subrule recursively and collect their scores
//     const scores = rule.rules.map(r => evaluateRule(r, symptomSet));
//
//     // Average the scores to allow partial credit
//     const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
//
//     console.log(`AND scores: [${scores.join(", ")}], avg: ${avg}`);
//     return avg;
// }

export function fuzzyAnd(rule: RuleNode & { type: "AND" }, symptomSet: Set<string>): number {
    if (rule.rules.length === 0) {
        return 0;
    }

    // Evaluate subrules with their own weights
    const weightedScores = rule.rules.map(r => {
        const weight = r.weight ?? 1;
        const score = evaluateRule(r, symptomSet);
        return {score, weight};
    });

    const totalWeight = weightedScores.reduce((sum, r) => sum + r.weight, 0);
    const weightedSum = weightedScores.reduce((sum, r) => sum + r.score * r.weight, 0);

    const finalScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    console.log(`AND weighted scores: ${JSON.stringify(weightedScores)}, final: ${finalScore}`);
    return finalScore;
}

// export function fuzzyOr(rule: RuleNode & { type: "OR" }, symptomSet: Set<string>): number {
//     if (rule.rules.length === 0) {
//         return 0;
//     }
//
//     // Evaluate each subrule recursively and collect their scores
//     const scores = rule.rules.map(r => evaluateRule(r, symptomSet));
//
//     // Best one determines the final score
//     const maxScore = Math.max(...scores);
//
//     console.log(`OR scores: [${scores.join(", ")}], max: ${maxScore}`);
//     return maxScore;
// }

export function softFuzzyOr(rule: RuleNode & { type: "OR" }, symptomSet: Set<SymptomIds>): number {
    if (rule.rules.length === 0) {
        return 0;
    }

    // Evaluate each subrule recursively and collect their scores
    const scores = rule.rules.map(r => evaluateRule(r, symptomSet));

    const softmax_weights = softmax(scores, 0.8);

    // Weighted sum of scores with null check
    const final_score = scores.reduce((sum, s, i) => sum + s * (softmax_weights[i] || 0), 0);

    console.log(`OR initial scores: [${scores.join(", ")}], softmax weights: [${softmax_weights.map(n => n.toFixed(2)).join(", ")}], final score: ${final_score.toFixed(2)}`);
    return final_score;
}


export function evalXor(rule: RuleNode & { type: "XOR" }, symptomSet: Set<string>): number {
    // Evaluate each subrule recursively and collect their scores
    const scores = rule.rules.map(r => evaluateRule(r, symptomSet));

    // Count how many subrules have a score greater than 0.5 (considered "matched")
    const matchCount = scores.filter(s => s > 0.3).length;

    // 1 if only exactly one subrule is matched, else 0
    const score = matchCount === 1 ? 1 : 0;

    console.log(`XOR scores: [${scores.join(", ")}], matchCount: ${matchCount}, score: ${score}`);
    return score;
}


export function evalNot(rule: RuleNode & { type: "NOT" }, symptomSet: Set<string>): number {
    // Evaluate the single subrule inside NOT
    const subScore = evaluateRule(rule.rule, symptomSet);
    const score = 1 - subScore;

    console.log(`NOT subScore: ${subScore}, score: ${score}`);
    return score;
}


export function evalNand(rule: RuleNode & { type: "NAND" }, symptomSet: Set<string>): number {
    // Evaluate the AND of all subrules
    const andScore = evaluateRule({type: "AND", rules: rule.rules, weight: rule.weight ?? 1}, symptomSet);
    const score = 1 - andScore;

    console.log(`NAND andScore: ${andScore}, score: ${score}`);
    return score;
}


export function evalNor(rule: RuleNode & { type: "NOR" }, symptomSet: Set<string>): number {
    // Evaluate the OR of all subrules
    const orScore = evaluateRule({type: "OR", rules: rule.rules, weight: rule.weight ?? 1}, symptomSet);

    const score = 1 - orScore;
    console.log(`NOR orScore: ${orScore}, score: ${score}`);
    return score;
}

export function evalImplies(rule: RuleNode & { type: "IMPLIES" }, symptomSet: Set<string>): number {
    const ifScore = evaluateRule(rule.if, symptomSet);
    const thenScore = evaluateRule(rule.then, symptomSet);

    // If "if" is true (> 0.5) but "then" is false (< 0.5), implication fails
    const score = ifScore > 0.5 && thenScore < 0.5 ? 0 : 1;

    console.log(`IMPLIES ifScore: ${ifScore}, thenScore: ${thenScore}, score: ${score}`);
    return score;
}

export function evalAdd(rule: RuleNode & { type: "ADD" }, symptomSet: Set<string>): number {
    if (rule.rules.length === 0) {
        return 0;
    }

    // Evaluate each subrule and sum up the scores
    const scores = rule.rules.map(r => {
        return evaluateRule(r, symptomSet);
    });

    // Sum all positive contributions
    const totalScore = scores.reduce((sum, score) => sum + score, 0);

    console.log(`BONUS scores: [${scores.join(", ")}], total: ${totalScore}`);
    return totalScore;
}

export function evaluateRule(rule: RuleNode, symptomSet: Set<string>): number {
    let baseScore = 0;
    if (rule.weight === undefined) {
        rule.weight = 1.0; // default weight
    }

    switch (rule.type) {
        case "SYMPTOM":
            baseScore = evalSymptom(rule, symptomSet);
            break;
        case "AND":
            baseScore = fuzzyAnd(rule, symptomSet);
            break;
        case "OR":
            // baseScore = fuzzyOr(rule, symptomSet) * 0.8;
            baseScore = softFuzzyOr(rule, symptomSet) * 0.9;
            break;
        case "XOR": {
            const score = evalXor(rule, symptomSet);
            // if (score === 0) {
            //     baseScore = softFuzzyOr({type: "OR", rules: rule.rules, weight: rule.weight}, symptomSet) * 0.5; // fallback to OR if XOR fails
            // }
            baseScore = score * 0.7;
            break;
        }
        case "NOT":
            baseScore = evalNot(rule, symptomSet) * 0.5;
            break;
        case "NAND":
            baseScore = evalNand(rule, symptomSet) * 0.6;
            break;
        case "NOR":
            baseScore = evalNor(rule, symptomSet) * 0.6;
            break;
        case "IMPLIES":
            baseScore = evalImplies(rule, symptomSet) * 0.9;
            break;
        case "ADD":
            baseScore = evalAdd(rule, symptomSet);
            break;
        default:
            console.log(`Unknown rule type: ${(rule as any).type}`);
            baseScore = 0;
            break;
    }
    return baseScore * rule.weight;
}

export function calculateContextBonus(condition: Condition, activeContexts: Set<Contexts>): number {
    const contextBonus = condition.contextBonus;

    if (!contextBonus || contextBonus.length === 0) return 0;

    return contextBonus.reduce((sum, ctx) => {
        return activeContexts.has(ctx.contextLabel) ? sum + ctx.bonus : sum;
    }, 0);
}

export function average(arr: number[]): number {
    return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function calculateConditionScore(condition: Condition, symptomSet: Set<string>): number {
    return evaluateRule(condition.rule, symptomSet);
}

export function getMatchingConditions(
    conditions: Condition[],
    symptoms: Set<string>,
    threshold = 0.5
) {
    return conditions
        .map(condition => ({
            id: condition.id,
            score: evaluateRule(condition.rule, symptoms),
        }))
        .filter(c => c.score >= threshold)
        .sort((a, b) => b.score - a.score);
}

export function evaluateConditions(
    input: TriageInput,
    conditions: Condition[]
): TriageResult {
    const symptomSet = new Set<SymptomIds>(input.selectedSymptoms);
    const contextsSet = new Set<Contexts>(input.activeContexts);

    return conditions
        .map(condition => {
            const score = evaluateRule(condition.rule, symptomSet);
            const bonus = calculateContextBonus(condition, contextsSet);
            return {
                conditionId: condition.id,
                label: condition.label,
                score: score + bonus
            };
        })
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score);
}
