import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'veyra_alert_suppressions';
const SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface Suppression {
    ingredient: string;
    expiresAt: number;
}

export const AlertSuppressionService = {
    /**
     * Snooze alerts for a specific ingredient for 24 hours.
     */
    async snoozeIngredient(ingredient: string): Promise<void> {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            const suppressions: Record<string, number> = raw ? JSON.parse(raw) : {};
            
            suppressions[ingredient.toLowerCase()] = Date.now() + SNOOZE_DURATION_MS;
            
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(suppressions));
        } catch (e) {
            console.warn('[AlertSuppression] Failed to snooze', e);
        }
    },

    /**
     * Returns true if the ingredient is currently snoozed.
     */
    async isSnoozed(ingredient: string): Promise<boolean> {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            if (!raw) return false;
            
            const suppressions: Record<string, number> = JSON.parse(raw);
            const expiry = suppressions[ingredient.toLowerCase()];
            
            if (!expiry) return false;
            
            if (Date.now() > expiry) {
                // Cleanup expired suppression
                delete suppressions[ingredient.toLowerCase()];
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(suppressions));
                return false;
            }
            
            return true;
        } catch (e) {
            console.warn('[AlertSuppression] Check failed', e);
            return false;
        }
    },

    /**
     * Clear all snoozed alerts.
     */
    async clearAll(): Promise<void> {
        await AsyncStorage.removeItem(STORAGE_KEY);
    }
};
