# Architecture
## Veyra (formerly Adaptive Decision Engine)

This document defines the end-to-end architecture of Veyra. The system is designed functionally around modular "decision intelligence" cores (patterns, recommendations, experimentation) separated from the user interface.

---

## 1. High-Level Architecture
Veyra relies on a React Native (Expo) frontend paired with a modular Serverless backend (Firebase + Cloud Functions) to offload heavy intelligence analysis.

- **Frontend Application (React Native / Expo):**
  - Handles UI logic, local state management, async storage for offline/fast caching.
  - Implements gesture-based interactions, form captures, and renders visual insights securely.
- **Backend Infrastructure (Firebase):**
  - `Firestore`: Primary database storing structured event data (Meals, Symptoms, Moods, Users, Experiments). Moods are stored in the `moods` collection using a `symptomType` + `severity` model. Physical symptoms are stored in the `symptoms` collection.
  - `Auth`: User authentication.
  - `Cloud Functions (Python)`: Decoupled service endpoints to run ML tasks, logic, and intelligent generation offline and at scale.

---

## 2. API & Service Architecture (Backend Functions)

The system delegates domain-specific logic to independent cloud function services:

1. **`vision_service`**
   - **Role:** ML-powered ingredient and dish extraction.
   - **Mechanism:** Integrates with Gemini 2.0 Flash to analyze meal photos and text descriptions, extract dish names, identify canonical ingredients against a 2,500+ item database, and generate binary clarification questions.

2. **`health_lab_service`**
   - **Role:** Drives the behavioral experimentation lifecycle.
   - **Mechanism:** Aggregates logs to compute pre-experiment baselines vs. active experiment periods. Matches ingredient-based insights to templates (e.g., matching "Milk" to "Dairy Elimination") using fuzzy title matching. Outputs statistical deltas for targeted metrics and confidence scoring.

3. **`insights_service`**
   - **Role:** Generates personalized health insights surfaced on the Insights Feed.
   - **Mechanism:** Runs a 9-analyzer pattern engine over a rolling window of meal, mood, and symptom events. Fetches the user's `UserProfile` from Firestore on each recompute and uses `symptomFrequency` to dynamically scale minimum event thresholds (users with frequent symptoms can surface patterns sooner; users with rare symptoms require more evidence).
   - **Active Analyzers:**
     1. `analyze_mood_dip_then_eat` — eating within 1h of a negative mood or high stress event
     2. `analyze_late_night_cluster` — contiguous eating after a configurable late-night cutoff
     3. `analyze_weekday_weekend_shift` — divergence in snack frequency between weekdays and weekends
     4. `analyze_mood_correlations` — ingredient-level lift scoring against mood dip events
     5. `analyze_positive_mood_ingredients` — ingredients correlated with elevated mood (≥+1)
     6. `analyze_symptom_correlations` — ingredient-level correlations with physical symptoms (0–6h window)
     7. `analyze_delayed_symptom_triggers` — ingredient-level correlations with physical symptoms (6–24h window, stricter lift threshold)
     8. `analyze_energy_dip_ingredients` — ingredients correlated with low energy events (0–4h window)
     9. `analyze_sleep_impact_ingredients` — evening meals correlated with poor sleep quality (2–8h window)
   - **Deduplication:** When the same (ingredient, symptomType) pair is flagged by both immediate and delayed analyzers, the 0–6h result is preferred.
   - **Lift Scoring:** All ingredient correlations use lift = `event_rate / baseline_rate` (threshold ≥ 1.5 for immediate, ≥ 2.0 for delayed) to avoid false positives from staple foods.
   - **Cache / TTL:** Cached for 12 hours; invalidated on new symptom log or 3+ new meals.

