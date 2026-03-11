import { ActionTemplate } from './actionLibrary';
import { Pattern } from '../pattern_engine/types';
import { ContextVector } from './ml/contextBuilder';
import { banditModel } from './ml/banditModel';

export function calculateScores(template: ActionTemplate, pattern: Pattern, rejectionRate: number = 0, contextVector: ContextVector | null = null): { impact: number; feasibility: number; confidence: number; mlScore: number; total: number } {
    let impact = 0.5;
    if (template.intensity === 'high') impact = 0.9;
    else if (template.intensity === 'medium') impact = 0.7;
    else if (template.intensity === 'low') impact = 0.4;

    let feasibility = 0.5;
    if (template.intensity === 'low') feasibility = 0.9;
    else if (template.intensity === 'medium') feasibility = 0.7;
    else if (template.intensity === 'high') feasibility = 0.4;

    if (template.id.startsWith('safe_')) {
        feasibility = 1.0;
        impact = 0.3;
    }

    let confidence = 0.5;
    if (pattern.confidence === 'high') confidence = 0.9;
    else if (pattern.confidence === 'medium') confidence = 0.7;
    else if (pattern.confidence === 'low') confidence = 0.4;

    // Calculate ML Bandit Score
    let mlScore = 0.5; // Default un-opinionated
    if (contextVector) {
        mlScore = banditModel.predict(template.id, contextVector);
    }

    let impactWeight = 0.3;
    let feasibilityWeight = 0.3;
    let mlWeight = 0.2;
    let confidenceWeight = 0.2;

    if (rejectionRate > 0) {
        impactWeight = 0.2;
        feasibilityWeight = 0.5;
        mlWeight = 0.1;
        confidenceWeight = 0.2;
    }

    let total = impactWeight * impact + feasibilityWeight * feasibility + mlWeight * mlScore + confidenceWeight * confidence;

    if (rejectionRate > 0) {
        const penalty = rejectionRate * 0.4;
        total = Math.max(0, total - penalty);
    }

    return {
        impact,
        feasibility,
        confidence,
        mlScore,
        total
    };
}
