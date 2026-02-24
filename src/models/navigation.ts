import { MealEvent } from './types';

export type RootStackParamList = {
    Timeline: undefined;
    LogMeal: undefined;
    LogMood: { mealId?: string; timestamp?: string }; // optional link back
    MealDetail: { mealId: string };
    WeeklyPatterns: undefined;
};
