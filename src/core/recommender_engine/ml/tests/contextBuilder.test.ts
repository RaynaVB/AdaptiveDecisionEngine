import { buildContextVector } from '../contextBuilder';
import { MoodEvent } from '../../../../models/types';

describe('contextBuilder', () => {

    const createMoodEvent = (
        occurredAt: string,
        valence: number | 'positive' | 'neutral' | 'negative' | undefined,
        energy: 'high' | 'ok' | 'low' | undefined,
        stress: 'low' | 'medium' | 'high' = 'low'
    ): MoodEvent => {
        return {
            id: 'mock-uuid',
            createdAt: occurredAt,
            occurredAt,
            valence,
            energy,
            stress
        };
    };

    it('returns empty context if no moods in window', () => {
        const targetTimeMs = new Date('2026-03-10T15:00:00Z').getTime();
        // Mood is 5 hours old
        const mood = createMoodEvent('2026-03-10T10:00:00Z', 'positive', 'high');
        const context = buildContextVector(targetTimeMs, [mood]);

        // [0: valence, 1: arousal, 2: hourOfDay, 3: dayOfWeek]
        // 15:00 UTC -> depends on timezone of test runner, just check indices 0 and 1 are 0
        expect(context[0]).toBe(0);
        expect(context[1]).toBe(0);
    });

    it('correctly parses string valences and energies', () => {
        const targetTimeMs = new Date('2026-03-10T15:00:00Z').getTime();
        // Mood is exactly at target time (delta = 0, weight = 1)
        const mood = createMoodEvent('2026-03-10T15:00:00Z', 'positive', 'high');
        const context = buildContextVector(targetTimeMs, [mood]);

        expect(context[0]).toBe(0.8); // positive -> 0.8
        expect(context[1]).toBe(0.8); // high energy -> 0.8
    });

    it('averages multiple moods with different weights based on recency', () => {
        const targetTimeMs = new Date('2026-03-10T15:00:00Z').getTime();
        
        // Mood 1: 3 hours ago, low stress (lambda = 0.3)
        // delta = 3 => weight = e^(-0.9) = 0.406...
        const mood1 = createMoodEvent('2026-03-10T12:00:00Z', 'positive', 'ok', 'low'); // valence 0.8, arousal 0
        
        // Mood 2: 0 hours ago, high stress (lambda = 2.0)
        // delta = 0 => weight = e^0 = 1.0
        const mood2 = createMoodEvent('2026-03-10T15:00:00Z', 'negative', 'low', 'high'); // valence -0.8, arousal -0.8

        const context = buildContextVector(targetTimeMs, [mood1, mood2]);

        const weight1 = Math.exp(-0.3 * 3);
        const weight2 = 1.0;
        const totalWeight = weight1 + weight2;

        const expectedValence = ((0.8 * weight1) + (-0.8 * weight2)) / totalWeight;
        const expectedArousal = ((0 * weight1) + (-0.8 * weight2)) / totalWeight;

        expect(context[0]).toBeCloseTo(expectedValence);
        expect(context[1]).toBeCloseTo(expectedArousal);
    });
});
