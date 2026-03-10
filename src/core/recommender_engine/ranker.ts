import { Recommendation } from './types';

export function rankRecommendations(candidates: Recommendation[]): Recommendation[] {
    const sorted = [...candidates].sort((a, b) => b.scores.total - a.scores.total);
    // Return exactly 3 recommendations (or fewer if less candidates exist)
    return sorted.slice(0, 3);
}
