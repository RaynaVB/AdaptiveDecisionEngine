import { MealEvent } from './types';

export type RootStackParamList = {
    Main: undefined;
    Timeline: undefined;
    LogMeal: undefined;
    LogMood: { mealId?: string; timestamp?: string }; // optional link back
    SymptomLogger: { mode: 'symptom' | 'mood' };
    MealDetail: { mealId: string };
    WeeklyPatterns: undefined;
    InsightFeed: undefined;
    Recommendations: undefined;
    FeedbackHistory: undefined;
    HealthLab: undefined;
    ExperimentDetail: { experimentId: string };
    ExperimentHistory: undefined;
    ExperimentResult: { runId: string };
    Login: undefined;
    SignUp: undefined;
    ForgotPassword: undefined;
    OnboardingWelcome: undefined;
    OnboardingProfile: undefined;
    OnboardingComplete: undefined;
    Settings: undefined;
    Admin: undefined;
};
