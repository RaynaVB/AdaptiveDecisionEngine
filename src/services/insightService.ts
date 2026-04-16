import { auth, db } from './firebaseConfig';
import { InsightFeedResponse, Insight } from '../models/types';
import { collection, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

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
            const token = await user.getIdToken();
            const response = await fetch(`${BASE_URL}/v1/users/${user.uid}/insights`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
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

        const token = await user.getIdToken();
        const response = await fetch(`${BASE_URL}/v1/users/${user.uid}/insights/recompute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ trigger }),
        });

        if (!response.ok) {
            throw new Error(`Failed to recompute insights: ${response.statusText}`);
        }
        return await response.json();
    },

    async seedMockTriggerInsights(): Promise<void> {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        try {
            const userRef = doc(db, 'users', user.uid);
            const generationsRef = collection(userRef, 'insight_generations');
            
            // 1. Create a dummy generation document
            const genId = uuidv4();
            const genDocRef = doc(generationsRef, genId);
            
            await setDoc(genDocRef, {
                id: genId,
                status: 'completed',
                createdAt: new Date().toISOString(),
                trigger: 'manual_mock_seed'
            });

            // 2. Add specific trigger insights to the nested 'insights' subcollection
            const insightsSubRef = collection(genDocRef, 'insights');

            const mockInsights: Partial<Insight>[] = [
                {
                    id: uuidv4(),
                    type: 'trigger_pattern',
                    category: 'triggers',
                    title: 'Trigger Found: Greek Yogurt',
                    summary: 'Greek Yogurt is strongly linked to bloating events in your history.',
                    status: 'active',
                    confidenceLevel: 'high',
                    metadata: {
                        triggerIngredient: 'Greek Yogurt',
                        symptomType: 'bloating',
                        knownSensitivities: ['lactose_sensitive']
                    }
                },
                {
                    id: uuidv4(),
                    type: 'energy_dip',
                    category: 'triggers',
                    title: 'Trigger Found: Chocolate Ice Cream',
                    summary: 'Chocolate Ice Cream is linked to afternoon energy dips.',
                    status: 'active',
                    confidenceLevel: 'medium',
                    metadata: {
                        triggerIngredient: 'Chocolate Ice Cream',
                        symptomType: 'energy',
                        knownSensitivities: ['sugar_sensitive']
                    }
                }
            ];

            for (const insight of mockInsights) {
                await setDoc(doc(insightsSubRef, insight.id), {
                    ...insight,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }

            console.log('[InsightService] Mock triggers seeded successfully');
        } catch (e) {
            console.error('[InsightService] Mock seeding failed', e);
            throw e;
        }
    }
};
