// src/services/patternAlertService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { PatternAlert } from '../models/types';

const USE_EMULATOR = false;
const PROD_URL  = 'https://pattern-alerts-service-n5p5ozwbwa-uc.a.run.app'; // Update after first deploy
const LOCAL_URL = 'http://192.168.4.39:5001/adaptivehealthengine/us-central1/pattern_alerts_service';
const BASE_URL  = USE_EMULATOR ? LOCAL_URL : PROD_URL;

const DEBOUNCE_KEY = 'veyra_pattern_alerts_last_scan';
const DEBOUNCE_MS  = 2 * 60 * 60 * 1000; // 2 hours

export const PatternAlertService = {
    /**
     * Triggers a server-side pattern scan. Non-blocking — never throws to the caller.
     * Enforces a 2-hour debounce via AsyncStorage unless force=true.
     */
    async scanForAlerts(force = false): Promise<void> {
        const user = auth.currentUser;
        if (!user) return;

        if (!force) {
            const lastScan = await AsyncStorage.getItem(DEBOUNCE_KEY).catch(() => null);
            if (lastScan && Date.now() - Number(lastScan) < DEBOUNCE_MS) return;
        }

        try {
            const token = await user.getIdToken();
            await fetch(`${BASE_URL}/v1/users/${user.uid}/pattern-alerts/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ trigger: 'app' }),
            });
            await AsyncStorage.setItem(DEBOUNCE_KEY, Date.now().toString());
        } catch (e) {
            console.warn('[PatternAlerts] scan failed (non-critical):', e);
        }
    },

    /**
     * Returns all active, non-expired alerts directly from Firestore.
     * Falls back to [] on any error.
     * Note: requires a composite Firestore index on
     *   pattern_alerts (status ASC, expiresAt ASC, createdAt DESC).
     */
    async getActiveAlerts(): Promise<PatternAlert[]> {
        const user = auth.currentUser;
        if (!user) return [];

        try {
            const nowIso = new Date().toISOString();
            const alertsRef = collection(doc(db, 'users', user.uid), 'pattern_alerts');
            // Single-field query only — no composite index required.
            // expiresAt is filtered client-side (max 4 docs per user at any time).
            const q = query(
                alertsRef,
                where('status', '==', 'active'),
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            return snap.docs
                .map(d => ({ id: d.id, ...d.data() } as PatternAlert))
                .filter(a => a.expiresAt > nowIso);
        } catch (e) {
            console.warn('[PatternAlerts] getActiveAlerts failed:', e);
            return [];
        }
    },

    /**
     * Marks an alert as dismissed in Firestore.
     */
    async dismissAlert(alertId: string): Promise<void> {
        const user = auth.currentUser;
        if (!user) return;

        const alertRef = doc(db, 'users', user.uid, 'pattern_alerts', alertId);
        await updateDoc(alertRef, { status: 'dismissed' });
    },
};
