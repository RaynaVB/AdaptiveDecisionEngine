import { banditModel } from '../banditModel';
import { ContextVector } from '../contextBuilder';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn(),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn()
}));

describe('ContextualBandit', () => {

    beforeEach(async () => {
        await banditModel.reset();
    });

    it('initializes with default zero weights, yielding a 0.5 prediction (sigmoid(0))', async () => {
        await banditModel.initialize();
        const context: ContextVector = [0.8, -0.8, 14, 2];
        const prediction = banditModel.predict('template_1', context);
        expect(prediction).toBe(0.5);
    });

    it('updates weights and increases prediction for a positive reward', async () => {
        await banditModel.initialize();
        const templateId = 'template_test';
        const context: ContextVector = [1.0, 1.0, 10, 1]; // highly positive/energetic state
        
        // Initial prediction should be 0.5
        const initialPrediction = banditModel.predict(templateId, context);
        expect(initialPrediction).toBe(0.5);
        
        // Provide positive reward
        await banditModel.update(templateId, context, 1.0);

        // After update, weight vector should be pushed in the direction of the context
        // w[i] = w[i] + lr * (1 - 0.5) * context[i]
        // This makes dot product positive, so sigmoid should be > 0.5
        const newPrediction = banditModel.predict(templateId, context);
        expect(newPrediction).toBeGreaterThan(0.5);
    });

    it('updates weights and decreases prediction for a negative reward', async () => {
        await banditModel.initialize();
        const templateId = 'template_reject';
        const context: ContextVector = [-1.0, -1.0, 10, 1]; // Highly negative state
        
        const initialPrediction = banditModel.predict(templateId, context);
        expect(initialPrediction).toBe(0.5);

        // Provide reject outcome
        await banditModel.update(templateId, context, 0.0);

        // After update, weight vector is pushed away from context
        // w[i] += lr * (0 - 0.5) * context[i]
        const newPrediction = banditModel.predict(templateId, context);
        expect(newPrediction).toBeLessThan(0.5);
    });
});
