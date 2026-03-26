// src/services/healthlab/experimentAnalysis.ts
import { MealEvent, MoodEvent } from '../../models/types';
import { SymptomEvent } from '../../models/Symptom';
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
        symptoms: SymptomEvent[],
        startDate: Date,
        endDate: Date
    ): AnalysisResults {
        const baselineStart = new Date(startDate);
        baselineStart.setDate(baselineStart.getDate() - definition.baselineWindowDays);
        
        const baselineValue = this.getMetricAverage(definition.targetMetric, meals, moods, symptoms, baselineStart, startDate);
        const experimentValue = this.getMetricAverage(definition.targetMetric, meals, moods, symptoms, startDate, endDate);
        
        // Handle case where we have no data
        const safeBaseline = baselineValue || 3; // Default to neutral if no baseline
        const delta = safeBaseline !== 0 ? ((experimentValue - safeBaseline) / safeBaseline) * 100 : 0;
        
        const confidence = this.calculateConfidence(
            meals.filter(m => new Date(m.occurredAt) >= startDate && new Date(m.occurredAt) <= endDate),
            moods.filter(m => new Date(m.occurredAt) >= startDate && new Date(m.occurredAt) <= endDate),
            symptoms.filter(s => new Date(s.occurredAt) >= startDate && new Date(s.occurredAt) <= endDate),
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
        symptoms: SymptomEvent[],
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
                    return m.symptomType === 'energy' && hour >= 14 && hour <= 16;
                });
                return this.avg(energyLogs.map(m => m.severity));
            }
            case 'next_day_energy': {
                const morningEnergy = windowMoods.filter(m => {
                    const hour = new Date(m.occurredAt).getHours();
                    return m.symptomType === 'energy' && hour >= 6 && hour <= 10;
                });
                return this.avg(morningEnergy.map(m => m.severity));
            }
            case 'mood_stability': {
                const moodLogs = windowMoods.filter(m => m.symptomType === 'mood');
                return this.avg(moodLogs.map(m => m.severity));
            }
            case 'stress_frequency': {
                const days = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                const highStress = windowMoods.filter(m => m.symptomType === 'stress' && m.severity >= 1);
                return highStress.length / days;
            }
            case 'symptom_frequency': {
                const days = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                const windowSymptoms = symptoms.filter(s => {
                    const date = new Date(s.occurredAt);
                    return date >= start && date <= end;
                });
                return windowSymptoms.length / days;
            }
            case 'symptom_severity': {
                const windowSymptoms = symptoms.filter(s => {
                    const date = new Date(s.occurredAt);
                    return date >= start && date <= end;
                });
                return this.avg(windowSymptoms.map(s => s.severity));
            }
            case 'avg_energy':
                return this.avg(windowMoods.filter(m => m.symptomType === 'energy').map(m => m.severity));
            case 'avg_mood':
                return this.avg(windowMoods.filter(m => m.symptomType === 'mood').map(m => m.severity));
            default:
                return 0;
        }
    },


    avg(values: number[]): number {
        if (values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    },

    calculateConfidence(meals: MealEvent[], moods: MoodEvent[], symptoms: SymptomEvent[], definition: ExperimentDefinition): ExperimentConfidence {
        const dataPointCount = meals.length + moods.length + symptoms.length;
        
        // Rough heuristic for Phase 2
        if (dataPointCount > 15) return 'high';
        if (dataPointCount > 5) return 'medium';
        return 'low';
    }
};
