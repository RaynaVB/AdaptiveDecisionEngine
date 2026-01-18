jest.mock('uuid', () => ({
    v4: () => 'test-uuid-1234'
}));

import { analyzeMealTypeMoodAssociation } from '../../src/core/pattern_engine/patterns/p4_mealTypeMoodAssociation';
import { MealEvent, MoodEvent } from '../../src/models/types';
import { v4 as uuidv4 } from 'uuid';
import { PatternContext } from '../../src/core/pattern_engine/types';

describe('P4: Meal Type Mood Association', () => {
    test('Should identify Sugar -> Negative Mood pattern', () => {
        const meals: MealEvent[] = [];
        const moods: MoodEvent[] = [];

        // Generate 4 events where 'high_sugar' -> 'negative' mood 2 hours later
        for (let i = 0; i < 4; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const mealTime = d.toISOString();
            const moodTime = new Date(d.getTime() + 2 * 60 * 60 * 1000).toISOString(); // +2 hours

            meals.push({
                id: uuidv4(), occurredAt: mealTime, createdAt: '',
                mealSlot: 'snack', inputMode: 'text', mealTypeTags: ['high_sugar']
            });
            moods.push({
                id: uuidv4(), occurredAt: moodTime, createdAt: '',
                valence: 'negative', energy: 'low', stress: 'medium'
            });
        }

        // 4/4 = 100% rate. > 60% threshold.

        const context: PatternContext = { meals, moods };
        const result = analyzeMealTypeMoodAssociation(context);

        expect(result).toHaveLength(1);
        expect(result[0].patternType).toBe('meal_type_mood_association');
        expect(result[0].evidence.tag).toBe('high_sugar');
        expect(parseFloat(result[0].evidence.rate)).toBe(1.00);
    });

    test('Should ignore pattern if drop rate is low', () => {
        // 3 sugar meals, all POSITIVE outcome
        const meals: MealEvent[] = [];
        const moods: MoodEvent[] = [];
        for (let i = 0; i < 3; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            meals.push({ id: uuidv4(), occurredAt: d.toISOString(), createdAt: '', mealSlot: 'snack', inputMode: 'text', mealTypeTags: ['high_sugar'] });
            moods.push({ id: uuidv4(), occurredAt: new Date(d.getTime() + 60 * 60 * 1000).toISOString(), createdAt: '', valence: 'positive', energy: 'high', stress: 'low' });
        }

        const context = { meals, moods };
        const result = analyzeMealTypeMoodAssociation(context);
        expect(result).toHaveLength(0);
    });
});
