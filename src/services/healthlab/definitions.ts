// src/services/healthlab/definitions.ts
import { ExperimentDefinition } from '../../models/healthlab';

export const EXPERIMENT_LIBRARY: ExperimentDefinition[] = [
    {
        id: "protein_breakfast",
        name: "Protein Breakfast",
        category: "nutrition",
        hypothesis: "Protein breakfasts improve afternoon energy levels by stabilizing blood sugar.",
        durationDays: 5,
        baselineWindowDays: 7,
        targetMetric: "afternoon_energy",
        requiredEvents: ["breakfast_log", "energy_log"]
    },
    {
        id: "no_late_snacks",
        name: "No Late Snacks",
        category: "timing",
        hypothesis: "Avoiding food after 9:00 PM improves next-day energy and digestion.",
        durationDays: 4,
        baselineWindowDays: 7,
        targetMetric: "next_day_energy",
        requiredEvents: ["dinner_log", "snack_log", "energy_log"]
    },
    {
        id: "hydration_boost",
        name: "Hydration Boost",
        category: "nutrition",
        hypothesis: "Drinking 500ml of water before every meal improves mood stability.",
        durationDays: 5,
        baselineWindowDays: 7,
        targetMetric: "mood_stability",
        requiredEvents: ["meal_log", "mood_log"]
    },
    {
        id: "protein_snack_3pm",
        name: "Protein Snack at 3 PM",
        category: "energy",
        hypothesis: "A dedicated protein snack at 3:00 PM prevents the afternoon energy slump.",
        durationDays: 5,
        baselineWindowDays: 7,
        targetMetric: "afternoon_energy",
        requiredEvents: ["snack_log", "energy_log"]
    },
    {
        id: "stress_reset_60s",
        name: "60-Second Stress Reset",
        category: "stress",
        hypothesis: "Taking a 60-second breathing pause during stress reduces overall stress frequency.",
        durationDays: 5,
        baselineWindowDays: 7,
        targetMetric: "stress_frequency",
        requiredEvents: ["stress_log"]
    }
];
