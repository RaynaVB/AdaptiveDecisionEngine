import { Pattern, PatternContext } from '../pattern_engine/types';
import { Recommendation } from './types';
import { ACTION_LIBRARY } from './actionLibrary';
import { calculateScores } from './scoring';
import { rankRecommendations } from './ranker';
import { v4 as uuidv4 } from 'uuid';
import { FeedbackStorageService } from '../../services/feedbackStorage';

const getConfidenceValue = (c: string): number => {
    if (c === 'high') return 3;
    if (c === 'medium') return 2;
    return 1;
};

export async function runRecommendationEngine(patterns: Pattern[], context: PatternContext): Promise<Recommendation[]> {
    const candidates: Recommendation[] = [];
    const mealCount = context.meals.length;
    const moodCount = context.moods.length;

    for (const pattern of patterns) {
        const applicableTemplates = ACTION_LIBRARY.filter(t => t.applicablePatternTypes.includes(pattern.patternType as any));

        for (const template of applicableTemplates) {
            if (getConfidenceValue(pattern.confidence) < getConfidenceValue(template.minPatternConfidence)) continue;
            if (mealCount < template.minMealEventsInWindow) continue;
            if (moodCount < template.minMoodEventsInWindow) continue;

            const rejectionRate = await FeedbackStorageService.getRejectionRateByType(template.recommendationType);
            const scores = calculateScores(template, pattern, rejectionRate);

            candidates.push({
                id: uuidv4(),
                recommendationType: template.recommendationType,
                title: template.titleTemplate,
                action: template.actionTemplate,
                whyThis: template.whyTemplate,
                linkedPatternIds: [pattern.id],
                scores,
                createdAt: new Date().toISOString()
            });
        }
    }

    if (candidates.length === 0) {
        const safeTemplates = ACTION_LIBRARY.filter(t => t.id.startsWith('safe_'));
        for (const template of safeTemplates) {
            candidates.push({
                id: uuidv4(),
                recommendationType: template.recommendationType,
                title: template.titleTemplate,
                action: template.actionTemplate,
                whyThis: template.whyTemplate,
                linkedPatternIds: [],
                scores: { impact: 0.3, feasibility: 1.0, confidence: 0.5, total: 0.62 },
                createdAt: new Date().toISOString()
            });
        }
    }

    return rankRecommendations(candidates);
}
