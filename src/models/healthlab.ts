// src/models/healthlab.ts

export type ExperimentCategory = 'nutrition' | 'timing' | 'energy' | 'stress' | 'symptom';
export type ExperimentMetricType = 
    | 'avg_mood' 
    | 'avg_energy' 
    | 'stress_frequency' 
    | 'late_night_meal_count' 
    | 'meal_timing_variance'
    | 'afternoon_energy'
    | 'next_day_energy'
    | 'mood_stability'
    | 'symptom_frequency'
    | 'symptom_severity';

export type ExperimentStatus = 'active' | 'completed' | 'abandoned';
export type ExperimentConfidence = 'low' | 'medium' | 'high';

export interface ExperimentDefinition {
    id: string;
    name: string;
    category: ExperimentCategory;
    hypothesis: string;
    durationDays: number;
    baselineWindowDays: number;
    targetMetric: ExperimentMetricType;
    requiredEvents: string[]; // e.g. ["breakfast_log", "energy_log"]
}

export interface ExperimentRun {
    id: string;
    userId: string;
    experimentId: string;
    startDate: string; // ISO string
    endDate?: string;  // ISO string
    status: ExperimentStatus;
    
    // Results (populated when completed)
    baselineValue?: number;
    experimentValue?: number;
    resultDelta?: number; // percentage change
    confidenceScore?: ExperimentConfidence;
    
    // Metadata
    createdAt: string;
    updatedAt: string;
}

export interface ExperimentMetrics {
    avg_energy?: number;
    avg_mood?: number;
    stress_frequency?: number;
    meal_timing_variance?: number;
}
