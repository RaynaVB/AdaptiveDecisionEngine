import AsyncStorage from '@react-native-async-storage/async-storage';
import { ContextVector } from './contextBuilder';

const BANDIT_WEIGHTS_KEY = 'ADE_BANDIT_WEIGHTS';

export interface BanditWeights {
    [templateId: string]: [number, number, number, number];
}

class ContextualBandit {
    private weights: BanditWeights = {};
    private initialized: boolean = false;
    private learningRate: number = 0.1;

    async initialize() {
        if (this.initialized) return;
        try {
            const stored = await AsyncStorage.getItem(BANDIT_WEIGHTS_KEY);
            if (stored) {
                this.weights = JSON.parse(stored);
            }
            this.initialized = true;
        } catch (error) {
            console.error('Failed to load bandit weights:', error);
        }
    }

    private getWeightsForTemplate(templateId: string): [number, number, number, number] {
        if (!this.weights[templateId]) {
            // Initialize with small random weights or zeros. Using zeros for simplicity.
            this.weights[templateId] = [0, 0, 0, 0];
        }
        return this.weights[templateId];
    }

    /**
     * Predicts a preference score based on the context vector.
     */
    predict(templateId: string, context: ContextVector): number {
        const w = this.getWeightsForTemplate(templateId);
        // Dot product of weights and context
        let score = 0;
        for (let i = 0; i < w.length; i++) {
            score += w[i] * context[i];
        }
        // Sigmoid to bound between 0 and 1
        return 1 / (1 + Math.exp(-score));
    }

    /**
     * Updates weights based on user feedback.
     * reward: 1.0 for accept, 0.5 for partial, 0.0 (or -1.0) for reject
     */
    async update(templateId: string, context: ContextVector, reward: number) {
        await this.initialize();
        const w = this.getWeightsForTemplate(templateId);
        
        // Simple Online Gradient Descent / Linear update rule
        // w = w + learningRate * (reward - predictedReward) * context
        const predictedReward = this.predict(templateId, context);
        const error = reward - predictedReward;

        for (let i = 0; i < w.length; i++) {
            w[i] += this.learningRate * error * context[i];
        }

        this.weights[templateId] = w;
        await this.persist();
    }

    private async persist() {
        try {
            await AsyncStorage.setItem(BANDIT_WEIGHTS_KEY, JSON.stringify(this.weights));
        } catch (error) {
            console.error('Failed to save bandit weights:', error);
        }
    }

    // For testing purposes
    async reset() {
        this.weights = {};
        await AsyncStorage.removeItem(BANDIT_WEIGHTS_KEY);
    }
}

export const banditModel = new ContextualBandit();