4. **`recommendation_service`**
   - **Role:** Generates actionable, personalized interventions ranked for the Recommendations Feed.
   - **Mechanism:** Runs a parallel pattern engine (same analyzers as insights_service, scoped for recommendation generation). Maps detected patterns to an **Action Library of 21 templates** across 5 recommendation types: `timing_intervention`, `substitution`, `prevention_plan`, `recovery`, `soft_intervention`. Applies a **Contextual Bandit Model** to score interventions based on ML confidence, expected impact, user feasibility, and past feedback history. Also fetches `UserProfile` to apply `symptomFrequency` threshold scaling.
   - **Output Tiers (rendered in UI):**
     - `preventive` — symptom-prevention patterns with high urgency
     - `experiment` — recommendations with an `associatedExperimentId` (link to HealthLab)
     - `optimization` — all other behavioral improvements
   - **Cache / TTL:** Cached for 6 hours; 5-minute debounce on rapid re-requests.

5. **`weekly_patterns_service`**
   - **Role:** Detects weekly behavioral clusters for the Weekly Patterns screen.
   - **Mechanism:** Scans time-series data to locate high-level behavioral clusters. Outputs patterns with `confidence`, `severity`, and optional `actionableInsight` references.

6. **`streak_service` (Frontend)**
   - **Role:** Computes user engagement streaks (logging, symptom-free).
   - **Mechanism:** Analyzes the full event history to calculate consecutive days of activity. Handles future-dated logs (common in seeding) by starting the count from the current date or the most recent past/present log. Persists personal records and milestones via local storage.

7. **`notification_service` (Frontend)**
   - **Role:** Manages local, log-aware notifications for user engagement.
   - **Mechanism:** Schedules reminders 45 minutes post-meal (based on historical clusters) and daily at 20:30. Logic automatically cancels/defers reminders for a given slot if the user logs data before the reminder fires.

---

## 3. Application Flow & Screen Inventory (Frontend)

The frontend uses `@react-navigation/stack` and `@react-navigation/bottom-tabs` to coordinate across five main pillars: **Home, Insights, Recommendations, Health Lab, and Weekly**.

### Authentication & Onboarding
- `Login`, `SignUp`, `ForgotPassword`
- `OnboardingWelcome` — medical disclaimer acceptance.
- `OnboardingProfile` — 6-step profile capture:
  1. Name (stored locally only — never written to Firestore)
  2. Goals (up to 3 of 7: understand food/body connection, identify triggers, digestion, energy, mood & clarity, sleep, habits)
  3. Symptoms (multi-select grouped: digestive, energy, mental, physical)
  4. Dietary restrictions (allergies incl. wheat/gluten, dietary preferences, sensitivities)
  5. Avoided foods (ingredient-level search)
  6. Symptom frequency (rarely / few times a week / almost daily / after most meals) — used to calibrate engine thresholds
- `OnboardingComplete`

### Core Features
- **Logging**
  - `LogMeal`: Camera/text meal entry bridging to the vision service.
  - `MoodLogger`: Dedicated interface for mood dimensions on a **-2 to +2** bipolar scale. Tracks: `mood`, `stress`, `social`, `energy`, `focus`, `sleep quality`.
  - `SymptomLogger`: Focused interface for physical symptoms (bloating, headache, etc.) on a **1–3** scale.
  - `MealDetail`: Read/write structured breakdown of a single logged meal event.
- **Feed & Timeline**
  - `Timeline`: 7-day chronologic feed of completed meals, moods, and symptoms.
- **Intelligence Surfaces**
  - `InsightFeed`: AI-generated insights organized into four sections — PREDICTIONS, TRIGGERS (incl. energy dip and sleep impact types), PROTECTORS (incl. mood boost type), EMERGING. Insights are sorted by goal relevance using keyword matching against the user's selected goals. Insights with an `actionableInsight.experimentIdToStart` render a tappable "Start Experiment" CTA that navigates directly to HealthLab.
  - `WeeklyPatterns`: Visual display of behavioral patterns over the last evaluated cycle.
  - `RecommendationFeed`: Personalized interventions in three tiers — PREVENTIVE (symptom-linked), HEALTHLAB EXPERIMENTS (recs with `associatedExperimentId`, accept navigates to HealthLab), OPTIMIZATION (all other). Features Accept/Maybe/Dismiss feedback.
  - `FeedbackHistory`: Archive of users' interactions with past recommendations.
