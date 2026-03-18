import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
    uid: string;
    hasCompletedOnboarding: boolean;
    role?: 'admin' | 'internal' | 'user';
    // PII like 'name' and 'email' are stored locally on device only
    dietaryRestrictions?: string; // Legacy
    foodsDisliked?: string; // Legacy
    primaryGoal?: string; // Legacy
    
    // New Redesigned Profile Fields
    goals?: string[];
    symptoms?: string[];
    symptomFrequency?: string;
    allergies?: string[];
    dietaryPreferences?: string[];
    sensitivities?: string[];
    avoidedFoods?: string[];

    createdAt?: number;
    updatedAt?: number;
}

/**
 * Helper to determine if a user has internal/admin privileges.
 */
export function isInternalUser(profile: UserProfile | null): boolean {
    if (!profile) return false;
    return profile.role === 'admin' || profile.role === 'internal';
}

/**
 * Fetches the user profile from Firestore.
 * If the profile does not exist, it creates a default one.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            return userDoc.data() as UserProfile;
        } else {
            // Create default profile if it doesn't exist
            const newProfile: UserProfile = {
                uid,
                hasCompletedOnboarding: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            await setDoc(userDocRef, newProfile);
            return newProfile;
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

/**
 * Updates the user profile in Firestore.
 */
export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    try {
        const userDocRef = doc(db, 'users', uid);
        // We use setDoc with merge: true in case the document doesn't exist yet, 
        // though it should have been created by getUserProfile.
        await setDoc(userDocRef, {
            ...data,
            updatedAt: Date.now()
        }, { merge: true });
    } catch (error) {
        console.error("Error updating user profile:", error);
        throw error;
    }
}

/**
 * HIPAA Technical Safeguard: Pseudonymization.
 * Stores PII locally on the device so it never touches the DB.
 */
export async function saveLocalPII(uid: string, pii: { name?: string, email?: string }): Promise<void> {
    try {
        const key = `pii_${uid}`;
        const existingRaw = await AsyncStorage.getItem(key);
        const existing = existingRaw ? JSON.parse(existingRaw) : {};
        
        const updated = { ...existing, ...pii };
        await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
        console.error("Error saving local PII:", error);
    }
}

/**
 * Retrieves PII from local device storage.
 */
export async function getLocalPII(uid: string): Promise<{ name?: string, email?: string }> {
    try {
        const key = `pii_${uid}`;
        const raw = await AsyncStorage.getItem(key);
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        console.error("Error fetching local PII:", error);
        return {};
    }
}
