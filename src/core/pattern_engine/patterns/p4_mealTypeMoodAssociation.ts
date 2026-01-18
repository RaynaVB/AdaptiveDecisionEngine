import { Pattern, PatternContext } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { MealTypeTag, MoodValence } from '../../../models/types';

export const analyzeMealTypeMoodAssociation = (context: PatternContext): Pattern[] => {
    const { meals, moods } = context;
    const patterns: Pattern[] = [];

    // Tags to check
    const TARGET_TAGS: MealTypeTag[] = ['high_sugar', 'fried_greasy', 'heavy', 'caffeinated', 'sweet'];

    // Map: Tag -> { total: count, drops: count }
    const stats: Record<string, { total: number, drops: number }> = {};

    TARGET_TAGS.forEach(tag => {
        stats[tag] = { total: 0, drops: 0 };
    });

    const sortedMeals = [...meals].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
    const sortedMoods = [...moods].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

    // Map valence to score
    const scoreValence = (v: MoodValence): number => {
        if (v === 'positive') return 1;
        if (v === 'neutral') return 0;
        return -1;
    };

    sortedMeals.forEach(meal => {
        // Collect tags present in this meal that match our targets
        const presentTargets = meal.mealTypeTags.filter(t => TARGET_TAGS.includes(t));

        if (presentTargets.length > 0) {
            const mealTime = new Date(meal.occurredAt).getTime();

            // Find moods in next 4 hours
            const subsequentMoods = sortedMoods.filter(m => {
                const t = new Date(m.occurredAt).getTime();
                return t > mealTime && t <= mealTime + (4 * 60 * 60 * 1000);
            });

            if (subsequentMoods.length > 0) {
                // Check for drop
                // Simplest heuristic: Is the average valence of subsequent moods < 0 (negative)?
                // Or: Did we drop from Pre-Meal mood? (Too complex for v1 w/o pre-meal mood linkage)
                // V1 Heuristic: Any NEGATIVE mood in window?

                const hasNegative = subsequentMoods.some(m => m.valence === 'negative');

                presentTargets.forEach(tag => {
                    stats[tag].total++;
                    if (hasNegative) stats[tag].drops++;
                });
            }
        }
    });

    // Evaluate
    Object.keys(stats).forEach(tag => {
        const { total, drops } = stats[tag];
        if (total >= 3) { // Min sample size
            const rate = drops / total;
            if (rate >= 0.60) {
                patterns.push({
                    id: uuidv4(),
                    patternType: 'meal_type_mood_association',
                    title: `${tag.replace('_', ' ')} & Mood`,
                    description: `${(rate * 100).toFixed(0)}% of '${tag.replace('_', ' ')}' meals are followed by negative mood within 4 hours.`,
                    confidence: rate >= 0.8 ? 'high' : 'medium', // 0.6 = medium, 0.8+ = high
                    evidence: { tag, total_tag_count: total, mood_drop_count: drops, rate: rate.toFixed(2) },
                    windowStart: meals[0]?.occurredAt || new Date().toISOString(),
                    windowEnd: new Date().toISOString(),
                    createdAt: new Date().toISOString()
                });
            }
        }
    });

    return patterns;
};
