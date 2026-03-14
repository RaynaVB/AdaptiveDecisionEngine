import { Pattern, PatternContext } from '../types';
import { MealEvent } from '../../../models/types';
import { SymptomEvent } from '../../../models/Symptom';
import { v4 as uuidv4 } from 'uuid';

export const analyzeSymptomCorrelations = (context: PatternContext): Pattern[] => {
    const patterns: Pattern[] = [];
    const { meals, moods, symptoms } = context;

    if (!symptoms || symptoms.length === 0) return patterns;

    const MIN_SYMPTOMS_FOR_PATTERN = 2; // For demonstration, keeping threshold low
    
    // Simple multivariate grouping for demo: 
    // We group symptoms by type and check if there's a clustering of meals immediately prior.
    
    // Group symptoms by type
    const symptomsByType: Record<string, SymptomEvent[]> = {};
    symptoms.forEach(sym => {
        if (!symptomsByType[sym.symptomType]) symptomsByType[sym.symptomType] = [];
        symptomsByType[sym.symptomType].push(sym);
    });

    for (const [symptomType, symEvents] of Object.entries(symptomsByType)) {
        if (symEvents.length >= MIN_SYMPTOMS_FOR_PATTERN) {
            
            // Check for meals in a 0-6h window before these symptoms
            let mealsBeforeCount = 0;
            const mealImpactTagsCounter: Record<string, number> = {};

            symEvents.forEach(symEvent => {
                const symTime = new Date(symEvent.occurredAt).getTime();
                
                // Find meals 0-6h before this symptom
                const mealsBefore = meals.filter(m => {
                    const mealTime = new Date(m.occurredAt).getTime();
                    return mealTime < symTime && (symTime - mealTime) <= 6 * 60 * 60 * 1000;
                });

                if (mealsBefore.length > 0) mealsBeforeCount++;

                mealsBefore.forEach(m => {
                    m.mealTypeTags.forEach(tag => {
                        mealImpactTagsCounter[tag] = (mealImpactTagsCounter[tag] || 0) + 1;
                    });
                });
            });

            // If a common trait exists:
            if (mealsBeforeCount > 0) {
                // Find most common meal tag associated with this symptom
                const topTagEntry = Object.entries(mealImpactTagsCounter).sort((a, b) => b[1] - a[1])[0];
                
                if (topTagEntry && topTagEntry[1] >= Math.max(1, symEvents.length * 0.5)) {
                    patterns.push({
                        id: uuidv4(),
                        patternType: 'symptom_correlation',
                        title: `Possible Trigger: ${topTagEntry[0]} and ${symptomType}`,
                        description: `We noticed that your ${symptomType} often occurs 0-6 hours after logging ${topTagEntry[0]} meals.`,
                        confidence: 'medium',
                        severity: 'medium',
                        evidence: {
                            symptomCount: symEvents.length,
                            mealsCorrelatedCount: topTagEntry[1],
                            tag: topTagEntry[0]
                        },
                        windowStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                        windowEnd: new Date().toISOString(),
                        createdAt: new Date().toISOString()
                    });
                }
            }
        }
    }

    return patterns;
};
