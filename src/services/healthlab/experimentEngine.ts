// src/services/healthlab/experimentEngine.ts
import { collection, doc, getDocs, getDoc, setDoc, query, where, orderBy, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { ExperimentDefinition, ExperimentRun, ExperimentStatus } from '../../models/healthlab';
import { EXPERIMENT_LIBRARY } from './definitions';
import { ExperimentAnalysis } from './experimentAnalysis';
import { StorageService } from '../storage';
import { v4 as uuidv4 } from 'uuid';

export const ExperimentEngine = {
    // Helper to get the current user's document path
    getUserDocRef() {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");
        return doc(db, 'users', user.uid);
    },

    getExperimentsCollectionRef() {
        return collection(this.getUserDocRef(), 'experiment_runs');
    },

    async getActiveExperiment(): Promise<ExperimentRun | null> {
        if (!auth.currentUser) return null;
        try {
            const q = query(
                this.getExperimentsCollectionRef(), 
                where('status', '==', 'active')
            );
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) return null;
            
            const docs = querySnapshot.docs.map(d => d.data() as ExperimentRun);
            // Sort in memory to avoid needing a composite index in Firestore
            docs.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            
            return docs[0];
        } catch (e) {
            console.error('Failed to load active experiment', e);
            return null;
        }
    },

    async getExperimentRuns(): Promise<ExperimentRun[]> {
        if (!auth.currentUser) return [];
        try {
            const q = query(this.getExperimentsCollectionRef(), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data() as ExperimentRun);
        } catch (e) {
            console.error('Failed to load experiment runs', e);
            return [];
        }
    },

    async startExperiment(experimentId: string): Promise<ExperimentRun | null> {
        if (!auth.currentUser) return null;
        
        try {
            // Check if there's already an active experiment
            const active = await this.getActiveExperiment();
            if (active) {
                throw new Error("Only one experiment can be active at a time.");
            }

            const now = new Date().toISOString();
            const id = uuidv4();
            const newRun: ExperimentRun = {
                id,
                userId: auth.currentUser.uid,
                experimentId,
                startDate: now,
                status: 'active',
                createdAt: now,
                updatedAt: now
            };

            const docRef = doc(this.getExperimentsCollectionRef(), id);
            await setDoc(docRef, newRun);
            return newRun;
        } catch (e) {
            console.error('Failed to start experiment', e);
            throw e;
        }
    },

    async abandonActiveExperiment(): Promise<void> {
        if (!auth.currentUser) return;
        try {
            const active = await this.getActiveExperiment();
            if (!active) return;

            const docRef = doc(this.getExperimentsCollectionRef(), active.id);
            await updateDoc(docRef, {
                status: 'abandoned',
                updatedAt: new Date().toISOString()
            });
        } catch (e) {
            console.error('Failed to abandon experiment', e);
            throw e;
        }
    },

    async completeExperiment(runId: string): Promise<void> {
        if (!auth.currentUser) return;
        try {
            const docRef = doc(this.getExperimentsCollectionRef(), runId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) throw new Error("Experiment run not found");
            
            const runData = docSnap.data() as ExperimentRun;
            const definition = EXPERIMENT_LIBRARY.find(e => e.id === runData.experimentId);
            if (!definition) throw new Error("Definition not found");

            const meals = await StorageService.getMealEvents();
            const moods = await StorageService.getMoodEvents();
            const symptoms = await StorageService.getSymptomEvents();
            
            const results = ExperimentAnalysis.calculateResults(
                definition,
                meals,
                moods,
                symptoms,
                new Date(runData.startDate),
                new Date()
            );

            const resultDocRef = doc(this.getExperimentsCollectionRef(), runData.id);
            await updateDoc(resultDocRef, {
                status: 'completed',
                endDate: new Date().toISOString(),
                baselineValue: results.baselineValue,
                resultValue: results.experimentValue,
                resultDelta: results.delta,
                confidenceScore: results.confidence,
                updatedAt: new Date().toISOString()
            });
        } catch (e) {
            console.error('Failed to complete experiment', e);
            throw e;
        }
    },

    async seedManualTestExperiment(): Promise<string> {
        if (!auth.currentUser) throw new Error("Not authenticated");
        
        // 1. Detect if there's already an active run we should "complete" with simulation
        const active = await this.getActiveExperiment();
        let runId: string;
        let experimentId: string;
        let startOfExperiment: Date;

        if (active) {
            // Use the existing active run — but backdate its startDate to 3 days ago
            // so the analysis engine has a real experimental window to work with.
            runId = active.id;
            experimentId = active.experimentId;
            const now = new Date();
            startOfExperiment = new Date(now);
            startOfExperiment.setDate(now.getDate() - 5);

            // Patch the run's startDate in Firestore
            const runRef = doc(this.getExperimentsCollectionRef(), runId);
            await updateDoc(runRef, { 
                startDate: startOfExperiment.toISOString(),
                updatedAt: now.toISOString()
            });

            console.log(`Simulating data for existing active run: ${experimentId}, backdated to ${startOfExperiment.toISOString()}`);
        } else {
            // Only clean up and start a new one if nothing is active
            try {
                const q = query(this.getExperimentsCollectionRef(), where('status', '==', 'active'));
                const activeDocs = await getDocs(q);
                for (const doc of activeDocs.docs) {
                    await updateDoc(doc.ref, { 
                        status: 'abandoned', 
                        updatedAt: new Date().toISOString() 
                    });
                }
            } catch (e) {
                console.error("Cleanup failed", e);
            }

            const now = new Date();
            startOfExperiment = new Date(now);
            startOfExperiment.setDate(now.getDate() - 5); 
            runId = uuidv4();
            experimentId = 'protein_breakfast';

            const run: ExperimentRun = {
                id: runId,
                userId: auth.currentUser.uid,
                experimentId,
                startDate: startOfExperiment.toISOString(),
                status: 'active',
                createdAt: startOfExperiment.toISOString(),
                updatedAt: now.toISOString()
            };

            const docRef = doc(this.getExperimentsCollectionRef(), runId);
            await setDoc(docRef, run);
        }

        // Helper: create a date at a given day offset + hour from startOfExperiment
        const DAY_MS = 24 * 60 * 60 * 1000;
        const dateAt = (dayOffset: number, hour: number): string => {
            const d = new Date(startOfExperiment.getTime() + dayOffset * DAY_MS);
            d.setHours(hour, 0, 0, 0);
            return d.toISOString();
        };

        // 2. Seed Baseline (7 days BEFORE start) -> Low Energy / Negative
        // Seed 2 logs per day to reach High Confidence threshold (>15 total)
        for (let i = 1; i <= 7; i++) {
            // Morning baseline log (9 AM, i days before start)
            await StorageService.addMoodEvent({
                id: uuidv4(),
                createdAt: dateAt(-i, 9),
                occurredAt: dateAt(-i, 9),
                energy: 'low',
                valence: 'negative',
                stress: 'medium'
            });
            // Afternoon baseline log (3 PM, i days before start)
            await StorageService.addMoodEvent({
                id: uuidv4(),
                createdAt: dateAt(-i, 15),
                occurredAt: dateAt(-i, 15),
                energy: 'low',
                valence: 'neutral',
                stress: 'high'
            });
        }

        // 3. Seed "Experimental" data (days 0–4 AFTER start) -> High Energy / Positive
        for (let i = 0; i < 5; i++) {
            // Morning experimental log (9 AM)
            await StorageService.addMoodEvent({
                id: uuidv4(),
                createdAt: dateAt(i, 9),
                occurredAt: dateAt(i, 9),
                energy: 'high',
                valence: 'positive',
                stress: 'low'
            });
            // Afternoon experimental log (3:30 PM — inside the 2-4 PM window)
            await StorageService.addMoodEvent({
                id: uuidv4(),
                createdAt: dateAt(i, 15),
                occurredAt: dateAt(i, 15),
                energy: 'high',
                valence: 'positive',
                stress: 'low'
            });
            // Meal log to boost confidence count
            await StorageService.addMealEvent({
                id: uuidv4(),
                mealSlot: 'breakfast',
                inputMode: 'text',
                mealTypeTags: ['high_protein'],
                textDescription: 'Simulated high protein breakfast',
                createdAt: dateAt(i, 8),
                occurredAt: dateAt(i, 8)
            });
        }

        // 4. Complete it now
        await this.completeExperiment(runId);
        return runId;
    }
};
