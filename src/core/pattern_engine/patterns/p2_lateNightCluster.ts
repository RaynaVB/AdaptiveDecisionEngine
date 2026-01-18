import { Pattern, PatternContext } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { calculateSegmentation } from '../segmentation';

export const analyzeLateNightCluster = (context: PatternContext): Pattern[] => {
    const { meals } = context;
    const patterns: Pattern[] = [];

    // Last 7 days only
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMeals = meals.filter(m => new Date(m.occurredAt) >= sevenDaysAgo);
    if (recentMeals.length === 0) return [];

    const CUTOFF_HOUR = 21; // 9 PM
    let lateCount = 0;

    recentMeals.forEach(meal => {
        const date = new Date(meal.occurredAt);
        if (date.getHours() >= CUTOFF_HOUR || date.getHours() < 4) { // 9pm to 4am
            lateCount++;
        }
    });

    const percentage = lateCount / recentMeals.length;

    if (lateCount >= 3 || percentage >= 0.30) {
        // Filter triggering meals for segmentation
        const triggeringMeals = recentMeals.filter(meal => {
            const date = new Date(meal.occurredAt);
            return date.getHours() >= CUTOFF_HOUR || date.getHours() < 4;
        });

        patterns.push({
            id: uuidv4(),
            patternType: 'late_night_eating_cluster',
            title: 'Late Night Snacking',
            description: `You logged ${lateCount} meals after 9:00 PM in the last 7 days.`,
            confidence: 'high',
            severity: 'medium',
            evidence: {
                late_meal_count: lateCount,
                cutoff_time: '21:00',
                total_weekly_meals: recentMeals.length,
                percentage: percentage.toFixed(2)
            },
            segmentation: calculateSegmentation(triggeringMeals),
            windowStart: sevenDaysAgo.toISOString(),
            windowEnd: new Date().toISOString(),
            createdAt: new Date().toISOString()
        });
    }

    return patterns;
};
