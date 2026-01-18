import { analyzeMoodDipThenEat } from '../../src/core/pattern_engine/patterns/p1_moodDipThenEat';
import { MealEvent, MoodEvent } from '../../src/models/types';
import { v4 as uuidv4 } from 'uuid';

// Simple mock runner (can be run via basic node script if needed, or jest)
// For now, I'll print pass/fail results to console same as verify_patterns.

import { PatternContext } from '../../src/core/pattern_engine/types';

console.log("Running P1 Unit Tests...");

const mockContext: PatternContext = {
    meals: [],
    moods: []
};

// Test Case 1: Insufficient Triggers (< 2)
// 1 trigger only
const now = new Date();
const mood1: MoodEvent = {
    id: uuidv4(),
    createdAt: now.toISOString(),
    occurredAt: now.toISOString(),
    valence: 'negative',
    energy: 'ok',
    stress: 'high'
};
const meal1: MealEvent = {
    id: uuidv4(),
    createdAt: now.toISOString(),
    occurredAt: new Date(now.getTime() + 10 * 60000).toISOString(), // 10 mins later
    mealSlot: 'snack',
    inputMode: 'text',
    mealTypeTags: ['sweet']
};

mockContext.moods = [mood1];
mockContext.meals = [meal1];

const results1 = analyzeMoodDipThenEat(mockContext);
if (results1.length === 0) {
    console.log("✅ Case 1 Passed: No pattern for single trigger.");
} else {
    console.error("❌ Case 1 Failed: Should not trigger.", results1);
}

// Test Case 2: Sufficient Triggers (2) -> Medium Confidence
const mood2: MoodEvent = { ...mood1, id: uuidv4(), occurredAt: new Date(now.getTime() - 86400000).toISOString() }; // Yesterday
const meal2: MealEvent = { ...meal1, id: uuidv4(), occurredAt: new Date(now.getTime() - 86400000 + 10 * 60000).toISOString() };

mockContext.moods = [mood1, mood2];
mockContext.meals = [meal1, meal2];

const results2 = analyzeMoodDipThenEat(mockContext);
if (results2.length === 1 && results2[0].confidence === 'medium') {
    console.log("✅ Case 2 Passed: Pattern detected with Medium confidence.");
} else {
    console.error("❌ Case 2 Failed.", results2);
}

// Test Case 3: Segmentation Check
// Both triggers happened around the same time of day?
// mood1/meal1 = Now. mood2/meal2 = Yesterday same time.
// Since 'now' in verify_patterns runs is usually 'daytime', let's check output.
if (results2.length > 0 && results2[0].segmentation) {
    console.log("✅ Case 3 Passed: Segmentation present:", results2[0].segmentation);
} else {
    console.error("❌ Case 3 Failed: Missing segmentation.");
}
