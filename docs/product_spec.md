# Product Specification & Requirements Document
## Veyra (formerly Adaptive Decision Engine)
**Current State: March 2026**

This document consolidates the product requirements (PRD) and the current technical capabilities of Veyra into a single source of truth. It covers the app's goals, user profiles, data ingestion features, intelligence engines, and the HealthLab experimentation system.

---

## 1. Background / Problem
Most food logging apps emphasize nutritional dashboards (calories/macros), but this does not reliably change user behavior. Users often:
- Log inconsistently
- Feel overwhelmed by data
- Fail to translate insights into action
- Ignore generic recommendations

**Veyra reframes health logging into decision support:**
> The system identifies high-impact behavioral patterns and recommends the best next action a user can realistically follow to improve their lifestyle.

## 2. Project Goals (What success looks like)
### Primary Success Metrics
- **Logging friction:** Users can log a meal+mood in under 30 seconds.
- **Pattern quality:** The system identifies repeatable patterns only when statistically meaningful.
- **Recommendation utility:** Interventions feel personal, actionable, and relevant.
- **Follow-through:** Measurable percentage of accepted/partially accepted recommendations.

### Secondary Success Metrics
- Improved user awareness of triggers (mood-linked eating, symptom flare-ups).
- Reduced decision fatigue (“What should I do next?”).

## 3. Users
### Primary User Profile
- Wants lifestyle improvement but struggles with consistency.
- Tends to snack or eat impulsively during stress, low mood, or physical slumps.
- Benefits from low-friction, “one best action” suggestions rather than complex dashboards.

---

## 4. Functional Capabilities

### A. Multi-Modal Data Ingestion (Logging)

#### 1. AI-Powered Ingredient Capture
- **Visual & Text Dual-Mode**: Supports both camera/gallery uploads and manual text entries.
- **Multi-Step AI Analysis**: Large Language Model (Gemini 2.0 Flash) provides real-time extraction, identifying dishes and ingredients.
- **Canonical Ingredient Database**: Maps extracted food items against a structured 2,500+ item ingredient library.
- **Binary Clarification questions**: AI asks simplified Yes/No/Not Sure questions (e.g., "Is this dairy-free?") for quick confirmation.
- **Dish Name Attribution**: Identifies primary "Dish Name" (e.g., "Street Tacos") over generic descriptions.

#### 2. Specialized Mood & Symptom Tracking
- **Decoupled Logging Interfaces**: Dedicated screens for mental and physical states to optimize UX:
    - **`MoodLoggerScreen`**: Focused on emotional check-ins (e.g., Sad ↔ Happy).
    - **`SymptomLoggerScreen`**: Streamlined for physical symptoms (e.g., Nausea, Headache).
- **Multi-Scale Architecture**:
    - **Bipolar Moods**: Center-aligned sliders on a **-2 to +2** scale (Neutral at 0) to capture both positive and negative valence.
    - **Unipolar Symptoms**: Simplified **1-3** scale (Mild, Moderate, Severe) to reduce cognitive load and simplify pattern detection.
- **Unified Event Model**: Despite separate UIs, data remains compatible, allowing the pattern engine to correlate across both collections seamlessly.
- **Top 5 Personalization**: Surfaces the user's most frequently logged symptoms or moods automatically.

### B. Timeline & Feed
- **Check-in Logic**: The system uses log-aware notifications to minimize friction:
    - **Meal Reminders**: Fire 45 minutes *after* predicted meal times only if no log is detected for that slot.
    - **Daily Reflection**: A consolidated mood/symptom check-in at 20:30, skipped if already logged.
- **7-Day Sliding Feed**: Chronological display of meals, moods, and symptoms.
- **Wins & Streaks**: Celebrate logging consistency (e.g., 14-day streak) and symptom-free periods (3+ days) via the WinsWidget.
- **Week at a Glance**: Summarized dot indicators for daily events.
- **Daily Timeline Modal**: Detailed daily view with chronological layout.
- **Weekly Intelligence**: "Tag Cloud" layout for top weekly symptoms and bar/line charts for trends.

### C. Intelligence Engines

#### 1. Pattern Engine
Detects behavioral clusters using a 7-day sliding window with an **Uncertainty Policy** (minimum data gating: 5 meals, 3 moods/symptoms).
**Active Detectors:**
- **P1 (Mood-Triggered Eating):** Eating follows low mood or high stress.
- **P2 (Late-Night Clustering):** Contiguous eating events in late-night hours.
- **P3 (Routine Shifts):** Divergence between weekdays and weekends.
- **P4 (Meal-Mood Correlations):** Specific ingredients or meal patterns linked to subsequent mood shifts.
- **P5 (Symptom Correlations):** Specific ingredients matched to subsequent physical symptoms.
- **P6 (Mood Boosters):** Ingredients correlated with positive mood elevation.
- **P7 (Delayed Triggers):** Physical symptoms occurring 6-24 hours after specific food consumed.

*Insight Integration:* Detected patterns surface an `actionableInsight` (e.g., "Trigger: Milk"), providing a 1-tap pathway to start relevant ingredient-specific HealthLab experiments (e.g., "Dairy Elimination").

#### 2. Personalized Recommender Engine
Transforms detected patterns into ranked, actionable interventions using a **Contextual Bandit Model**.
- **Action Library Includes**:
  - `timing_intervention` (e.g., 10-minute buffers)
  - `substitution` (e.g., pairing sweet snacks with protein)
  - `prevention_plan` (e.g., pre-planned bridge snacks)
  - `recovery` (e.g., short movement resets)
  - `soft_intervention` (e.g., 60-second breathing pauses)
- **Ranked Selection**: Provides 1 "Best Next Action" + 2 alternatives, scored across impact, feasibility, and ML-Reward.

### D. Adaptation & Feedback Loop
- **Interactive Feedback**: Users respond with `Adopt`, `Maybe`, or `Reject`.
- **Dynamic Penalty Logic**: Consistently rejected intervention types receive a score penalty to demote them in future rankings.
- **Feedback History**: Dedicated log of past recommendations and their given outcomes.

### E. HealthLab — Behavioral Experimentation System
A system for short, structured behavioral experiments (4–5 days) to measure causal effects of habits on mood, energy, and stress.

#### Experiment Lifecycle
1. **Discovery**: `HealthLabScreen` shows available built-in experiments (e.g., "Protein Breakfast", "Hydration Boost", "Dairy-Free Week").
2. **Activation**: Users can start/run multiple experiments concurrently.
3. **Analysis Engine**: Computes experiment metrics against a 7-day pre-experiment baseline. Returns a delta % and confidence score (`high`, `medium`, `low`).
4. **Smart UX**: Features retry logic for low-confidence results, experiment history archiving, and smart filtering of completed high-confidence studies.

---

## 5. Non-Functional Requirements
- **Fast Experience**: The core logging path must remain under 30 seconds.
- **Safe Fallback**: If confidence is too low (e.g., unidentifiable meal, sparse pattern history), the app will recommend a low-risk action or request more data rather than presenting speculative conclusions.
- **Modular Architecture**: Logging, patterns, recommendations, and HealthLab are kept structurally independent for easy iteration.

*(End of Product Specification)*
