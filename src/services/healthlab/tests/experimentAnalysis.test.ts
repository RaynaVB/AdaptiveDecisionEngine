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
        { id: '1', createdAt: '2026-03-05T12:00:00Z', occurredAt: '2026-03-05T12:00:00Z', symptomType: 'energy', category: 'energy', severity: 1, source: 'manual', isOngoing: false },
        { id: '2', createdAt: '2026-03-06T12:00:00Z', occurredAt: '2026-03-06T12:00:00Z', symptomType: 'energy', category: 'energy', severity: 1, source: 'manual', isOngoing: false },
        
        // Experiment window (March 10 - March 15)
        { id: '3', createdAt: '2026-03-11T12:00:00Z', occurredAt: '2026-03-11T12:00:00Z', symptomType: 'energy', category: 'energy', severity: 2, source: 'manual', isOngoing: false },
        { id: '4', createdAt: '2026-03-12T12:00:00Z', occurredAt: '2026-03-12T12:00:00Z', symptomType: 'energy', category: 'energy', severity: 2, source: 'manual', isOngoing: false },
    ];

    const mockMeals: MealEvent[] = [];

    test('calculates correct baseline and experiment averages', () => {
        const results = ExperimentAnalysis.calculateResults(
            mockDefinition,
            mockMeals,
            mockMoods,
            [],
            startDate,
            endDate
        );

        expect(results.baselineValue).toBe(1);
        expect(results.experimentValue).toBe(2);
    });

    test('calculates correct delta percentage', () => {
        const results = ExperimentAnalysis.calculateResults(
            mockDefinition,
            mockMeals,
            mockMoods,
            [],
            startDate,
            endDate
        );

        // (2 - 1) / 1 * 100 = 100%
        expect(results.delta).toBe(100);
    });

    test('calculates confidence based on data points', () => {
        const results = ExperimentAnalysis.calculateResults(
            mockDefinition,
            mockMeals,
            mockMoods,
            [],
            startDate,
            endDate
        );

        expect(results.confidence).toBe('low'); 
    });
});
