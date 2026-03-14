import { MealEvent, MoodEvent } from '../../models/types';
import { SymptomEvent } from '../../models/Symptom';

export type PatternType =
    | 'mood_dip_then_eat'
    | 'late_night_eating_cluster'
    | 'weekday_weekend_shift'
    | 'meal_type_mood_association'
    | 'symptom_correlation';

export interface Segmentation {
    timeOfDay?: 'morning' | 'afternoon' | 'night' | 'late_night' | 'mixed';
    dayType?: 'weekday' | 'weekend' | 'mixed';
}

export interface Pattern {
    id: string;
    patternType: PatternType;
    title: string;
    description: string;
    confidence: 'low' | 'medium' | 'high';
    severity?: 'low' | 'medium' | 'high';
    evidence: Record<string, any>;
    segmentation?: Segmentation;
    windowStart: string; // ISO
    windowEnd: string; // ISO
    createdAt: string; // ISO
}

export interface PatternContext {
    meals: MealEvent[];
    moods: MoodEvent[];
    symptoms?: SymptomEvent[]; // optional for backward compatibility
}