- **HealthLab (Experimentation)**
  - `HealthLab`: The experiment discovery dashboard.
  - `ExperimentDetail`: Setup, hypothesis, and control toggles for an active run.
  - `ExperimentResult`: Post-experiment output (delta, metric impact, confidence).
  - `ExperimentHistory`: Archive of completed/abandoned runs.

---

## 4. Core Data Models

The system relies on deeply structured TypeScript types (see `src/models/types.ts` and `src/models/healthlab.ts`).

### 4.1 Input Events (The Ledger)
- **`MealEvent`**:
  - Encompasses `mealSlot` (breakfast/lunch/snack/dinner) and time-series metadata.
  - Advanced ML features: `dishLabel`, canonical `confirmedIngredients`, and dynamically AI-generated clarifying `questions`.
- **`SymptomEvent`** (shared schema for two distinct collections):
  - **Physical Symptoms** (`/symptoms` collection): `symptomType` is a physical symptom string (bloating, headache, etc.), `severity` on a **1–3** scale.
  - **Mood Dimensions** (`/moods` collection): `symptomType` ∈ `{mood, stress, social, energy, focus, sleep quality}`, `severity` on a **-2 to +2** bipolar scale.
  - Pattern engines use a `MOOD_DIMENSIONS` exclusion set to ensure physical and mood events are never mixed in the same correlation analysis.
- **`UserProfile`** (`/users/{uid}` document):
  - `goals`, `symptoms`, `allergies`, `dietaryPreferences`, `sensitivities`, `avoidedFoods`, `symptomFrequency`.
  - Fetched by both `insights_service` and `recommendation_service` on every recompute. `symptomFrequency` drives a `get_frequency_factor()` multiplier applied to all minimum event thresholds in the pattern engines.
  - PII (`name`) is stored locally on-device only (AsyncStorage), never written to Firestore.

### 4.2 Intelligence Outputs
- **`Pattern`**: Extracted behavioral sequences. Includes `confidence`, `severity`, and an `actionableInsight`. Supports ingredient-level detection (e.g., specific triggers or boosters).
- **`Insight`**: Generative intelligence containing `title`, `summary`, `supportingEvidence` (`matchCount`/`sampleSize`), `confidenceLevel`, and optional `actionableInsight.experimentIdToStart` for direct HealthLab navigation.
- **`Recommendation`**: Produced by the recommender engine. Includes `priorityScore`, `confidenceScore`, `scores` (impact, feasibility, mlScore), feedback `action` state, and optional `associatedExperimentId` for HealthLab-linked interventions. Supports personalized string interpolation for ingredients (`{trigger}`) and symptoms (`{symptom}`).

### 4.3 Experimentation Models
- **`ExperimentDefinition`**: Template detailing `targetGoals`, `targetSymptoms`, target metrics (`afternoon_energy`, `mood_stability`, `stress_frequency`), required event types, and duration windows.
- **`ExperimentRun`**: Instance of a user undertaking a definition. Tracks `baselineValue`, `experimentValue`, `resultDelta`, and `status` (active/completed/abandoned).

---

## 5. Execution Summary
1. User interacts with `LogMeal`, `MoodLogger`, or `SymptomLogger`.
2. Frontend writes structured payload to Firestore (triggering external Python `vision_service` if a meal photo needs parsing).
3. On demand or on interval, `insights_service` fetches the user's `UserProfile`, computes a `freq_factor` from `symptomFrequency`, then runs the 9-analyzer pattern engine. New `Insight` records are materialized and cached.
4. `recommendation_service` similarly fetches `UserProfile`, runs its parallel pattern engine with the same frequency scaling, maps patterns to Action Library templates, and applies Contextual Bandit weights based on historical feedback. New `Recommendation` records are persisted.
5. The UI reads finalized intelligence into `InsightFeed` (4 sections, goal-sorted, with experiment CTAs) and `RecommendationFeed` (3-tier: preventive / HealthLab experiments / optimization).
6. From either surface, users can navigate directly into HealthLab to start an experiment linked to a specific pattern or recommendation.
