// src/services/healthlab/experimentAnalysis.ts
import { MealEvent, MoodEvent } from '../../models/types';
import { ExperimentDefinition, ExperimentMetricType, ExperimentConfidence } from '../../models/healthlab';

export interface AnalysisResults {
    baselineValue: number;
    experimentValue: number;
    delta: number;
    confidence: ExperimentConfidence;
}

export const ExperimentAnalysis = {
    calculateResults(
        definition: ExperimentDefinition,
        meals: MealEvent[],
        moods: MoodEvent[],
        startDate: Date,
        endDate: Date
    ): AnalysisResults {
        const baselineStart = new Date(startDate);
        baselineStart.setDate(baselineStart.getDate() - definition.baselineWindowDays);
        
        const baselineValue = this.getMetricAverage(definition.targetMetric, meals, moods, baselineStart, startDate);
        const experimentValue = this.getMetricAverage(definition.targetMetric, meals, moods, startDate, endDate);
        
        // Handle case where we have no data
        const safeBaseline = baselineValue || 3; // Default to neutral if no baseline
        const delta = safeBaseline !== 0 ? ((experimentValue - safeBaseline) / safeBaseline) * 100 : 0;
        
        const confidence = this.calculateConfidence(
            meals.filter(m => new Date(m.occurredAt) >= startDate && new Date(m.occurredAt) <= endDate),
            moods.filter(m => new Date(m.occurredAt) >= startDate && new Date(m.occurredAt) <= endDate),
            definition
        );

        return {
            baselineValue,
            experimentValue,
            delta,
            confidence
        };
    },

    getMetricAverage(
        metric: ExperimentMetricType,
        meals: MealEvent[],
        moods: MoodEvent[],
        start: Date,
        end: Date
    ): number {
        const windowMoods = moods.filter(m => {
            const date = new Date(m.occurredAt);
            return date >= start && date <= end;
        });

        switch (metric) {
            case 'afternoon_energy': {
                const energyLogs = windowMoods.filter(m => {
                    const hour = new Date(m.occurredAt).getHours();
                    return hour >= 14 && hour <= 16; // 2 PM - 4 PM
                });
                return this.avg(energyLogs.map(m => this.mapEnergyToValue(m.energy)));
            }
            case 'next_day_energy': {
                const morningEnergy = windowMoods.filter(m => {
                    const hour = new Date(m.occurredAt).getHours();
                    return hour >= 6 && hour <= 10;
                });
                return this.avg(morningEnergy.map(m => this.mapEnergyToValue(m.energy)));
            }
            case 'mood_stability': {
                return this.avg(windowMoods.map(m => this.mapMoodToValue(m.valence)));
            }
            case 'stress_frequency': {
                const days = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                const highStress = windowMoods.filter(m => this.mapStressToValue(m.stress) >= 4);
                return highStress.length / days;
            }
            case 'avg_energy':
                return this.avg(windowMoods.map(m => this.mapEnergyToValue(m.energy)));
            case 'avg_mood':
                return this.avg(windowMoods.map(m => this.mapMoodToValue(m.valence)));
            default:
                return 0;
        }
    },

    mapMoodToValue(valence: any): number {
        if (typeof valence === 'number') return valence;
        switch (valence) {
            case 'positive': return 5;
            case 'neutral': return 3;
            case 'negative': return 1;
            default: return 3;
        }
    },

    mapEnergyToValue(energy: any): number {
        switch (energy) {
            case 'high': return 5;
            case 'ok': return 3;
            case 'low': return 1;
            default: return 3;
        }
    },

    mapStressToValue(stress: any): number {
        switch (stress) {
            case 'high': return 5;
            case 'medium': return 3;
            case 'low': return 1;
            default: return 1;
        }
    },

    avg(values: number[]): number {
        if (values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    },

    calculateConfidence(meals: MealEvent[], moods: MoodEvent[], definition: ExperimentDefinition): ExperimentConfidence {
        const dataPointCount = meals.length + moods.length;
        
        // Rough heuristic for Phase 2
        if (dataPointCount > 15) return 'high';
        if (dataPointCount > 5) return 'medium';
        return 'low';
    }
};
