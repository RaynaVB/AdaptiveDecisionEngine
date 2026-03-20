import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeedbackEvent, FeedbackOutcome, MoodEvent } from '../models/types';
import { StorageService } from './storage';

const FEEDBACK_STORAGE_KEY = '@feedbacks';

export const FeedbackStorageService = {
    async saveFeedback(event: FeedbackEvent): Promise<void> {
        try {
            const history = await this.getFeedbackHistory();
            history.push(event);
            await AsyncStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(history));

            // Action update is now handled server-side via RecommendationService.submitAction

        } catch (e) {
            console.error('Failed to save feedback and update bandit', e);
        }
    },

    getRewardForOutcome(outcome: FeedbackOutcome): number {
        if (outcome === 'accepted') return 1.0;
        if (outcome === 'maybe') return 0.5;
        if (outcome === 'completed') return 1.2; // Extra reward for completion
        return 0.0; // rejected or dismissed
    },

    async getFeedbackHistory(): Promise<FeedbackEvent[]> {
        try {
            const data = await AsyncStorage.getItem(FEEDBACK_STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to get feedback history', e);
            return [];
        }
    },

    async getRejectionRateByType(type: string): Promise<number> {
        const history = await this.getFeedbackHistory();
        const typeFeedbacks = history.filter(f => f.recommendationType === type);
        
        if (typeFeedbacks.length === 0) return 0;

        const rejections = typeFeedbacks.filter(f => f.outcome === 'rejected').length;
        return rejections / typeFeedbacks.length;
    },

    async getLatestOutcomeForRecommendation(templateId: string): Promise<FeedbackOutcome | null> {
        const event = await this.getLatestFeedbackEventForRecommendation(templateId);
        return event ? event.outcome : null;
    },

    async getLatestFeedbackEventForRecommendation(templateId: string): Promise<FeedbackEvent | null> {
        const history = await this.getFeedbackHistory();
        // Sort descending by timestamp
        const relevantFeedbacks = history
            .filter(f => f.recommendationId === templateId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        return relevantFeedbacks.length > 0 ? relevantFeedbacks[0] : null;
    },

    async clearFeedbackHistory(): Promise<void> {
        try {
            await AsyncStorage.removeItem(FEEDBACK_STORAGE_KEY);
        } catch (e) {
            console.error('Failed to clear feedback history', e);
        }
    }
};
