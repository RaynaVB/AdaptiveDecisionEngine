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
   - **Mechanism:** Runs a 9-analyzer pattern engine over a rolling window of meal, mood, and symptom events. Fetches the user's full `UserProfile` from Firestore on each recompute. Uses `symptomFrequency` to dynamically scale minimum event thresholds (`get_frequency_factor()` returns 0.6×–1.25×). After all analyzers run, applies `boost_by_profile()` to adjust confidence scores based on the user's stated goals and reported symptoms.
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
   - **Profile-Aware Confidence Boosting (`boost_by_profile`):** Applied as a post-processing step after deduplication. Each insight receives:
     - **+0.10** if its `type` appears in `GOAL_TO_INSIGHT_TYPES[goal]` for any of the user's stated goals.
     - **+0.15** if its `metadata.symptomType` maps (via `SYMPTOM_TYPE_TO_ONBOARDING`) to any symptom the user reported at onboarding.
     - Scores are capped at 1.0; `confidenceLevel` is recomputed after boosting.
   - **Sensitivity Flagging (`check_sensitivity_flags`):** Analyzers P6, P7, P8, and P9 populate `metadata.knownSensitivities` on each trigger insight. The helper checks the trigger ingredient name against `SENSITIVITY_KEYWORDS` (lactose, caffeine, sugar, wheat/gluten, alcohol) and the user's `sensitivities` + `allergies` lists. Result is a list of matched sensitivity keys (empty list if none).
   - **Vocabulary Mapping Dicts:** `SYMPTOM_TYPE_TO_ONBOARDING` maps internal `symptomType` strings to onboarding values; `GOAL_TO_INSIGHT_TYPES` maps each of the 7 user goals to the insight types that directly address it; `SENSITIVITY_KEYWORDS` maps sensitivity keys to canonical ingredient keyword lists.
   - **Deduplication:** When the same (ingredient, symptomType) pair is flagged by both immediate and delayed analyzers, the 0–6h result is preferred.
   - **Lift Scoring:** All ingredient correlations use lift = `event_rate / baseline_rate` (threshold ≥ 1.5 for immediate, ≥ 2.0 for delayed) to avoid false positives from staple foods.
   - **Cache / TTL:** Cached for 12 hours; invalidated on new symptom log or 3+ new meals.

4. **`recommendation_service`**
   - **Role:** Generates actionable, personalized interventions ranked for the Recommendations Feed.
   - **Mechanism:** Runs a parallel pattern engine (same analyzers as insights_service, scoped for recommendation generation) with the same `symptomFrequency` threshold scaling. Maps detected patterns to an **Action Library of 21 templates** across 5 recommendation types: `timing_intervention`, `substitution`, `prevention_plan`, `recovery`, `soft_intervention`. Applies a **Contextual Bandit Model** to score interventions. Then applies a goal-aware priority boost.
   - **Action Library Annotations:** Every template carries `targetGoals: Optional[List[str]]` and `targetSymptomTypes: Optional[List[str]]` fields that declare which user goals and symptom dimensions the template addresses.
   - **Goal-Aware Priority Boost:** After the candidate loop, `run_recommendation_engine` receives the full `user_profile`. For any candidate whose template's `targetGoals` intersects the user's stated goals, `priorityScore` is boosted by **+0.10** (capped at 1.0) and `scores.goal_boost` is set to `True`. This ensures energy, sleep, and digestion templates rank above generic ones for users who selected the corresponding goals.
   - **Output Tiers (rendered in UI):**
     - `preventive` — symptom-prevention patterns with high urgency
     - `experiment` — recommendations with an `associatedExperimentId` (link to HealthLab); accept action navigates to `ExperimentDetail` with `linkedRecommendationId` for provenance
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
  - Fetched by both `insights_service` and `recommendation_service` on every recompute.
  - `symptomFrequency` drives a `get_frequency_factor()` multiplier (0.6×–1.25×) applied to all minimum event thresholds.
  - `goals` and `symptoms` drive post-processing confidence boosts in `boost_by_profile()` (insights engine) and priority boosts in `run_recommendation_engine()` (recommendation engine).
  - `sensitivities` and `allergies` populate `metadata.knownSensitivities` on trigger insights via `check_sensitivity_flags()`.
  - PII (`name`) is stored locally on-device only (AsyncStorage), never written to Firestore.

