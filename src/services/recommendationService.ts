import { auth } from './firebaseConfig';
import { RecommendationFeedResponse, FeedbackOutcome } from '../models/types';

// Cloud Function URL configuration
const USE_EMULATOR = false;
const PROD_URL = 'https://recommendation-service-n5p5ozwbwa-uc.a.run.app';
const LOCAL_URL = 'http://192.168.4.39:5001/adaptivehealthengine/us-central1/recommendation_service';
const BASE_URL = USE_EMULATOR ? LOCAL_URL : PROD_URL;

export const RecommendationService = {
    async getRecommendations(): Promise<RecommendationFeedResponse> {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        try {
            const response = await fetch(`${BASE_URL}/v1/users/${user.uid}/recommendations`);
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Failed to fetch recommendations: ${response.status} ${response.statusText}. ${errorBody.slice(0, 100)}`);
            }
            return await response.json();
        } catch (error: any) {
            console.error('Recommendation fetch error:', error);
            throw error;
        }
    },

    async submitAction(generationId: string, recommendationId: string, state: FeedbackOutcome, reasonCode?: string, freeText?: string): Promise<void> {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        const response = await fetch(`${BASE_URL}/v1/users/${user.uid}/recommendations/${generationId}/${recommendationId}/action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                state,
                reasonCode,
                freeText,
                timestamp: new Date().toISOString(),
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to submit action: ${response.statusText}`);
        }
    },

    async recomputeRecommendations(trigger: string = 'manual_refresh'): Promise<RecommendationFeedResponse> {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        const response = await fetch(`${BASE_URL}/v1/users/${user.uid}/recommendations/recompute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ trigger }),
        });

        if (!response.ok) {
            throw new Error(`Failed to recompute recommendations: ${response.statusText}`);
        }
        return await response.json();
    }
};
