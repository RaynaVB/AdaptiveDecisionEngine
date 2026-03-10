import { ActionTemplate } from './actionLibrary';
import { Pattern } from '../pattern_engine/types';

export function calculateScores(template: ActionTemplate, pattern: Pattern, rejectionRate: number = 0): { impact: number; feasibility: number; confidence: number; total: number } {
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

    let impactWeight = 0.4;
    let feasibilityWeight = 0.4;

    if (rejectionRate > 0) {
        impactWeight = 0.2;
        feasibilityWeight = 0.6;
    }

    let total = impactWeight * impact + feasibilityWeight * feasibility + 0.2 * confidence;

    if (rejectionRate > 0) {
        const penalty = rejectionRate * 0.4;
        total = Math.max(0, total - penalty);
    }

    return {
        impact,
        feasibility,
        confidence,
        total
    };
}
