import { collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, getDoc } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { MealEvent, MoodEvent } from '../models/types';
import { generateSeedData } from '../dev/seedData';

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

    // MEALS

    async getMealEvents(): Promise<MealEvent[]> {
        try {
            if (!auth.currentUser) return [];
            const q = query(this.getMealsCollectionRef(), orderBy('occurredAt', 'desc'));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => {
                const data = doc.data() as MealEvent;
                // Migration: Normalize empty tags to ['unknown']
                return {
                    ...data,
                    mealTypeTags: (!data.mealTypeTags || data.mealTypeTags.length === 0)
                        ? ['unknown']
                        : data.mealTypeTags
                };
            });
        } catch (e) {
            console.error('Failed to load meals', e);
            return [];
        }
    },

    async addMealEvent(event: MealEvent): Promise<void> {
        if (!auth.currentUser) return;
        try {
            const mealDocRef = doc(this.getMealsCollectionRef(), event.id);
            await setDoc(mealDocRef, event);
        } catch (e) {
            console.error('Failed to add meal', e);
        }
    },

    async updateMealEvent(updatedEvent: MealEvent): Promise<void> {
        if (!auth.currentUser) return;
        try {
            const mealDocRef = doc(this.getMealsCollectionRef(), updatedEvent.id);
            await setDoc(mealDocRef, updatedEvent, { merge: true });
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
            await setDoc(moodDocRef, event);
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

    // UTILS

    async seedDemoLogs(): Promise<void> {
        if (!auth.currentUser) return;
        try {
            const { meals, moods } = generateSeedData();

            // Note: In production, batching would be better, but doing it sequentially for simplicity
            for (const meal of meals) {
                await this.addMealEvent(meal);
            }

            for (const mood of moods) {
                await this.addMoodEvent(mood);
            }
        } catch (e) {
            console.error('Failed to seed logs', e);
        }
    },

    async clearAllLogs(): Promise<void> {
        if (!auth.currentUser) return;
        // In Firestore, deleting a collection directly from the client is not natively supported without iterating.
        // We will query and delete each doc.
        try {
            const mealsSnapshot = await getDocs(this.getMealsCollectionRef());
            mealsSnapshot.forEach(docSnap => {
                deleteDoc(docSnap.ref);
            });

            const moodsSnapshot = await getDocs(this.getMoodsCollectionRef());
            moodsSnapshot.forEach(docSnap => {
                deleteDoc(docSnap.ref);
            });
        } catch (e) {
            console.error('Failed to clear logs', e);
        }
    }
};
