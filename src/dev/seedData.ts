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

        // Base Schedule: Breakfast (8am), Lunch (12pm), Dinner (7pm)
        const baseSlots: { slot: MealSlot, hour: number, tags: MealTypeTag[] }[] = [
            { slot: 'breakfast', hour: 8, tags: ['light', 'homemade', 'high_fiber'] },
            { slot: 'lunch', hour: 12, tags: ['regular', 'savory'] },
            { slot: 'dinner', hour: 19, tags: ['heavy', 'savory'] },
        ];

        // P2 & P3 Bias: Late Night Snacks on Weekends
        // Force late night snacks on Fri (5), Sat (6), Sun (0), Mon (1) to hit > 3 threshold
        // Actually, let's just do it on 4 random days to ensure P2 hits.
        const forceLateNight = (i % 2 === 0); // Every other day: 0, 2, 4, 6 (4 days)
        // This gives 4 late night meals -> Triggers P2 (min 3)

        if (forceLateNight) {
            baseSlots.push({ slot: 'snack', hour: 22, tags: ['high_sugar', 'sweet', 'packaged'] });
        }

        baseSlots.forEach(({ slot, hour, tags }) => {
            const mealTime = new Date(date);
            mealTime.setHours(hour, 15); // always XX:15

            const id = uuidv4();
            if (tags.length === 0) tags.push('unknown');

            meals.push({
                id,
                createdAt: mealTime.toISOString(),
                occurredAt: mealTime.toISOString(),
                mealSlot: slot,
                inputMode: 'text',
                mealTypeTags: tags,
                textDescription: `Seed ${slot}`,
            });

            // P4 Bias: High Sugar -> Negative Mood
            // If we just ate high_sugar at 22:15, let's log a negative mood at 23:30
            if (tags.includes('high_sugar')) {
                const moodTime = new Date(mealTime);
                moodTime.setHours(hour + 1, 30); // 1hr 15m later

                moods.push({
                    id: uuidv4(),
                    createdAt: moodTime.toISOString(),
                    occurredAt: moodTime.toISOString(),
                    valence: 'negative',
                    stress: 'low',
                    energy: 'low',
                    tag: 'sad',
                    notes: 'Felt bad after sweets'
                });
            }
        });

        // P1 Bias: Mood Dip -> Eat (Dinner)
        // On days 1, 3, 5: High Stress at 6:00 PM (18:00), Dinner is at 19:15.
        // Gap is 1h 15m. Wait, P1 is < 60 mins.
        // Let's make Mood at 18:30. Dinner at 19:15. Gap = 45 mins. Perfect.
        if (i % 2 !== 0) { // Days 1, 3, 5
            const moodTime = new Date(date);
            moodTime.setHours(18, 30);

            moods.push({
                id: uuidv4(),
                createdAt: moodTime.toISOString(),
                occurredAt: moodTime.toISOString(),
                valence: 'negative', // triggers dip
                stress: 'high',
                energy: 'low',
                tag: 'anxious',
                notes: 'Work stress'
            });
        } else {
            // Normal mood otherwise
            const moodTime = new Date(date);
            moodTime.setHours(10, 0);
            moods.push({
                id: uuidv4(),
                createdAt: moodTime.toISOString(),
                occurredAt: moodTime.toISOString(),
                valence: 'positive',
                stress: 'low',
                energy: 'ok',
                tag: 'celebratory'
            });
        }
    }

    // Sort by occurredAt desc
    meals.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    moods.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    return { meals, moods };
};
