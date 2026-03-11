import { MoodEvent } from '../../../models/types';

/**
 * Context Vector features:
 * [0] Weighted Mood Valence (-1.0 to 1.0)
 * [1] Weighted Mood Arousal (-1.0 to 1.0)
 * [2] Hour of Day (0-23)
 * [3] Day of Week (0-6, where 0 is Sunday)
 */
export type ContextVector = [number, number, number, number];

const WINDOW_HOURS = 4;
const LAMBDA_SPIKE = 2.0; // Decay constant for 'high' energy or 'high' stress moods
const LAMBDA_PERSISTENT = 0.3; // Decay constant for others

export function getDecayConstant(mood: MoodEvent): number {
    if (mood.energy === 'high' || mood.stress === 'high') {
        return LAMBDA_SPIKE;
    }
    return LAMBDA_PERSISTENT;
}

export function calculateMoodInfluenceWeight(deltaHours: number, lambda: number): number {
    // W = e^(-lambda * delta_t)
    return Math.exp(-lambda * deltaHours);
}

function parseValence(valence: number | 'positive' | 'neutral' | 'negative' | undefined): number {
    if (typeof valence === 'number') {
        return valence;
    }
    if (valence === 'positive') return 0.8;
    if (valence === 'negative') return -0.8;
    return 0; // neutral or undefined
}

function parseArousal(arousal: number | undefined, energy: 'high' | 'ok' | 'low' | undefined): number {
    if (typeof arousal === 'number') {
        return arousal;
    }
    if (energy === 'high') return 0.8;
    if (energy === 'low') return -0.8;
    return 0; // ok or undefined
}

export function buildContextVector(targetTimeMs: number, moods: MoodEvent[]): ContextVector {
    const targetDate = new Date(targetTimeMs);
    const hourOfDay = targetDate.getHours();
    const dayOfWeek = targetDate.getDay();

    const windowStartMs = targetTimeMs - (WINDOW_HOURS * 60 * 60 * 1000);
    
    // Filter moods to the 4-hour window before targetTime
    const windowMoods = moods.filter(m => {
        const moodTimeMs = new Date(m.occurredAt).getTime();
        return moodTimeMs >= windowStartMs && moodTimeMs <= targetTimeMs;
    });

    if (windowMoods.length === 0) {
        // No mood context in the last 4 hours
        return [0, 0, hourOfDay, dayOfWeek];
    }

    let totalWeightedValence = 0;
    let totalWeightedArousal = 0;
    let totalWeight = 0;

    for (const mood of windowMoods) {
        const moodTimeMs = new Date(mood.occurredAt).getTime();
        const deltaHours = (targetTimeMs - moodTimeMs) / (1000 * 60 * 60);
        
        const lambda = getDecayConstant(mood);
        const weight = calculateMoodInfluenceWeight(deltaHours, lambda);

        const valence = parseValence(mood.valence);
        const arousal = parseArousal(mood.arousal, mood.energy);

        totalWeightedValence += valence * weight;
        totalWeightedArousal += arousal * weight;
        totalWeight += weight;
    }

    if (totalWeight === 0) {
        return [0, 0, hourOfDay, dayOfWeek];
    }

    // Average the weighted values
    const avgWeightedValence = totalWeightedValence / totalWeight;
    const avgWeightedArousal = totalWeightedArousal / totalWeight;

    return [avgWeightedValence, avgWeightedArousal, hourOfDay, dayOfWeek];
}
