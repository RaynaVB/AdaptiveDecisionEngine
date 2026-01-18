import { Pattern, PatternContext } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const analyzeMoodDipThenEat = (context: PatternContext): Pattern[] => {
    const { meals, moods } = context;
    const patterns: Pattern[] = [];

    // Trigger Logic: Negative/High Stress mood -> Meal within 60 mins
    const WINDOW_MS = 60 * 60 * 1000;

    // Sort chronologically
    const sortedMoods = [...moods].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
    const sortedMeals = [...meals].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

    let triggerCount = 0;
    const triggers: { moodId: string, mealId: string }[] = [];

    sortedMoods.forEach(mood => {
        if (mood.valence === 'negative' || mood.stress === 'high') {
            const moodTime = new Date(mood.occurredAt).getTime();

            // Find first meal in window
            const meal = sortedMeals.find(m => {
                const mealTime = new Date(m.occurredAt).getTime();
                return mealTime > moodTime && mealTime <= moodTime + WINDOW_MS;
            });

            if (meal) {
                triggerCount++;
                triggers.push({ moodId: mood.id, mealId: meal.id });
            }
        }
    });

    if (triggerCount >= 2) {
        patterns.push({
            id: uuidv4(),
            patternType: 'mood_dip_then_eat',
            title: 'Mood Dip Trigger',
            description: `${triggerCount} instances of high stress or negative mood followed by eating within 60 minutes.`,
            confidence: triggerCount >= 3 ? 'high' : 'medium',
            severity: 'medium',
            evidence: {
                trigger_count: triggerCount,
                window_minutes: 60,
                triggers
            },
            windowStart: sortedMoods[0]?.occurredAt || new Date().toISOString(),
            windowEnd: sortedMoods[sortedMoods.length - 1]?.occurredAt || new Date().toISOString(),
            createdAt: new Date().toISOString()
        });
    }

    return patterns;
};
