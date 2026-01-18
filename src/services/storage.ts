import AsyncStorage from '@react-native-async-storage/async-storage';
import { MealEvent, MoodEvent } from '../models/types';
import { generateSeedData } from '../dev/seedData';

const STORAGE_KEYS = {
    MEALS: '@ade_meal_events',
    MOODS: '@ade_mood_events',
};

export const StorageService = {
    async getMealEvents(): Promise<MealEvent[]> {
        try {
            const json = await AsyncStorage.getItem(STORAGE_KEYS.MEALS);
            const parsed = json != null ? JSON.parse(json) : [];

            // Migration: Normalize empty tags to ['unknown']
            return parsed.map((m: any) => ({
                ...m,
                mealTypeTags: (!m.mealTypeTags || m.mealTypeTags.length === 0)
                    ? ['unknown']
                    : m.mealTypeTags
            }));
        } catch (e) {
            console.error('Failed to load meals', e);
            return [];
        }
    },

    async saveMealEvents(meals: MealEvent[]): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
        } catch (e) {
            console.error('Failed to save meals', e);
        }
    },

    async addMealEvent(event: MealEvent): Promise<void> {
        const meals = await this.getMealEvents();
        // Add to beginning if valid, or just re-sort? simpler to unshift and sort if needed
        // Usually new logs are "now", so unshift is safe.
        meals.unshift(event);
        // Ensure sort order just in case
        meals.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
        await this.saveMealEvents(meals);
    },

    async updateMealEvent(updatedEvent: MealEvent): Promise<void> {
        const meals = await this.getMealEvents();
        const index = meals.findIndex(m => m.id === updatedEvent.id);
        if (index !== -1) {
            meals[index] = updatedEvent;
            await this.saveMealEvents(meals);
        }
    },

    async deleteMealEvent(id: string): Promise<void> {
        let meals = await this.getMealEvents();
        meals = meals.filter(m => m.id !== id);
        await this.saveMealEvents(meals);
    },

    // MOODS

    async getMoodEvents(): Promise<MoodEvent[]> {
        try {
            const json = await AsyncStorage.getItem(STORAGE_KEYS.MOODS);
            return json != null ? JSON.parse(json) : [];
        } catch (e) {
            console.error('Failed to load moods', e);
            return [];
        }
    },

    async saveMoodEvents(moods: MoodEvent[]): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.MOODS, JSON.stringify(moods));
        } catch (e) {
            console.error('Failed to save moods', e);
        }
    },

    async addMoodEvent(event: MoodEvent): Promise<void> {
        const moods = await this.getMoodEvents();
        moods.unshift(event);
        moods.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
        await this.saveMoodEvents(moods);
    },

    // UTILS

    async seedDemoLogs(): Promise<void> {
        const { meals, moods } = generateSeedData();
        await this.saveMealEvents(meals);
        await this.saveMoodEvents(moods);
    },

    async clearAllLogs(): Promise<void> {
        await AsyncStorage.multiRemove([STORAGE_KEYS.MEALS, STORAGE_KEYS.MOODS]);
    }
};
