import { MealEvent, MoodEvent } from '../../models/types';

export type PatternType =
    | 'mood_dip_then_eat'
    | 'late_night_eating_cluster'
    | 'weekday_weekend_shift'
    | 'meal_type_mood_association';

export interface Pattern {
    id: string;
    patternType: PatternType;
    title: string;
    description: string;
    confidence: 'low' | 'medium' | 'high';
    severity?: 'low' | 'medium' | 'high';
    evidence: Record<string, any>;
    segmentation?: {
        timeOfDay?: 'morning' | 'afternoon' | 'night' | 'late_night' | 'mixed';
        dayType?: 'weekday' | 'weekend' | 'mixed';
    };
    windowStart: string; // ISO
    windowEnd: string; // ISO
    createdAt: string; // ISO
}

export interface PatternContext {
    meals: MealEvent[];
    moods: MoodEvent[];
}
