import { collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, getDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { MealEvent, MoodEvent } from '../models/types';
import { SymptomEvent } from '../models/Symptom';
import { generateSeedData } from '../dev/seedData';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageService = {
    // Helper to get the current user's document path
    getUserDocRef() {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");
        return doc(db, 'users', user.uid);
    },

    getMealsCollectionRef() {
        return collection(this.getUserDocRef(), 'meals');
    },

    getMoodsCollectionRef() {
        return collection(this.getUserDocRef(), 'moods');
    },

    getSymptomsCollectionRef() {
        return collection(this.getUserDocRef(), 'symptoms');
    },

    getAuditLogsCollectionRef() {
        return collection(this.getUserDocRef(), 'audit_logs');
    },

    /**
     * HIPAA technical safeguard: Audit Logging.
     * Records access and modifications to PHI.
     */
    async logAuditAction(action: string, metadata: any = {}) {
        try {
            const user = auth.currentUser;
            if (!user) return;
            
            await addDoc(this.getAuditLogsCollectionRef(), {
                action,
                userId: user.uid,
                timestamp: Timestamp.now(),
                metadata: this._sanitize(metadata)
            });
        } catch (e) {
            console.error('Audit log failed', e);
        }
    },

    // MEALS
    // Internal helper to strip undefined values which Firebase rejects
    _sanitize(data: any) {
        const sanitized = { ...data };
        Object.keys(sanitized).forEach(key => {
            if (sanitized[key] === undefined) {
                delete sanitized[key];
            }
        });
        return sanitized;
    },

    async getMealEvents(): Promise<MealEvent[]> {
        try {
            if (!auth.currentUser) return [];
            await this.logAuditAction('VIEW_MEALS', { count_requested: 'all' });
            const q = query(this.getMealsCollectionRef(), orderBy('occurredAt', 'desc'));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data() as MealEvent);
        } catch (e) {
            console.error('Failed to load meals', e);
            return [];
        }
    },

    async addMealEvent(event: MealEvent): Promise<void> {
        if (!auth.currentUser) return;
        try {
            await this.logAuditAction('ADD_MEAL', { mealId: event.id });
            const mealDocRef = doc(this.getMealsCollectionRef(), event.id);
            await setDoc(mealDocRef, this._sanitize(event));
        } catch (e) {
            console.error('Failed to add meal', e);
        }
    },

    async updateMealEvent(updatedEvent: MealEvent): Promise<void> {
        if (!auth.currentUser) return;
        try {
            const mealDocRef = doc(this.getMealsCollectionRef(), updatedEvent.id);
            await setDoc(mealDocRef, this._sanitize(updatedEvent), { merge: true });
        } catch (e) {
            console.error('Failed to update meal', e);
        }
    },

    async deleteMealEvent(id: string): Promise<void> {
        if (!auth.currentUser) return;
        try {
            const mealDocRef = doc(this.getMealsCollectionRef(), id);
            await deleteDoc(mealDocRef);
        } catch (e) {
            console.error('Failed to delete meal', e);
        }
    },

    // MOODS

    async getMoodEvents(): Promise<MoodEvent[]> {
        try {
            if (!auth.currentUser) return [];
            const q = query(this.getMoodsCollectionRef(), orderBy('occurredAt', 'desc'));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data() as MoodEvent);
        } catch (e) {
            console.error('Failed to load moods', e);
            return [];
        }
    },

    async addMoodEvent(event: MoodEvent): Promise<void> {
        if (!auth.currentUser) return;
        try {
            const moodDocRef = doc(this.getMoodsCollectionRef(), event.id);
            await setDoc(moodDocRef, this._sanitize(event));
        } catch (e) {
            console.error('Failed to add mood', e);
        }
    },

    async deleteMoodEvent(id: string): Promise<void> {
        if (!auth.currentUser) return;
        try {
            const moodDocRef = doc(this.getMoodsCollectionRef(), id);
            await deleteDoc(moodDocRef);
        } catch (e) {
            console.error('Failed to delete mood', e);
        }
    },

    // SYMPTOMS

    async getSymptomEvents(): Promise<SymptomEvent[]> {
        try {
            if (!auth.currentUser) return [];
            const q = query(this.getSymptomsCollectionRef(), orderBy('occurredAt', 'desc'));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data() as SymptomEvent);
        } catch (e) {
            console.error('Failed to load symptoms', e);
            return [];
        }
    },

    async addSymptomEvent(event: SymptomEvent): Promise<void> {
        if (!auth.currentUser) return;
        try {
            await this.logAuditAction('ADD_SYMPTOM', { symptomId: event.id, type: event.symptomType });
            const docRef = doc(this.getSymptomsCollectionRef(), event.id);
            await setDoc(docRef, this._sanitize(event));
        } catch (e) {
            console.error('Failed to add symptom', e);
        }
    },

    async deleteSymptomEvent(id: string): Promise<void> {
        if (!auth.currentUser) return;
        try {
            const docRef = doc(this.getSymptomsCollectionRef(), id);
            await deleteDoc(docRef);
        } catch (e) {
            console.error('Failed to delete symptom', e);
        }
    },

    // UTILS

    async seedDemoLogs(): Promise<void> {
        if (!auth.currentUser) return;
        try {
            const { meals, moods, symptoms } = generateSeedData();

            // Note: In production, batching would be better, but doing it sequentially for simplicity
            for (const meal of meals) {
                await this.addMealEvent(meal);
            }

            for (const mood of moods) {
                await this.addMoodEvent(mood);
            }
            
            for (const symptom of symptoms) {
                await this.addSymptomEvent(symptom);
            }
        } catch (e) {
            console.error('Failed to seed logs', e);
        }
    },

    async clearAllLogs(): Promise<void> {
        if (!auth.currentUser) return;
        try {
            const userRef = this.getUserDocRef();

            // 1. Fetch all raw event collections in parallel
            const [mealsSnap, moodsSnap, symptomsSnap, experimentsSnap,
                   insightGensSnap, recGensSnap, weeklyGensSnap, feedbackHistorySnap] = await Promise.all([
                getDocs(collection(userRef, 'meals')),
                getDocs(collection(userRef, 'moods')),
                getDocs(collection(userRef, 'symptoms')),
                getDocs(collection(userRef, 'experiments')),
                getDocs(collection(userRef, 'insight_generations')),
                getDocs(collection(userRef, 'recommendation_generations')),
                getDocs(collection(userRef, 'weekly_generations')),
                getDocs(collection(userRef, 'feedback_history')),
            ]);

            const deletes: Promise<void>[] = [];

            // 2. Delete raw events + experiments
            mealsSnap.forEach(d => deletes.push(deleteDoc(d.ref)));
            moodsSnap.forEach(d => deletes.push(deleteDoc(d.ref)));
            symptomsSnap.forEach(d => deletes.push(deleteDoc(d.ref)));
            experimentsSnap.forEach(d => deletes.push(deleteDoc(d.ref)));

            // 3. Delete insight generations + nested insights subcollection
            for (const genDoc of insightGensSnap.docs) {
                const insightsSnap = await getDocs(collection(genDoc.ref, 'insights'));
                insightsSnap.forEach(d => deletes.push(deleteDoc(d.ref)));
                deletes.push(deleteDoc(genDoc.ref));
            }

            // 4. Delete recommendation generations + nested recommendations subcollection
            for (const genDoc of recGensSnap.docs) {
                const recsSnap = await getDocs(collection(genDoc.ref, 'recommendations'));
                recsSnap.forEach(d => deletes.push(deleteDoc(d.ref)));
                deletes.push(deleteDoc(genDoc.ref));
            }

            // 5. Delete weekly pattern generations + nested items subcollection
            for (const genDoc of weeklyGensSnap.docs) {
                const itemsSnap = await getDocs(collection(genDoc.ref, 'items'));
                itemsSnap.forEach(d => deletes.push(deleteDoc(d.ref)));
                deletes.push(deleteDoc(genDoc.ref));
            }

            // 6. Delete feedback history so suppression state resets with the data
            feedbackHistorySnap.forEach(d => deletes.push(deleteDoc(d.ref)));

            // 7. Delete ML bandit weights so the model starts fresh
            deletes.push(deleteDoc(doc(collection(userRef, 'ml_metadata'), 'bandit_weights')));

            await Promise.all(deletes);

            // 8. Clear local AsyncStorage caches
            await Promise.all([
                AsyncStorage.removeItem('@feedbacks'),
                AsyncStorage.removeItem('veyra_streaks_meta'),
            ]);

        } catch (e) {
            console.error('Failed to clear all data', e);
            throw e;
        }
    },

    /**
     * Admin only: Clears logs for ALL users in the system.
     */
    async clearSystemLogsForAllUsers(): Promise<void> {
        if (!auth.currentUser) return;
        
        try {
            // 1. Get all users
            const usersSnapshot = await getDocs(collection(db, 'users'));
            
            // 2. For each user, clear their logs
            const promises = usersSnapshot.docs.map(async (userDoc) => {
                const userId = userDoc.id;
                const userRef = doc(db, 'users', userId);
                
                // Clear meals
                const mealsSnapshot = await getDocs(collection(userRef, 'meals'));
                const mealDeletes = mealsSnapshot.docs.map(d => deleteDoc(d.ref));
                
                // Clear moods
                const moodsSnapshot = await getDocs(collection(userRef, 'moods'));
                const moodDeletes = moodsSnapshot.docs.map(d => deleteDoc(d.ref));
                
                // Clear symptoms
                const symptomsSnapshot = await getDocs(collection(userRef, 'symptoms'));
                const symptomDeletes = symptomsSnapshot.docs.map(d => deleteDoc(d.ref));
                
                return Promise.all([...mealDeletes, ...moodDeletes, ...symptomDeletes]);
            });
            
            await Promise.all(promises);
            await this.logAuditAction('ADMIN_CLEAR_ALL_LOGS', { systemWide: true });
        } catch (e) {
            console.error('Failed to clear all system logs', e);
            throw e;
        }
    },

    // RECIPE LIBRARY
    getRecipesCollectionRef() {
        return collection(this.getUserDocRef(), 'recipes');
    },

    /**
     * Normalize a meal name for consistent document indexing.
     */
    _normalizeMealName(name: string): string {
        return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    },

    async getRecipe(mealName: string): Promise<{ dishLabel: string, ingredients: any[], questions?: any[] } | null> {
        if (!auth.currentUser) return null;
        try {
            const normalizedName = this._normalizeMealName(mealName);
            const recipeDocRef = doc(this.getRecipesCollectionRef(), normalizedName);
            const recipeSnap = await getDoc(recipeDocRef);
            
            if (recipeSnap.exists()) {
                return recipeSnap.data() as any;
            }
            return null;
        } catch (e) {
            console.error('Failed to fetch recipe', e);
            return null;
        }
    },

    async saveRecipe(mealName: string, ingredients: any[], questions?: any[]): Promise<void> {
        if (!auth.currentUser || !mealName) return;
        try {
            const normalizedName = this._normalizeMealName(mealName);
            const recipeDocRef = doc(this.getRecipesCollectionRef(), normalizedName);
            
            await setDoc(recipeDocRef, this._sanitize({
                dishLabel: mealName,
                ingredients,
                questions,
                updatedAt: new Date().toISOString()
            }), { merge: true });
        } catch (e) {
            console.error('Failed to save recipe', e);
        }
    },

    async getAllRecipes(): Promise<Array<{ dishLabel: string, ingredients: any[], questions?: any[] }>> {
        if (!auth.currentUser) return [];
        try {
            const recipeSnap = await getDocs(this.getRecipesCollectionRef());
            return recipeSnap.docs.map(doc => doc.data() as any);
        } catch (e) {
            console.error('Failed to fetch all recipes', e);
            return [];
        }
    }
};
