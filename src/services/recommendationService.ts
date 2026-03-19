import { auth } from './firebaseConfig';
import { Recommendation, FeedbackOutcome } from '../models/types';

// Cloud Function URL configuration
const USE_EMULATOR = false; // Set to true for local testing
const PROD_URL = 'https://recommendation-service-n5p5ozwbwa-uc.a.run.app';
const LOCAL_URL = 'http://localhost:5001/adaptivehealthengine/us-central1/recommendation_service';
const BASE_URL = USE_EMULATOR ? LOCAL_URL : PROD_URL;

export const RecommendationService = {
    async getRecommendations(): Promise<Recommendation[]> {
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

    async submitFeedback(recommendationId: string, recommendationType: string, outcome: FeedbackOutcome): Promise<void> {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        const response = await fetch(`${BASE_URL}/v1/users/${user.uid}/recommendations/${recommendationId}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                outcome,
                recommendationType,
                timestamp: new Date().toISOString(),
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to submit feedback: ${response.statusText}`);
        }
    }
};
