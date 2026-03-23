import { auth } from './firebaseConfig';
import { WeeklyPatternsResponse } from '../models/types';

// Cloud Function URL configuration
const USE_EMULATOR = false;
const PROD_URL = 'https://us-central1-adaptivehealthengine.cloudfunctions.net/weekly_patterns_service';
const LOCAL_URL = 'http://192.168.4.39:5001/adaptivehealthengine/us-central1/weekly_patterns_service';
const BASE_URL = USE_EMULATOR ? LOCAL_URL : PROD_URL;

export const WeeklyPatternsService = {
    async getWeeklySummary(): Promise<WeeklyPatternsResponse> {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        try {
            const token = await user.getIdToken();
            const response = await fetch(`${BASE_URL}/v1/users/${user.uid}/weekly`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Failed to fetch weekly summary: ${response.status} ${response.statusText}. ${errorBody.slice(0, 100)}`);
            }
            return await response.json();
        } catch (error: any) {
            console.error('Weekly summary fetch error:', error);
            throw error;
        }
    },

    async recomputeWeekly(trigger: string = 'manual_refresh'): Promise<WeeklyPatternsResponse> {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        const token = await user.getIdToken();
        const response = await fetch(`${BASE_URL}/v1/users/${user.uid}/weekly/recompute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ trigger }),
        });

        if (!response.ok) {
            throw new Error(`Failed to recompute weekly summary: ${response.statusText}`);
        }
        return await response.json();
    }
};
