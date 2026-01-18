import { runPatternEngine } from '../core/pattern_engine/index';
import { generateSeedData } from './seedData';
import { MealEvent, MoodEvent } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

console.log("Running Pattern Engine Verification...");

// 1. Run against standard seed data
const { meals, moods } = generateSeedData();
console.log(`Loaded ${meals.length} meals and ${moods.length} moods from seed.`);

const patterns = runPatternEngine(meals, moods);
console.log(`\nDetected ${patterns.length} patterns from Standard Seed:`);
patterns.forEach(p => {
    console.log(`[${p.patternType}] ${p.title} (${p.confidence}): ${p.description}`);
});

// 2. Create Fabricated Data for Specific P2 (Late Night)
console.log("\n--- Testing P2: Late Night Cluster ---");
const lateMeals: MealEvent[] = [];
for (let i = 0; i < 4; i++) {
    const d = new Date();
    d.setHours(22, 0, 0, 0); // 10 PM
    d.setDate(d.getDate() - i);
    lateMeals.push({
        id: uuidv4(),
        createdAt: d.toISOString(),
        occurredAt: d.toISOString(),
        mealSlot: 'snack',
        inputMode: 'text',
        mealTypeTags: ['sweet'],
        textDescription: 'Late snack'
    });
}
const p2Results = runPatternEngine(lateMeals, []); // No moods needed for P2
const p2 = p2Results.find(p => p.patternType === 'late_night_eating_cluster');
if (p2) {
    console.log("✅ P2 Detected:", p2.description);
} else {
    console.error("❌ P2 FAILED to detect late night cluster");
}

// 3. Create Fabricated Data for P1 (Mood Dip -> Eat)
console.log("\n--- Testing P1: Mood Dip -> Eat ---");
const p1Meals: MealEvent[] = [];
const p1Moods: MoodEvent[] = [];
const now = new Date();

// Case 1: High Stress -> Eat 30m later
const time1 = new Date(now);
p1Moods.push({
    id: uuidv4(),
    createdAt: time1.toISOString(),
    occurredAt: time1.toISOString(),
    valence: 'neutral',
    energy: 'ok',
    stress: 'high'
});
const time1_eat = new Date(time1);
time1_eat.setMinutes(time1.getMinutes() + 30);
p1Meals.push({
    id: uuidv4(),
    createdAt: time1_eat.toISOString(),
    occurredAt: time1_eat.toISOString(),
    mealSlot: 'snack',
    inputMode: 'text',
    mealTypeTags: ['savory']
});

// Case 2: Negative -> Eat 15m later
const time2 = new Date(now);
time2.setDate(time2.getDate() - 1);
p1Moods.push({
    id: uuidv4(),
    createdAt: time2.toISOString(),
    occurredAt: time2.toISOString(),
    valence: 'negative',
    energy: 'low',
    stress: 'medium'
});
const time2_eat = new Date(time2);
time2_eat.setMinutes(time2.getMinutes() + 15);
p1Meals.push({
    id: uuidv4(),
    createdAt: time2_eat.toISOString(),
    occurredAt: time2_eat.toISOString(),
    mealSlot: 'snack',
    inputMode: 'text',
    mealTypeTags: ['sweet']
});

const p1Results = runPatternEngine(p1Meals, p1Moods);
const p1 = p1Results.find(p => p.patternType === 'mood_dip_then_eat');
if (p1) {
    console.log("✅ P1 Detected:", p1.description, p1.evidence);
} else {
    console.error("❌ P1 FAILED to detect mood dip trigger");
}

// 4. Create Fabricated Data for P3 (Weekday/Weekend Shift)
console.log("\n--- Testing P3: Weekday vs Weekend Shift ---");
const p3Meals: MealEvent[] = [];
const p3Weekdays = ['2023-10-23', '2023-10-24', '2023-10-25', '2023-10-26', '2023-10-27']; // Mon-Fri
const p3Weekend = ['2023-10-28', '2023-10-29']; // Sat-Sun (Simulated dates)

// 1 snack per weekday (Freq = 1.0)
p3Weekdays.forEach(date => {
    const d = new Date(date + 'T12:00:00Z');
    p3Meals.push({
        id: uuidv4(),
        createdAt: d.toISOString(),
        occurredAt: d.toISOString(),
        mealSlot: 'snack',
        inputMode: 'text',
        mealTypeTags: ['light']
    });
});

// 3 snacks per weekend day (Freq = 3.0) -> Ratio 3.0
p3Weekend.forEach(date => {
    for (let i = 0; i < 3; i++) {
        const d = new Date(date + 'T14:00:00Z');
        p3Meals.push({
            id: uuidv4(),
            createdAt: d.toISOString(),
            occurredAt: d.toISOString(),
            mealSlot: 'snack',
            inputMode: 'text',
            mealTypeTags: ['sweet']
        });
    }
});

const p3Results = runPatternEngine(p3Meals, []);
const p3 = p3Results.find(p => p.patternType === 'weekday_weekend_shift');
if (p3) {
    console.log("✅ P3 Detected:", p3.description);
} else {
    // Note: Javascript Date.getDay() depends on local time if string parsing isn't strict. 
    // But ISO string 'Z' is UTC. verify_patterns logic uses simple new Date(occurredAt). 
    // Ideally this works.
    console.error("❌ P3 FAILED to detect shift");
}

// 5. Create Fabricated Data for P4 (Meal Type Association)
console.log("\n--- Testing P4: Meal Type -> Mood Shift ---");
const p4Meals: MealEvent[] = [];
const p4Moods: MoodEvent[] = [];
const baseTime = new Date('2023-11-01T12:00:00Z');

// Create 3 High Sugar meals, 2 followed by Negative mood (66%)
for (let i = 0; i < 3; i++) {
    const mTime = new Date(baseTime);
    mTime.setDate(baseTime.getDate() + i);

    p4Meals.push({
        id: uuidv4(),
        createdAt: mTime.toISOString(),
        occurredAt: mTime.toISOString(),
        mealSlot: 'snack',
        inputMode: 'text',
        mealTypeTags: ['high_sugar']
    });

    if (i < 2) { // First 2 are crashes
        const moodTime = new Date(mTime);
        moodTime.setHours(mTime.getHours() + 2);
        p4Moods.push({
            id: uuidv4(),
            createdAt: moodTime.toISOString(),
            occurredAt: moodTime.toISOString(),
            valence: 'negative',
            energy: 'low',
            stress: 'medium'
        });
    } else { // Last one is ok
        const moodTime = new Date(mTime);
        moodTime.setHours(mTime.getHours() + 2);
        p4Moods.push({
            id: uuidv4(),
            createdAt: moodTime.toISOString(),
            occurredAt: moodTime.toISOString(),
            valence: 'positive',
            energy: 'high',
            stress: 'low'
        });
    }
}

const p4Results = runPatternEngine(p4Meals, p4Moods);
const p4 = p4Results.find(p => p.patternType === 'meal_type_mood_association');
if (p4) {
    console.log("✅ P4 Detected:", p4.description);
} else {
    console.error("❌ P4 FAILED to detect association");
}

console.log("\nVerification Complete.");
