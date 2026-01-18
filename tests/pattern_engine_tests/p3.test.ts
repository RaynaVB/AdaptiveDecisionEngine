jest.mock('uuid', () => ({
    v4: () => 'test-uuid-1234'
}));

import { analyzeWeekdayWeekendShift } from '../../src/core/pattern_engine/patterns/p3_weekdayWeekendShift';
import { MealEvent } from '../../src/models/types';
import { v4 as uuidv4 } from 'uuid';
import { PatternContext } from '../../src/core/pattern_engine/types';

describe('P3: Weekday/Weekend Shift', () => {
    test('Should detect Weekend Binge (High Weekend Freq)', () => {
        const meals: MealEvent[] = [];

        // 2 Weekends (Sat/Sun) with MANY snacks
        // Sat 1
        for (let i = 0; i < 4; i++) {
            const d = new Date('2024-01-13T14:00:00'); // Saturday
            meals.push({ id: uuidv4(), occurredAt: d.toISOString(), mealSlot: 'snack', inputMode: 'text', mealTypeTags: [], createdAt: '' });
        }
        // Sun 1
        for (let i = 0; i < 4; i++) {
            const d = new Date('2024-01-14T14:00:00'); // Sunday
            meals.push({ id: uuidv4(), occurredAt: d.toISOString(), mealSlot: 'snack', inputMode: 'text', mealTypeTags: [], createdAt: '' });
        }

        // 5 Weekdays (Mon-Fri) with FEW snacks
        for (let i = 15; i < 20; i++) {
            const d = new Date(`2024-01-${i}T14:00:00`);
            // 1 snack per day on weekday
            meals.push({ id: uuidv4(), occurredAt: d.toISOString(), mealSlot: 'snack', inputMode: 'text', mealTypeTags: [], createdAt: '' });
        }

        // Summary:
        // Weekend: 8 snacks / 2 days = 4.0 freq
        // Weekday: 5 snacks / 5 days = 1.0 freq
        // Ratio: 4.0

        const context: PatternContext = { meals, moods: [] };
        const result = analyzeWeekdayWeekendShift(context);

        expect(result).toHaveLength(1);
        expect(result[0].patternType).toBe('weekday_weekend_shift');
        expect(result[0].title).toContain('Weekend');
        expect(parseFloat(result[0].evidence.ratio)).toBeGreaterThan(3.9);
    });
});
