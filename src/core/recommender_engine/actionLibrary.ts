// src/core/recommender_engine/actionLibrary.ts
// Curated, non-medical lifestyle actions.
// The recommender engine must SELECT from this library (not invent new advice).

export type RecommendationType =
    | "timing_intervention"
    | "substitution"
    | "prevention_plan"
    | "recovery"
    | "soft_intervention";

export type PatternType =
    | "mood_dip_then_eat"
    | "late_night_eating_cluster"
    | "weekday_weekend_shift"
    | "meal_type_mood_association";

export type ConfidenceLevel = "low" | "medium" | "high";
export type Intensity = "low" | "medium" | "high";

export type ActionTemplate = {
    id: string;
    recommendationType: RecommendationType;
    applicablePatternTypes: PatternType[];
    intensity: Intensity;

    // Guardrails (engine must enforce)
    minPatternConfidence: ConfidenceLevel; // lowest pattern confidence allowed
    minMealEventsInWindow: number; // minimum meal sample size in window for this template
    minMoodEventsInWindow: number; // minimum mood sample size in window for this template

    // Optional tags to help scoring/avoid repeats
    tags: string[]; // e.g. ["low_friction","sleep","planning","snack"]

    // Text templates (filled with lightweight context)
    // Context keys you may support: {windowLabel}, {timeCutoff}, {slot}, {tag}, {daypart}, {days}
    titleTemplate: string;
    actionTemplate: string; // explicit, doable next step
    whyTemplate: string; // must reference the pattern, not medical claims
};

// Notes:
// - These are intentionally general and low-risk.
// - The engine can optionally fill placeholders, but must not change meaning.

