import { v4 as uuidv4 } from 'uuid';
import { MealEvent, MoodEvent } from '../../src/models/types';

/**
 * Generates N days of simulated data to evaluate the ML model.
 * Injects a deliberate pattern:
 * - High-intensity meals (heavy, high_sugar) at night lead to low mood the next morning.
 */
export function generateSeedData(days: number): { meals: MealEvent[], moods: MoodEvent[] } {
    const meals: MealEvent[] = [];
    const moods: MoodEvent[] = [];

    const now = new Date();
    // Start `days` ago
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    for (let i = 0; i < days; i++) {
        const currentDate = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);

        // --- Day's Meals ---

        // 8 AM Breakfast
        const breakfastTime = new Date(currentDate);
        breakfastTime.setHours(8, 0, 0, 0);
        meals.push({
            id: uuidv4(),
            mealSlot: 'breakfast',
            createdAt: breakfastTime.toISOString(),
            occurredAt: breakfastTime.toISOString(),
            inputMode: 'text'
        });

        // 1 PM Lunch
        const lunchTime = new Date(currentDate);
        lunchTime.setHours(13, 0, 0, 0);
        meals.push({
            id: uuidv4(),
            mealSlot: 'lunch',
            createdAt: lunchTime.toISOString(),
            occurredAt: lunchTime.toISOString(),
            inputMode: 'text'
        });

        // 7 PM Dinner
        const dinnerTime = new Date(currentDate);
        dinnerTime.setHours(19, 0, 0, 0);
        meals.push({
            id: uuidv4(),
            mealSlot: 'dinner',
            createdAt: dinnerTime.toISOString(),
            occurredAt: dinnerTime.toISOString(),
            inputMode: 'text'
        });

        // PATTERN INJECTION: 
        // ~60% chance of a late night heavy snack
        const isLateNightSnack = Math.random() < 0.6;
        if (isLateNightSnack) {
            const snackTime = new Date(currentDate);
            snackTime.setHours(23, 30, 0, 0);
            meals.push({
                id: uuidv4(),
                mealSlot: 'snack',
                createdAt: snackTime.toISOString(),
                occurredAt: snackTime.toISOString(),
                inputMode: 'text'
            });

            // Consequence mood within 4 hours to trigger P4 Association pattern
            const consequenceMoodTime = new Date(currentDate);
            consequenceMoodTime.setDate(consequenceMoodTime.getDate() + 1);
            consequenceMoodTime.setHours(1, 30, 0, 0); // 1:30 AM
            
            moods.push({
                id: uuidv4(),
                linkedMealEventId: meals[meals.length - 1].id,
                valence: -2, // Strong negative
                createdAt: consequenceMoodTime.toISOString(),
                occurredAt: consequenceMoodTime.toISOString()
            });
        }

        // --- Day's Moods ---

        // 9 AM Mood (Generic)
        const morningMoodTime = new Date(currentDate);
        morningMoodTime.setHours(9, 0, 0, 0);
        moods.push({
            id: uuidv4(),
            linkedMealEventId: meals[0].id,
            valence: 2, // Strong positive
            createdAt: morningMoodTime.toISOString(),
            occurredAt: morningMoodTime.toISOString()
        });

        // 2 PM Mood
        const afternoonMoodTime = new Date(currentDate);
        afternoonMoodTime.setHours(14, 0, 0, 0);
        moods.push({
            id: uuidv4(),
            valence: 0, // Neutral
            createdAt: afternoonMoodTime.toISOString(),
            occurredAt: afternoonMoodTime.toISOString()
        });
    }

    return { meals, moods };
}
