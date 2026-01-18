jest.mock('uuid', () => ({
    v4: () => 'test-uuid-1234'
}));

import { analyzeMoodDipThenEat } from '../../src/core/pattern_engine/patterns/p1_moodDipThenEat';
import { MealEvent, MoodEvent } from '../../src/models/types';
import { v4 as uuidv4 } from 'uuid';
import { PatternContext } from '../../src/core/pattern_engine/types';

describe('P1: Mood Dip Then Eat', () => {

    test('Should NOT trigger with insufficient data (< 2 instances)', () => {
        const now = new Date();
        const mood1: MoodEvent = {
            id: uuidv4(),
            createdAt: now.toISOString(),
            occurredAt: now.toISOString(),
            valence: 'negative',
            energy: 'ok',
            stress: 'high'
        };
        const meal1: MealEvent = {
            id: uuidv4(),
            createdAt: now.toISOString(),
            occurredAt: new Date(now.getTime() + 10 * 60000).toISOString(), // 10 mins later
            mealSlot: 'snack',
            inputMode: 'text',
            mealTypeTags: ['sweet']
        };

        const context: PatternContext = {
            meals: [meal1],
            moods: [mood1]
        };

        const results = analyzeMoodDipThenEat(context);
        expect(results).toHaveLength(0);
    });

    test('Should trigger with sufficient data (2 instances)', () => {
        const now = new Date();
        const mood1: MoodEvent = {
            id: uuidv4(),
            createdAt: now.toISOString(),
            occurredAt: now.toISOString(),
            valence: 'negative',
            energy: 'ok',
            stress: 'high'
        };
        const meal1: MealEvent = {
            id: uuidv4(),
            createdAt: now.toISOString(),
            occurredAt: new Date(now.getTime() + 10 * 60000).toISOString(),
            mealSlot: 'text' as any, // 'text' isn't a slot but let's stick to valid types if possible, or cast
            inputMode: 'text',
            mealTypeTags: ['sweet']
        };
        // Fix slot
        meal1.mealSlot = 'snack';

        const mood2: MoodEvent = { ...mood1, id: uuidv4(), occurredAt: new Date(now.getTime() - 86400000).toISOString() };
        const meal2: MealEvent = { ...meal1, id: uuidv4(), occurredAt: new Date(now.getTime() - 86400000 + 10 * 60000).toISOString() };

        const context: PatternContext = {
            meals: [meal1, meal2],
            moods: [mood1, mood2]
        };

        const results = analyzeMoodDipThenEat(context);
        expect(results).toHaveLength(1);
        expect(results[0].patternType).toBe('mood_dip_then_eat');
        expect(results[0].confidence).toBe('medium');
    });

    test('Should include segmentation data', () => {
        const now = new Date(); // Assume 'daytime'
        // Create trigger same as above
        const mood1: MoodEvent = { id: uuidv4(), createdAt: now.toISOString(), occurredAt: now.toISOString(), valence: 'negative', energy: 'ok', stress: 'high' };
        const meal1: MealEvent = { id: uuidv4(), createdAt: now.toISOString(), occurredAt: new Date(now.getTime() + 600000).toISOString(), mealSlot: 'snack', inputMode: 'text', mealTypeTags: [] };

        const mood2 = { ...mood1, id: uuidv4(), occurredAt: new Date(now.getTime() - 86400000).toISOString() };
        const meal2 = { ...meal1, id: uuidv4(), occurredAt: new Date(now.getTime() - 86400000 + 600000).toISOString() };

        const context = { meals: [meal1, meal2], moods: [mood1, mood2] };
        const results = analyzeMoodDipThenEat(context);

        expect(results[0].segmentation).toBeDefined();
        // Just verify structure
        expect(results[0].segmentation?.timeOfDay).toBeDefined();
    });
});
