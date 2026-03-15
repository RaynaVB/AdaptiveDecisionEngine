# Adaptive Decision Engine (Health) — Product Specification
## Current Implementation State (March 2026)

This document details all active features and technical capabilities of the **Adaptive Decision Engine**. It covers data ingestion, intelligence engines, the personalized adaptation loop, and the HealthLab behavioral experimentation system.

---

### 1. Core Architecture & Infrastructure

The system is a modular React Native application (Expo) with a clear separation between data collection, behavioral analysis, and intervention logic.

- **Frontend**: Stack-based navigation (`@react-navigation/stack`) with a centralized `Timeline` as the home state.
- **Backend Service Layer**:
  - **Firebase Firestore**: Persistent, cloud-synced storage for user profiles, meal/mood logs, and experiment runs.
  - **Firebase Auth**: Secure user authentication and session management.
  - **AsyncStorage**: Local storage for recommendation feedback, enabling fast, offline-compatible adaptation.
- **Intelligence Core**: Decoupled `pattern_engine`, `recommender_engine`, and `experimentAnalysis` modules allow for independent iteration on analytical logic.

---

### 2. Multi-Modal Data Ingestion

#### A. Interactive Meal Logging
- **Visual Capture**: Integrated camera and image library support via Expo APIs.
- **ML-Powered Inference**: Automated image analysis via `visionService.ts` using Gemini 2.0 Flash to suggest descriptions and structured tags.
- **Structured Tagging**: Three-tier tagging (Load: `light`/`regular`/`heavy`; Type: `sweet`/`savory`; Context: `homemade`/`restaurant`/`packaged`).
- **Temporal Slotting**: Automatic assignment to `breakfast`, `lunch`, `dinner`, or `snack` slots based on time of entry.
- **Meal Detail View**: Dedicated screen (`MealDetailScreen`) showing the full structured record, linked mood context, and photo.

#### B. Integrated Symptom & Mood Tracking
- **Unified Logging Interface**: A single, dynamic `SymptomLoggerScreen` handles both physical symptoms (e.g., Nausea, Headache) and emotional check-ins (e.g., Anxiety, Low Energy).
- **Multi-Logging with Sliders**: Users can log multiple symptoms simultaneously by adjusting severity sliders (0-5 scale) with dynamic color transitions.
- **Duration Presets**: Quick-select presets (5m, 15m, 1h, etc.) for symptoms.
- **Single Event Model**: Both physical and emotional symptoms utilize the `SymptomEvent` data model, allowing the pattern engine to seamlessly correlate both against lifestyle factors without separate pipelines.
- **Top 5 Personalization**: The logging interface automatically surfaces the user's most frequently logged symptoms for their selected mode.

#### C. Timeline — Chronological Feed
- **7-Day Sliding Feed**: Displays all meals, moods, and symptoms in a `SectionList` grouped by day.
- **Week at a Glance**: A summarized top row showing 7 distinct visual dot indicators, with each dot corresponding to total logged daily events. Color coding reflects symptom severities.
- **Daily Timeline Modal**: Tapping a day's dot in the Week at a Glance opens a custom, interactive `Modal` presenting the day's timeline for meals, moods, and symptoms mirroring the chronological UI aesthetic.
- **Swipe-to-Delete**: Native-feel gesture-based deletion (`PanResponder`) for both meal and mood cards with animated red delete indicator.
- **Animated Removal**: Uses `LayoutAnimation` for smooth card collapse on deletion.
- **Chart Summaries**: Embedded weekly bar/line charts showing mood and meal trends.
- **Weekly Intelligence**: An intelligence summary section displaying dynamic insights. This features a specialized dense "Tag Cloud" layout for top weekly symptoms to preserve vertical real estate and present quick density views.
- **Quick Actions**: Log Meal, Log Mood, and navigation to intelligence features accessible from the header.

---

### 3. Intelligence Engines

#### A. Pattern Engine
Detects behavioral clusters using a 7-day sliding window with an **Uncertainty Policy** that gates results until minimum data density is met (5 meals, 3 moods).

**Active Detectors:**
| ID | Name | Trigger |
|---|---|---|
| P1 | Mood-Triggered Eating | Eating follows low mood or high stress |
| P2 | Late-Night Clustering | Contiguous eating events in late-night hours |
| P3 | Routine Shifts | Divergence in eating/mood between weekdays and weekends |
| P4 | Meal-Mood Correlations | Specific meal tags linked to subsequent mood/energy shifts |
| P5 | Symptom Correlations | Specific meal tags linked to subsequent physical or emotional symptoms |

- **Actionable Insights / Experiment Pipeline**: Detected patterns automatically surface an `actionableInsight`. This insight acts as a direct suggestion to the user, providing a 1-tap pathway to start a specific, relevant HealthLab Experiment right from the Weekly Patterns screen.

#### B. Personalized Recommender Engine
Transforms detected patterns into ranked, actionable interventions using a **Contextual Bandit Model**.

- **Personalization Layer**: `banditModel.ts` and `contextBuilder.ts` use temporal factors and recent behavioral history to predict the most effective intervention.
- **Action Library**: 5 intervention archetypes:
  - `timing_intervention` — e.g., 10-minute eating buffers
  - `substitution` — e.g., pairing sweet snacks with protein
  - `prevention_plan` — e.g., pre-planned bridge snacks
  - `recovery` — e.g., short movement resets
  - `soft_intervention` — e.g., 60-second breathing pauses
- **Scoring & Ranking**: Each candidate is scored across **Impact** (40%), **Feasibility** (40%), and **ML-Reward** (20%). The engine returns exactly 3 options: 1 "Best Next Action" + 2 alternatives.