export const ACTION_LIBRARY: ActionTemplate[] = [
    // -------------------------
    // P1: mood dip -> eat within X minutes
    // -------------------------
    {
        id: "p1_soft_pause_60s",
        recommendationType: "soft_intervention",
        applicablePatternTypes: ["mood_dip_then_eat"],
        intensity: "low",
        minPatternConfidence: "low",
        minMealEventsInWindow: 5,
        minMoodEventsInWindow: 5,
        tags: ["low_friction", "pause"],
        titleTemplate: "Try a 60-second pause first",
        actionTemplate:
            "Next time you notice a low mood or high stress, pause for 60 seconds before eating. Take 5 slow breaths, then decide.",
        whyTemplate:
            "Your logs suggest eating often happens soon after a mood dip. A short pause can help you choose intentionally.",
    },
    {
        id: "p1_timing_delay_10min",
        recommendationType: "timing_intervention",
        applicablePatternTypes: ["mood_dip_then_eat"],
        intensity: "low",
        minPatternConfidence: "medium",
        minMealEventsInWindow: 7,
        minMoodEventsInWindow: 7,
        tags: ["low_friction", "timing"],
        titleTemplate: "Add a 10-minute buffer",
        actionTemplate:
            "When a craving hits after a mood dip, set a 10-minute timer. If you still want food after the timer, eat without guilt.",
        whyTemplate:
            "In your data, snacks often follow stress/low mood quickly. A small buffer can reduce autopilot eating.",
    },
    {
        id: "p1_substitute_pairing",
        recommendationType: "substitution",
        applicablePatternTypes: ["mood_dip_then_eat"],
        intensity: "medium",
        minPatternConfidence: "medium",
        minMealEventsInWindow: 7,
        minMoodEventsInWindow: 7,
        tags: ["snack", "substitution"],
        titleTemplate: "Use a “pairing” snack",
        actionTemplate:
            "If you want something sweet, pair it with something filling (e.g., fruit + yogurt, or a small sweet + nuts).",
        whyTemplate:
            "Your logs show mood dips often precede snacking. Pairing can keep the snack satisfying without needing exact tracking.",
    },
    {
        id: "p1_prevention_plan_pack_snack",
        recommendationType: "prevention_plan",
        applicablePatternTypes: ["mood_dip_then_eat"],
        intensity: "medium",
        minPatternConfidence: "high",
        minMealEventsInWindow: 10,
        minMoodEventsInWindow: 10,
        tags: ["planning", "snack"],
        titleTemplate: "Pre-plan one “default” snack",
        actionTemplate:
            "Pick one simple default snack for stressful moments and keep it available (same option all week).",
        whyTemplate:
            "Your pattern suggests stress → eating within a short window. A default snack reduces decision friction and helps consistency.",
    },

    // -------------------------
    // P2: late-night eating cluster
    // -------------------------
    {
        id: "p2_timing_cutoff_soft",
        recommendationType: "timing_intervention",
        applicablePatternTypes: ["late_night_eating_cluster"],
        intensity: "low",
        minPatternConfidence: "medium",
        minMealEventsInWindow: 7,
        minMoodEventsInWindow: 0,
        tags: ["sleep", "timing", "low_friction"],
        titleTemplate: "Try a gentle kitchen “close time”",
        actionTemplate:
            "Pick a realistic kitchen close time (e.g., 9:00 PM) for 3 nights this week. If you eat after it, just log it—no judgment.",
        whyTemplate:
            "Your logs show a cluster of late-night eating. A gentle cutoff can reduce the frequency without requiring big changes.",
    },
    {
        id: "p2_prevention_plan_evening_snack",
        recommendationType: "prevention_plan",
        applicablePatternTypes: ["late_night_eating_cluster"],
        intensity: "medium",
        minPatternConfidence: "medium",
        minMealEventsInWindow: 7,
        minMoodEventsInWindow: 0,
        tags: ["planning", "evening"],
        titleTemplate: "Plan an earlier “bridge” snack",
        actionTemplate:
            "If late-night hunger is common, plan a small snack 1–2 hours after dinner (same time for a few days).",
        whyTemplate:
            "Late-night eating often follows a long gap after dinner. A planned bridge snack can reduce unplanned late-night eating.",
    },
    {
        id: "p2_recovery_sleep_routine",
        recommendationType: "recovery",
        applicablePatternTypes: ["late_night_eating_cluster"],
        intensity: "low",
        minPatternConfidence: "low",
        minMealEventsInWindow: 5,
        minMoodEventsInWindow: 0,
        tags: ["sleep", "recovery"],
        titleTemplate: "Protect your wind-down routine",
        actionTemplate:
            "Set a 15-minute wind-down: dim lights, screens down, and prepare for sleep. If you still want food, choose a light option.",
        whyTemplate:
            "Your logs show more late-night eating. A consistent wind-down can reduce late-night impulses and support better rest.",
    },

    // -------------------------
    // P3: weekday vs weekend shift
    // -------------------------
    {
        id: "p3_timing_anchor_one_meal",
        recommendationType: "timing_intervention",
        applicablePatternTypes: ["weekday_weekend_shift"],
        intensity: "low",
        minPatternConfidence: "medium",
        minMealEventsInWindow: 10,
        minMoodEventsInWindow: 0,
        tags: ["timing", "routine"],
        titleTemplate: "Anchor one meal time on weekends",
        actionTemplate:
            "Pick one meal (breakfast or lunch) to keep within a 1-hour window on weekends for the next 2 weekends.",
        whyTemplate:
            "Your logs suggest weekend routines differ from weekdays. Anchoring one meal can stabilize the rest of the day without strict rules.",
    },
    {
        id: "p3_prevention_plan_weekend_snacks",
        recommendationType: "prevention_plan",
        applicablePatternTypes: ["weekday_weekend_shift"],
        intensity: "medium",
        minPatternConfidence: "high",
        minMealEventsInWindow: 12,
        minMoodEventsInWindow: 0,
        tags: ["planning"],
        titleTemplate: "Create a weekend snack plan",
        actionTemplate:
            "If weekends have more snacks, choose 1 planned snack time + 1 planned snack option for the weekend.",
        whyTemplate:
            "Your data indicates weekend behavior shifts. A simple plan reduces randomness without restricting enjoyment.",
    },

    // -------------------------
    // P4: meal type ↔ mood association (association only)
    // -------------------------
    {
        id: "p4_substitute_high_sugar_swap",
        recommendationType: "substitution",
        applicablePatternTypes: ["meal_type_mood_association"],
        intensity: "medium",
        minPatternConfidence: "high",
        minMealEventsInWindow: 12,
        minMoodEventsInWindow: 8,
        tags: ["substitution", "energy"],
        titleTemplate: "Try a lighter swap once",
        actionTemplate:
            "If a certain meal type is followed by a mood dip in your logs, try swapping it once this week for a lighter alternative and compare.",
        whyTemplate:
            "Your logs show an association between a meal type and later mood changes. A single controlled swap can test what works for you.",
    },
    {
        id: "p4_recovery_after_heavy",
        recommendationType: "recovery",
        applicablePatternTypes: ["meal_type_mood_association"],
        intensity: "low",
        minPatternConfidence: "medium",
        minMealEventsInWindow: 10,
        minMoodEventsInWindow: 6,
        tags: ["recovery", "movement"],
        titleTemplate: "Add a short reset after heavier meals",
        actionTemplate:
            "After a heavier meal, take a 10-minute light walk or do gentle movement. Log how you feel 1–2 hours later.",
        whyTemplate:
            "Your data suggests certain meals are associated with later mood/energy shifts. A small recovery routine may improve how you feel.",
    },

    // -------------------------
    // Safe fallback actions (low confidence / sparse data)
    // -------------------------
    {
        id: "safe_soft_hydration",
        recommendationType: "soft_intervention",
        applicablePatternTypes: [
            "mood_dip_then_eat",
            "late_night_eating_cluster",
            "weekday_weekend_shift",
            "meal_type_mood_association",
        ],
        intensity: "low",
        minPatternConfidence: "low",
        minMealEventsInWindow: 0,
        minMoodEventsInWindow: 0,
        tags: ["safe", "low_friction"],
        titleTemplate: "Start with a simple reset",
        actionTemplate:
            "Before your next snack, drink a glass of water and wait 2 minutes. If you still want food, eat and log it.",
        whyTemplate:
            "You’re still building consistent logs. This is a safe, low-effort step while the system learns your patterns.",
    },
];
