import { MealEvent } from './types';

export type RootStackParamList = {
    Timeline: undefined;
    LogMeal: undefined;
    LogMood: { mealId?: string }; // optional link back
    MealDetail: { mealId: string };
};