---

### 4. Adaptation & Feedback Loop

- **Interactive Feedback**: Users respond to recommendations with `Adopt`, `Maybe`, or `Reject`.
- **Persisted Outcomes**: Feedback is stored locally as structured, queryable events.
- **Dynamic Penalty Logic**: Rejection rates are tracked per recommendation type. Consistently rejected types receive a score penalty (up to 40%), demoting them in future rankings.
- **Feedback History Screen**: A dedicated log (`FeedbackHistoryScreen`) of all past recommendation interactions and their outcomes.

---

### 5. HealthLab — Behavioral Experimentation System

HealthLab allows users to run short, structured behavioral experiments (4–5 days) to measure the causal effect of specific habits on mood, energy, and stress. It operates as a mini scientific study within the app.

#### A. Experiment Library
Five built-in experiments, each with a defined hypothesis, duration, baseline window (7 days), and target metric:

| ID | Name | Category | Target Metric | Duration |
|---|---|---|---|---|
| `protein_breakfast` | Protein Breakfast | Nutrition | Afternoon Energy | 5 days |
| `no_late_snacks` | No Late Snacks | Timing | Next-Day Energy | 4 days |
| `hydration_boost` | Hydration Boost | Nutrition | Mood Stability | 5 days |
| `protein_snack_3pm` | Protein Snack at 3 PM | Energy | Afternoon Energy | 5 days |
| `stress_reset_60s` | 60-Second Stress Reset | Stress | Stress Frequency | 5 days |
| `dairy_reduction` | Dairy-Free Week | Nutrition | Symptom Frequency | 7 days |
| `hydration_brain_fog` | Hydration vs Brain Fog | Interventions | Symptom Severity | 5 days |

#### B. Experiment Lifecycle
1. **Discovery**: `HealthLabScreen` lists all available experiments. Experiments already completed with High/Medium confidence are hidden from the list.
2. **Activation**: User starts an experiment from `ExperimentDetailScreen`. **Multiple experiments can be active concurrently**, allowing a user to run short and long-term studies simultaneously.
3. **Active Banner**: In-progress experiments appear as a list of highlighted cards on the HealthLab dashboard.
4. **Completion**: User manually completes the experiment, triggering the Analysis Engine.
5. **Results**: `ExperimentResultScreen` displays the delta %, confidence score, and a contextual recommendation.

#### C. Analysis Engine (`experimentAnalysis.ts`)
- **Baseline Computation**: Averages the target metric over the 7-day pre-experiment window.
- **Experiment Computation**: Averages the same metric over the active experiment period.
- **Delta Calculation**: `((experimentValue - baseline) / baseline) * 100`
- **Confidence Scoring**:
  - `high` — >15 total data points (meals + moods) during experiment period
  - `medium` — 6–15 data points
  - `low` — ≤5 data points

**Target Metrics Supported:**
- `afternoon_energy` — Average energy 2–4 PM
- `next_day_energy` — Average energy 6–10 AM
- `mood_stability` — Average mood valence
- `stress_frequency` — High-stress events per day
- `symptom_frequency` — Count of reported symptoms per day
- `symptom_severity` — Average severity score of reported symptoms
- `avg_energy`, `avg_mood` — General daily averages

#### D. Smart UX Behaviors
- **Retry Logic**: If confidence is `low`, a "Retry Experiment" button appears on the result screen, allowing the user to immediately restart the study for better data.
- **Smart Filtering**: Completed high/medium-confidence experiments are removed from the Available list, keeping the dashboard focused on new studies.
- **Experiment History**: A dedicated `ExperimentHistoryScreen` shows all past runs (completed and abandoned) with their delta and confidence scores.
- **Focus Refresh**: The HealthLab dashboard automatically re-fetches data when navigated back to, ensuring state is always current.
- **Simulation Utility**: A developer "Simulate Full 7-Day Study" button seeds backdated mood, meal, and **symptom** data for the active experiment and immediately completes it, enabling end-to-end testing of the analysis pipeline and the surfacing of pattern-triggered experiments (like P5).

---

### 6. Screen Inventory

| Screen | Route Key | Description |
|---|---|---|
| Timeline | `Timeline` | 7-day feed of meals and moods with swipe-to-delete and charts |
| Log Meal | `LogMeal` | Camera/text meal entry with ML-powered tagging |
| Log Mood / Symptom | `SymptomLogger` | Unified slider-based interface for multi-logging symptoms and moods |
| Meal Detail | `MealDetail` | Full record view for a single meal event |
| Weekly Patterns | `WeeklyPatterns` | Visual display of recognized behavioral patterns |
| Recommendation Feed | `Recommendations` | Personalized, ranked interventions with feedback controls |
| Feedback History | `FeedbackHistory` | Log of all past recommendation outcomes |
| HealthLab | `HealthLab` | Experiment discovery dashboard |
| Experiment Detail | `ExperimentDetail` | Hypothesis, controls, and start/complete/abandon actions |
| Experiment History | `ExperimentHistory` | Archive of all past experiment runs |
| Experiment Result | `ExperimentResult` | Delta, confidence, and recommendations for a completed run |
| Login | `Login` | Email/password authentication |
| Sign Up | `SignUp` | Account creation |
| Forgot Password | `ForgotPassword` | Password reset via email |
| Onboarding Welcome | `OnboardingWelcome` | First-run welcome flow |
| Onboarding Profile | `OnboardingProfile` | Initial user profiling for personalization |
| Onboarding Complete | `OnboardingComplete` | Completion of setup, transitions to Timeline |
