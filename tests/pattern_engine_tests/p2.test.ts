jest.mock('uuid', () => ({
    v4: () => 'test-uuid-1234'
}));

import { analyzeLateNightCluster } from '../../src/core/pattern_engine/patterns/p2_lateNightCluster';
import { MealEvent } from '../../src/models/types';
import { v4 as uuidv4 } from 'uuid';
import { PatternContext } from '../../src/core/pattern_engine/types';

describe('P2: Late Night Cluster', () => {
    test('Should return empty if no late meals', () => {
        const now = new Date();
        const meal1: MealEvent = {
            id: uuidv4(),
            createdAt: now.toISOString(),
            occurredAt: new Date().setHours(12, 0, 0, 0).toString(), // Noon
            mealSlot: 'lunch',
            inputMode: 'text',
            mealTypeTags: []
        };
        const context: PatternContext = {
            meals: [meal1],
            moods: []
        };
        const result = analyzeLateNightCluster(context);
        expect(result).toHaveLength(0);
    });

    test('Should trigger if >= 3 late night meals (22:00)', () => {
        const meals: MealEvent[] = [];
        for (let i = 0; i < 3; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(22, 30, 0, 0); // 10:30 PM
            meals.push({
                id: uuidv4(),
                createdAt: d.toISOString(),
                occurredAt: d.toISOString(),
                mealSlot: 'snack',
                inputMode: 'text',
                mealTypeTags: []
            });
        }

        // Add some regular meals to dilute %. e.g. 3 late, 2 regular = 3/5 = 60% > 30%.
        for (let i = 0; i < 2; i++) {
            const d = new Date();
            d.setHours(12, 0, 0, 0);
            meals.push({
                id: uuidv4(),
                createdAt: d.toISOString(),
                occurredAt: d.toISOString(),
                mealSlot: 'lunch',
                inputMode: 'text',
                mealTypeTags: []
            });
        }

        const context = { meals, moods: [] };
        const result = analyzeLateNightCluster(context);

        expect(result).toHaveLength(1);
        expect(result[0].patternType).toBe('late_night_eating_cluster');
        expect(result[0].confidence).toBe('high');
        expect(result[0].evidence.late_meal_count).toBe(3);
    });
});
