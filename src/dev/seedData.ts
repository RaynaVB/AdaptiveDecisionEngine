import { v4 as uuidv4 } from 'uuid';
import { MealEvent, MoodEvent, MealSlot, MealTypeTag, MoodValence, MoodStress, MoodEnergy, MoodTag } from '../models/types';

export const generateSeedData = (): { meals: MealEvent[], moods: MoodEvent[] } => {
    const meals: MealEvent[] = [];
    const moods: MoodEvent[] = [];

    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    // Generate for last 7 days
    for (let i = 0; i < 7; i++) {
        const dayOffset = i;
        const date = new Date(now.getTime() - dayOffset * oneDay);
        const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Daily meals
        const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner'];
        if (Math.random() > 0.3) slots.push('snack'); // 70% chance of snack

        slots.forEach(slot => {
            // Time logic
            let hour = 8;
            if (slot === 'lunch') hour = 12;
            if (slot === 'dinner') hour = 19;
            if (slot === 'snack') hour = 15;

            // Late night snack logic
            if (slot === 'snack' && Math.random() > 0.7) {
                hour = 22; // Late night
            }

            // Add some randomness to time
            const mealTime = new Date(date);
            mealTime.setHours(hour, Math.floor(Math.random() * 60));

            const id = uuidv4();
            const tags: MealTypeTag[] = [];

            // Tag logic
            if (slot === 'breakfast') {
                tags.push(Math.random() > 0.5 ? 'light' : 'regular');
                tags.push('homemade');
            } else if (slot === 'dinner') {
                if (isWeekend) {
                    tags.push('heavy', 'restaurant', 'savory');
                } else {
                    tags.push('regular', 'homemade', 'savory');
                }
            } else if (slot === 'snack') {
                if (hour >= 20) {
                    tags.push('regular', 'sweet', 'packaged', 'high_sugar'); // Stress eating?
                } else {
                    tags.push('light', 'packaged');
                }
            } else {
                tags.push('regular', 'homemade');
            }

            if (tags.length === 0) tags.push('unknown');

            meals.push({
                id,
                createdAt: mealTime.toISOString(),
                occurredAt: mealTime.toISOString(),
                mealSlot: slot,
                inputMode: Math.random() > 0.5 ? 'text' : 'photo', // Simulator might not have photos
                mealTypeTags: tags,
                textDescription: `Seed ${slot} on ${date.toLocaleDateString()}`,
            });
        });

        // Moods
        // Random moods throughout the day, maybe correlatd with late night snacks
        const numMoods = Math.floor(Math.random() * 3) + 1; // 1-3 moods
        for (let m = 0; m < numMoods; m++) {
            const moodTime = new Date(date);
            moodTime.setHours(9 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60)); // 9am to 9pm

            let valence: MoodValence = 'neutral';
            let stress: MoodStress = 'low';
            let energy: MoodEnergy = 'ok';
            let tag: MoodTag | undefined = undefined;

            // Artificial correlation: high stress in evening
            if (moodTime.getHours() > 18 && Math.random() > 0.6) {
                stress = 'high';
                valence = 'negative';
                tag = 'anxious';
            } else if (isWeekend && moodTime.getHours() > 12) {
                valence = 'positive';
                tag = 'celebratory';
                energy = 'high';
            }

            moods.push({
                id: uuidv4(),
                createdAt: moodTime.toISOString(),
                occurredAt: moodTime.toISOString(),
                valence,
                stress,
                energy,
                tag,
                notes: 'Seed mood'
            });
        }
    }

    // Sort by occurredAt desc
    meals.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    moods.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    return { meals, moods };
};
