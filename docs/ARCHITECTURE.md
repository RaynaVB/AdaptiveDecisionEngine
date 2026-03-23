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
  - `Firestore`: Primary database storing structured event data (Meals, Moods, Users, Experiments).
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
   - **Mechanism:** Aggregates logs to compute pre-experiment baselines vs. active experiment periods. Outputs statistical deltas for targeted metrics (e.g., `afternoon_energy`, `symptom_frequency`) and confidence scoring.
3. **`recommendation_service`**
   - **Role:** Generates actionable, personalized interventions.
   - **Mechanism:** Uses a Contextual Bandit Model to score interventions based on ML confidence, expected impact, user feasibility, and past feedback histories.
4. **`weekly_patterns_service`**
   - **Role:** Detects behavioral clusters.
   - **Mechanism:** Scans time-series data to locate conditions like "Mood-Triggered Eating" or "Symptom Correlations". Uses a strict statistical uncertainty policy to avoid false positives.
5. **`insights_service`**
   - **Role:** Generates localized and time-based summary intelligence for the Insights Feed.

---

## 3. Application Flow & Screen Inventory (Frontend)

The frontend uses `@react-navigation/stack` and `@react-navigation/bottom-tabs` to coordinate across five main pillars: **Home, Insights, Recommendations, Health Lab, and Weekly**.

### Authentication & Onboarding
- `Login`, `SignUp`, `ForgotPassword`
- `OnboardingWelcome`, `OnboardingProfile`, `OnboardingComplete`: Sets up initial user baseline parameters.

### Core Features
- **Logging**
  - `LogMeal`: Camera/text meal entry bridging to the vision service.
  - `SymptomLogger`: Unified slider-based interface for logging physical and emotional states.
  - `MealDetail`: Read/write structured breakdown of a single logged meal event.
- **Feed & Timeline**
  - `Timeline`: 7-day chronologic feed of completed meals and moods.
- **Intelligence Surfaces**
  - `InsightFeed`: AI-generated insight statements powered by pattern recognition.
  - `WeeklyPatterns`: Visual display of behavioral patterns over the last evaluated cycle.
  - `RecommendationFeed`: Personalized interventions ranked 1-3. Features the Adopt/Maybe/Reject feedback mechanisms.
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
  - Encompasses `mealSlot` (breakfast/lunch/snack/dinner) and `mealTypeTags`.
  - Advanced ML features: `dishLabel`, canonical `confirmedIngredients`, and dynamically AI-generated clarifying `questions`.
- **`MoodEvent`**:
  - The unified event capturing *both* emotional shifts (`valence`, `arousal`, `energy`) and physical states (`symptom_severity`, specific symptom tags). Allows holistic pattern overlap between mental and physical wellbeing.

### 4.2 Intelligence Outputs
- **`Pattern`**: Extracted behavioral sequences. Includes `confidence`, `severity`, and an `actionableInsight` (to trigger HealthLab workflows).
- **`Recommendation`**: Produced by the recommender engine. Includes `priorityScore`, `confidenceScore`, array of exact `scores` (impact, feasibility, mlScore), and the feedback `action` outcome.
- **`Insight`**: Generative intelligence containing `supportingEvidence` and `confidenceLevel`.

### 4.3 Experimentation Models
- **`ExperimentDefinition`**: Template detailing target metrics (`avg_energy`, `symptom_frequency`), required event types, and duration windows.
- **`ExperimentRun`**: The instance of a user undertaking a definition. Tracks the `baselineValue`, `experimentValue`, the `resultDelta`, and the run `status` (active/completed).

---

## 5. Execution Summary
1. User interacts with `LogMeal` or `SymptomLogger`.
2. Frontend writes structured payload to `Firestore` (triggering external Python `vision_service` if a meal photo needs parsing).
3. On demand or on interval, the backend functions (`weekly_patterns_service`, `insights_service`) sweep recent historical chunks. New `Pattern` records and `Insight` records are materialized.
4. The `recommendation_service` maps active patterns to candidate interventions, applies contextual bandit weights based on historical user feedback, and persists `Recommendation` records.
5. The UI reads finalized read-only intelligence into `RecommendationFeed` and `WeeklyPatterns` surfaces for the user.
