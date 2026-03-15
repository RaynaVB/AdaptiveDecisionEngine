import { Pattern, PatternContext } from '../pattern_engine/types';
import { Recommendation } from './types';
import { ACTION_LIBRARY } from './actionLibrary';
import { calculateScores } from './scoring';
import { rankRecommendations } from './ranker';
import { v4 as uuidv4 } from 'uuid';
import { FeedbackStorageService } from '../../services/feedbackStorage';
import { banditModel } from './ml/banditModel';
import { buildContextVector, ContextVector } from './ml/contextBuilder';

const getConfidenceValue = (c: string): number => {
    if (c === 'high') return 3;
    if (c === 'medium') return 2;
    return 1;
};

export async function runRecommendationEngine(patterns: Pattern[], context: PatternContext): Promise<Recommendation[]> {
    const candidates: Recommendation[] = [];
    const mealCount = context.meals.length;
    const moodCount = context.moods.length;

    // Build the ContextVector for the ML Model predictions
    // (We use all moods here, buildContextVector will filter to the last 4 hours)
    await banditModel.initialize();
    const targetTimeMs = Date.now();
    const currentContext = buildContextVector(targetTimeMs, context.moods);
    
    console.log('[ML Model] Current Context Vector:', currentContext);

    for (const pattern of patterns) {
        const applicableTemplates = ACTION_LIBRARY.filter(t => t.applicablePatternTypes.includes(pattern.patternType as any));

        for (const template of applicableTemplates) {
            if (getConfidenceValue(pattern.confidence) < getConfidenceValue(template.minPatternConfidence)) continue;
            if (mealCount < template.minMealEventsInWindow) continue;
            if (moodCount < template.minMoodEventsInWindow) continue;

            const latestEvent = await FeedbackStorageService.getLatestFeedbackEventForRecommendation(template.id);
            if (latestEvent && latestEvent.outcome === 'rejected') {
                const hoursSinceRejection = (new Date().getTime() - new Date(latestEvent.timestamp).getTime()) / (1000 * 60 * 60);
                if (hoursSinceRejection < 24) {
                    continue; // Cooldown: skip template if rejected in the last 24 hours
                }
            }

            const rejectionRate = await FeedbackStorageService.getRejectionRateByType(template.recommendationType);
            const scores = calculateScores(template, pattern, rejectionRate, currentContext);
            console.log(`[ML Model] Score for ${template.id}:`, scores.mlScore);

            candidates.push({
                id: uuidv4(),
                templateId: template.id,
                recommendationType: template.recommendationType,
                title: template.titleTemplate,
                action: template.actionTemplate,
                whyThis: template.whyTemplate,
                linkedPatternIds: [pattern.id],
                scores,
                associatedExperimentId: template.associatedExperimentId,
                createdAt: new Date().toISOString()
            });
        }
    }

    if (candidates.length === 0) {
        const safeTemplates = ACTION_LIBRARY.filter(t => t.id.startsWith('safe_'));
        for (const template of safeTemplates) {
            candidates.push({
                id: uuidv4(),
                templateId: template.id,
                recommendationType: template.recommendationType,
                title: template.titleTemplate,
                action: template.actionTemplate,
                whyThis: template.whyTemplate,
                linkedPatternIds: [],
                scores: { impact: 0.3, feasibility: 1.0, confidence: 0.5, mlScore: 0.5, total: 0.62 },
                createdAt: new Date().toISOString()
            });
        }
    }

    return rankRecommendations(candidates);
}
