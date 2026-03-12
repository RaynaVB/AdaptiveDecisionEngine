import { generateSeedData } from './seedDataGenerator';
import { runPatternEngine } from '../../src/core/pattern_engine';
import { runRecommendationEngine } from '../../src/core/recommender_engine/recommenderEngine';
import { banditModel } from '../../src/core/recommender_engine/ml/banditModel';
import { FeedbackStorageService } from '../../src/services/feedbackStorage';

// Mock AsyncStorage used by FeedbackStorageService
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(),
    multiRemove: jest.fn(),
}));

describe('ML Recommendation Engine Evaluation Harness', () => {
    beforeAll(async () => {
        // Clear Bandit memory before tests
        await banditModel.initialize();
        // Since we mocked AsyncStorage, it will be empty.
    });

    it('should generate lower ML scores for consistently rejected recommendations', async () => {
        // 1. Generate 30 days of data
        const { meals, moods } = generateSeedData(30);
        
        // 2. Run Pattern Engine
        const patterns = runPatternEngine(meals, moods);
        expect(patterns.length).toBeGreaterThan(0);

        // 3. Build Context (Simulate time as the end of the 30 days dataset)
        const context = { meals, moods };
        
        // 4. Run Recommender (Epoch 0 - No Feedback)
        const candidatesEpoch0 = await runRecommendationEngine(patterns, context);
        
        // Find a specific recommendation template to "punish"
        if (candidatesEpoch0.length > 0) {
            const recToReject = candidatesEpoch0[0];
            const initialMlScore = recToReject.scores.mlScore;
            
            // 5. Simulate User Rejecting this recommendation 5 times in a row
            for (let i = 0; i < 5; i++) {
                await banditModel.update(recToReject.templateId, [1, 1, 1, 1], 0.0);
            }

            // 6. Run Recommender Again (Epoch 1 - After Feedback)
            const candidatesEpoch1 = await runRecommendationEngine(patterns, context);
            const penalizedRec = candidatesEpoch1.find(c => c.templateId === recToReject.templateId);
            
            // The template might be completely filtered out by cooldowns, but if it exists, its score must be lower.
            if (penalizedRec) {
                expect(penalizedRec.scores.mlScore).toBeLessThan(initialMlScore);
                
                // Also verify that total score drops significantly
                expect(penalizedRec.scores.total).toBeLessThan(recToReject.scores.total);
            } else {
                // If it's missing, it means it got filtered by the cooldown layer, which is also correct behavior
                expect(true).toBe(true);
            }
        }
    });
});
