// src/services/healthlab/__tests__/experimentAnalysis.test.ts
import { ExperimentAnalysis } from '../experimentAnalysis';
import { ExperimentDefinition } from '../../../models/healthlab';
import { MealEvent, MoodEvent } from '../../../models/types';

describe('ExperimentAnalysis', () => {
    const mockDefinition: ExperimentDefinition = {
        id: 'test-experiment',
        name: 'Test Study',
        hypothesis: 'Test',
        durationDays: 5,
        baselineWindowDays: 7,
        category: 'nutrition',
        targetMetric: 'avg_energy',
        requiredEvents: ['meal', 'mood']
    };

    const startDate = new Date('2026-03-10T00:00:00Z');
    const endDate = new Date('2026-03-15T00:00:00Z');

    const mockMoods: MoodEvent[] = [
        // Baseline window (March 3 - March 9)
        { id: '1', createdAt: '2026-03-05T12:00:00Z', occurredAt: '2026-03-05T12:00:00Z', energy: 'ok' }, // Val: 3
        { id: '2', createdAt: '2026-03-06T12:00:00Z', occurredAt: '2026-03-06T12:00:00Z', energy: 'ok' }, // Val: 3
        
        // Experiment window (March 10 - March 15)
        { id: '3', createdAt: '2026-03-11T12:00:00Z', occurredAt: '2026-03-11T12:00:00Z', energy: 'high' }, // Val: 5
        { id: '4', createdAt: '2026-03-12T12:00:00Z', occurredAt: '2026-03-12T12:00:00Z', energy: 'high' }, // Val: 5
    ];

    const mockMeals: MealEvent[] = [];

    test('calculates correct baseline and experiment averages', () => {
        const results = ExperimentAnalysis.calculateResults(
            mockDefinition,
            mockMeals,
            mockMoods,
            startDate,
            endDate
        );

        expect(results.baselineValue).toBe(3);
        expect(results.experimentValue).toBe(5);
    });

    test('calculates correct delta percentage', () => {
        const results = ExperimentAnalysis.calculateResults(
            mockDefinition,
            mockMeals,
            mockMoods,
            startDate,
            endDate
        );

        // (5 - 3) / 3 * 100 = 66.66%
        expect(results.delta).toBeCloseTo(66.666, 1);
    });

    test('calculates confidence based on data points', () => {
        const results = ExperimentAnalysis.calculateResults(
            mockDefinition,
            mockMeals,
            mockMoods,
            startDate,
            endDate
        );

        // 4 total moods in window (wait, no, 2 moods in experiment window)
        // Actually, calculateConfidence uses total meals + moods in experiment window
        // Moods 3 and 4 are in the window. 2 points total.
        expect(results.confidence).toBe('low'); 
    });

    test('maps energy correctly', () => {
        expect(ExperimentAnalysis.mapEnergyToValue('high')).toBe(5);
        expect(ExperimentAnalysis.mapEnergyToValue('ok')).toBe(3);
        expect(ExperimentAnalysis.mapEnergyToValue('low')).toBe(1);
    });
});
