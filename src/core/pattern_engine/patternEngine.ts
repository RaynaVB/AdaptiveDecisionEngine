import { Pattern, PatternContext } from './types';
import { analyzeMoodDipThenEat } from './patterns/p1_moodDipThenEat';
import { analyzeLateNightCluster } from './patterns/p2_lateNightCluster';
import { analyzeWeekdayWeekendShift } from './patterns/p3_weekdayWeekendShift';
import { analyzeMealTypeMoodAssociation } from './patterns/p4_mealTypeMoodAssociation';
import { analyzeSymptomCorrelations } from './patterns/p5_symptomCorrelations';
import { MealEvent, MoodEvent } from '../../models/types';
import { SymptomEvent } from '../../models/Symptom';

export const runPatternEngine = (meals: MealEvent[], moods: MoodEvent[], symptoms?: SymptomEvent[]): Pattern[] => {
    const context: PatternContext = { meals, moods, symptoms };
    const patterns: Pattern[] = [];

    // Run each analyzer
    patterns.push(...analyzeMoodDipThenEat(context));
    patterns.push(...analyzeLateNightCluster(context));
    patterns.push(...analyzeWeekdayWeekendShift(context));
    patterns.push(...analyzeMealTypeMoodAssociation(context));
    patterns.push(...analyzeSymptomCorrelations(context));

    // Dedup or sort by confidence? (V1: Return all)
    return patterns;
};