### 4.2 Intelligence Outputs
- **`Pattern`**: Extracted behavioral sequences. Includes `confidence`, `severity`, and an `actionableInsight`. Supports ingredient-level detection (e.g., specific triggers or boosters).
- **`Insight`**: Generative intelligence containing `title`, `summary`, `supportingEvidence` (`matchCount`/`sampleSize`), `confidenceLevel` (adjusted by `boost_by_profile`), and optional `actionableInsight.experimentIdToStart` for direct HealthLab navigation. Trigger insights (types: `trigger_pattern`, `delayed_trigger`, `energy_dip`, `sleep_impact`) carry `metadata.knownSensitivities: string[]` populated from the user's dietary profile.
- **`Recommendation`**: Produced by the recommender engine. Includes `priorityScore` (boosted by +0.10 for goal-matched templates), `confidenceScore`, `scores` (impact, feasibility, mlScore, optional `goal_boost: true`), feedback `action` state, and optional `associatedExperimentId` for HealthLab-linked interventions. Supports personalized string interpolation for ingredients (`{trigger}`) and symptoms (`{symptom}`).

### 4.3 Experimentation Models
- **`ExperimentDefinition`**: Template detailing `targetGoals`, `targetSymptoms`, target metrics (`afternoon_energy`, `mood_stability`, `stress_frequency`), required event types, and duration windows.
- **`ExperimentRun`**: Instance of a user undertaking a definition. Tracks `baselineValue`, `experimentValue`, `resultDelta`, and `status` (active/completed/abandoned). Carries optional **provenance fields** — `linkedInsightId` and `linkedRecommendationId` — that record which insight or recommendation originated the run. These are persisted to Firestore by `ExperimentEngine.patchProvenance()` immediately after `HealthLabService.startExperiment()` resolves.

---

## 6. CI/CD & Deployment

The system uses automated GitHub Actions for Continuous Deployment of backend services to Firebase.

- **Independent Service Deployment**: Each cloud function codebase is managed by a dedicated GitHub workflow (`deploy-recommendations.yml`, `deploy-insights.yml`, etc.).
- **Path-Based Triggers**: Deployments are only triggered when changes are merged into the specific service directory (e.g., `functions/insights_service/**`).
- **Selective Middleware**: Uses `firebase deploy --only functions:<codebase>` to ensure isolation between service updates.
- **Security**: Authentication is handled via a dedicated Google Cloud Service Account (`FIREBASE_SERVICE_ACCOUNT_ADAPTIVEHEALTHENGINE`) stored in GitHub Secrets.

## 7. Execution Summary
1. User interacts with `LogMeal`, `MoodLogger`, or `SymptomLogger`.
2. Frontend writes structured payload to Firestore (triggering external Python `vision_service` if a meal photo needs parsing).
3. On demand or on interval, `insights_service` fetches the user's full `UserProfile`. Computes `freq_factor` from `symptomFrequency`, then runs the 9-analyzer pattern engine. After deduplication, `boost_by_profile()` adjusts confidence scores based on `goals` (+0.10) and `symptoms` (+0.15). Trigger insights are decorated with `metadata.knownSensitivities` from the user's allergen profile. New `Insight` records are materialized and cached.
4. `recommendation_service` similarly fetches `UserProfile`, runs its parallel pattern engine with the same frequency scaling, maps patterns to Action Library templates, applies Contextual Bandit weights, and applies a **+0.10 goal-aware priority boost** for templates whose `targetGoals` intersect the user's stated goals. New `Recommendation` records are persisted.
5. The UI reads finalized intelligence into `InsightFeed` (4 sections, goal-sorted, with experiment CTAs carrying `linkedInsightId`) and `RecommendationFeed` (3-tier: preventive / HealthLab experiments / optimization; experiment tier accept carries `linkedRecommendationId`).
6. From either surface, users navigate to `ExperimentDetail`. On experiment start, `ExperimentEngine.patchProvenance()` writes `linkedInsightId` or `linkedRecommendationId` to the `ExperimentRun` document, completing the pattern → insight/recommendation → experiment provenance chain.
7. When the user taps "Finish Protocol" on `ExperimentResultScreen`, `InsightService.recomputeInsights('experiment_completed')` and `RecommendationService.recomputeRecommendations('experiment_completed')` are fired asynchronously. Both feeds reflect the completed experiment's data on the user's next visit.
