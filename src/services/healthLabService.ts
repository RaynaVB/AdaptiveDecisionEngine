import { auth } from './firebaseConfig';
import { ExperimentDefinition, ExperimentRun } from '../models/healthlab';

// Cloud Function URL configuration (Aligning with recommendationService.ts)
const USE_EMULATOR = false;
const PROD_URL = 'https://us-central1-adaptivehealthengine.cloudfunctions.net/health_lab_service';
const LOCAL_URL = 'http://192.168.4.39:5001/adaptivehealthengine/us-central1/health_lab_service';
const BASE_URL = USE_EMULATOR ? LOCAL_URL : PROD_URL;

export interface RecommendedExperiment {
    template: ExperimentDefinition;
    score: number;
    reason: string;
}

export const HealthLabService = {
    async getRecommendedExperiments(): Promise<RecommendedExperiment[]> {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        try {
            const response = await fetch(`${BASE_URL}/v1/users/${user.uid}/experiments/recommended`);
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Failed to fetch recommended experiments: ${response.status} ${response.statusText}. ${errorBody.slice(0, 100)}`);
            }
            const data = await response.json();
            return data.recommended || [];
        } catch (error: any) {
            console.error('Recommended experiments fetch error:', error);
            throw error;
        }
    },

    async getActiveExperiments(): Promise<ExperimentRun[]> {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        try {
            const response = await fetch(`${BASE_URL}/v1/users/${user.uid}/experiments/active`);
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Failed to fetch active experiments: ${response.status} ${response.statusText}. ${errorBody.slice(0, 100)}`);
            }
            const data = await response.json();
            return data.active || [];
        } catch (error: any) {
            console.error('Active experiments fetch error:', error);
            throw error;
        }
    },

    async startExperiment(templateId: string, linkedInsightIds: string[] = []): Promise<ExperimentRun> {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        const response = await fetch(`${BASE_URL}/v1/users/${user.uid}/experiments/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                templateId,
                linkedInsightIds,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to start experiment: ${response.status} ${response.statusText}. ${errorBody.slice(0, 100)}`);
        }
        return await response.json();
    },

    async completeExperiment(experimentId: string): Promise<any> {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        const response = await fetch(`${BASE_URL}/v1/users/${user.uid}/experiments/${experimentId}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to complete experiment: ${response.status} ${response.statusText}. ${errorBody.slice(0, 100)}`);
        }
        return await response.json();
    },

    async abandonExperiment(experimentId: string): Promise<any> {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        const response = await fetch(`${BASE_URL}/v1/users/${user.uid}/experiments/${experimentId}/abandon`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to abandon experiment: ${response.status} ${response.statusText}. ${errorBody.slice(0, 100)}`);
        }
        return await response.json();
    }
};
