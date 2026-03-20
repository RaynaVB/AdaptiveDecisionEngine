import { auth } from './firebaseConfig';
import { InsightFeedResponse } from '../models/types';

// Cloud Function URL configuration
const USE_EMULATOR = false;
const PROD_URL = 'https://insights-service-n5p5ozwbwa-uc.a.run.app'; // Placeholder, actual URL will differ after deploy
const LOCAL_URL = 'http://192.168.4.39:5001/adaptivehealthengine/us-central1/insights_service';
const BASE_URL = USE_EMULATOR ? LOCAL_URL : PROD_URL;

export const InsightService = {
    async getInsights(): Promise<InsightFeedResponse> {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        try {
            const response = await fetch(`${BASE_URL}/v1/users/${user.uid}/insights`);
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Failed to fetch insights: ${response.status} ${response.statusText}. ${errorBody.slice(0, 100)}`);
            }
            return await response.json();
        } catch (error: any) {
            console.error('Insight fetch error:', error);
            throw error;
        }
    },

    async recomputeInsights(trigger: string = 'manual_refresh'): Promise<InsightFeedResponse> {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        const response = await fetch(`${BASE_URL}/v1/users/${user.uid}/insights/recompute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ trigger }),
        });

        if (!response.ok) {
            throw new Error(`Failed to recompute insights: ${response.statusText}`);
        }
        return await response.json();
    }
};
