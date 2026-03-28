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
- Improved user awareness of triggers (mood-linked eating, symptom flare-ups, energy crashes, sleep disruptions).
- Reduced decision fatigue ("What should I do next?").
- Direct pathways from insight → experiment → validated result.

## 3. Users
### Primary User Profile
- Wants lifestyle improvement but struggles with consistency.
- Tends to snack or eat impulsively during stress, low mood, or physical slumps.
- Benefits from low-friction, "one best action" suggestions rather than complex dashboards.

---

## 4. Functional Capabilities

### A. Onboarding & User Profile

A 6-step profile capture that personalizes the entire app experience from first launch.

| Step | What's Collected | How It's Used |
|------|-----------------|---------------|
| 1. Name | Stored locally on-device only (never in Firestore) | Personalization only |
| 2. Goals | Up to 3 of 7 options (see below) | `InsightFeed` sorts by goal-relevant keywords; pattern engine applies **+0.10 confidence boost** to insights whose type directly addresses a selected goal; recommender applies **+0.10 priority boost** to action templates whose `targetGoals` intersect the user's goals |
| 3. Symptoms | Multi-select across Digestive, Energy, Mental, Physical groups | Pattern engine applies **+0.15 confidence boost** to insights whose `symptomType` maps to a reported symptom; surfaces on `InsightFeed` sensitivity profile card |
| 4. Dietary profile | Allergies (incl. wheat/gluten), dietary preferences (vegan, gluten-free, etc.), sensitivities (lactose, caffeine, sugar, etc.) | Displayed on sensitivity profile card; **insight metadata includes a `knownSensitivities` flag** when a trigger ingredient matches a user's reported sensitivity or allergy |
| 5. Avoided foods | Ingredient-level search (2,500+ item database) | Saved to `avoidedFoods` in UserProfile |
| 6. Symptom frequency | Rarely / Few times a week / Almost daily / After most meals | **Directly calibrates pattern engine thresholds** — users with frequent symptoms unlock patterns sooner |

**Goal Options:**
- Understand how food affects my body
- Identify my food triggers
- Improve digestion & gut health
- Improve energy levels
- Improve mood & mental clarity
- **Improve sleep quality** *(routes sleep-related insights to the top of the feed)*
- Build healthier eating habits

---

### B. Multi-Modal Data Ingestion (Logging)

#### 1. AI-Powered Ingredient Capture
- **Visual & Text Dual-Mode**: Supports both camera/gallery uploads and manual text entries.
- **Multi-Step AI Analysis**: Gemini 2.0 Flash provides real-time extraction, identifying dishes and ingredients.
- **Canonical Ingredient Database**: Maps extracted food items against a structured 2,500+ item ingredient library.
- **Binary Clarification Questions**: AI asks simplified Yes/No/Not Sure questions (e.g., "Is this dairy-free?") for quick confirmation.
- **Dish Name Attribution**: Identifies primary "Dish Name" (e.g., "Street Tacos") over generic descriptions.

#### 2. Specialized Mood & Symptom Tracking
- **Decoupled Logging Interfaces**: Dedicated screens for mental and physical states to optimize UX:
    - **`MoodLoggerScreen`**: Emotional check-ins for 6 dimensions: mood, stress, social, energy, focus, sleep quality.
    - **`SymptomLoggerScreen`**: Streamlined for physical symptoms (bloating, headache, etc.).
- **Multi-Scale Architecture**:
    - **Mood Dimensions**: Bipolar **-2 to +2** scale (Neutral at 0). Stored in `/moods` collection with `symptomType` and `severity` fields.
    - **Physical Symptoms**: Unipolar **1–3** scale (Mild, Moderate, Severe). Stored in `/symptoms` collection.
- **Pattern Engine Separation**: Engines use a `MOOD_DIMENSIONS` exclusion set to ensure physical and emotional signals are never mixed in the same correlation analysis.

---

### C. Intelligence Engines

#### 1. Insights Pattern Engine (`insights_service`)

Detects behavioral clusters using a rolling data window. Minimum event thresholds are **dynamically scaled** by the user's `symptomFrequency` onboarding answer (range: 0.6× for "after most meals" → 1.25× for "rarely").

**Active Analyzers (9 total):**

| # | Analyzer | Signal | Window | Min Events |
|---|----------|--------|--------|------------|
| P1 | Mood-Triggered Eating | Eating within 1h of low mood or high stress | 0–1h | — |
| P2 | Late-Night Cluster | Snacks after configurable cutoff (default 9 PM) | — | 5 snacks* |
| P3 | Weekday/Weekend Shift | Weekend snack frequency vs. weekday | — | 5 snacks* |
| P4 | Mood Correlations | Ingredient lift vs. mood dip events | 0–4h | 3 mood dips* |
| P5 | Mood Boosters | Ingredient lift vs. elevated mood (≥+1) | 0–4h | 3 high moods* |
| P6 | Symptom Correlations | Ingredient lift vs. physical symptoms | 0–6h | 2 events |
| P7 | Delayed Triggers | Ingredient lift vs. physical symptoms (stricter: lift ≥ 2.0) | 6–24h | 2 events |
| P8 | Energy Dip Triggers | Ingredient lift vs. low energy events | 0–4h | 3 energy dips* |
| P9 | Sleep Impact Triggers | Evening meal ingredients vs. poor sleep quality | 2–8h | 3 sleep events* |

*\* Scaled by `symptomFrequency` factor*

**Quality Controls:**
- **Lift scoring**: `event_rate / baseline_rate` prevents staple-food false positives.
- **Per-event `seen` sets**: Prevents multi-meal window inflation.
- **Deduplication**: Same (ingredient, symptomType) pair detected by both P6 and P7 → P6 preferred.

**Profile-Aware Confidence Boosting (`boost_by_profile`):**
After deduplication, every insight's `confidenceScore` is adjusted based on the user's profile:
- **+0.10** if the insight type directly addresses one of the user's stated goals (e.g., `energy_dip` insight + `improve_energy` goal).
- **+0.15** if the insight's `symptomType` maps to a symptom the user reported during onboarding (e.g., `energy` insight + `fatigue` symptom).
- Scores are capped at 1.0; `confidenceLevel` is recomputed after boosting.

**Sensitivity Flagging:**
Trigger insights produced by P6, P7, P8, and P9 include a `knownSensitivities` list in their `metadata` field. This list is populated when the trigger ingredient matches a user's known sensitivities or allergies (e.g., a coffee-triggered energy dip for a `caffeine_sensitive` user → `knownSensitivities: ["caffeine_sensitive"]`).

**Insight Types → UI Sections:**
- `trigger_pattern`, `mood_trigger`, `correlation`, `energy_dip`, `sleep_impact` → **TRIGGERS**
- `protective`, `mood_boost` → **PROTECTORS**
- `timing_pattern`, `behavior_shift`, `mood_association` → **EMERGING**
- `prediction` → **PREDICTIONS**

**Goal-Aware Sorting:** `InsightFeed` sorts results by keyword match against the user's selected goals. Each goal maps to a set of keywords (e.g., `improve_sleep` → `['sleep', 'evening', 'bedtime', 'night', 'rest', 'insomnia']`).

**InsightCard CTA:** When an insight has `actionableInsight.experimentIdToStart`, the card renders a "Start Experiment" button that navigates directly to the `ExperimentDetail` screen, passing `linkedInsightId` to establish provenance.

---

#### 2. Personalized Recommender Engine (`recommendation_service`)

Transforms detected patterns into ranked, actionable interventions using a **Contextual Bandit Model**.

**Action Library: 21 Templates across 5 Types:**
- `soft_intervention` — low-friction behavior nudges (60-second pause, reset habits)
- `timing_intervention` — when to eat (10-min buffer, kitchen cutoff, meal anchoring, sleep timing)
- `substitution` — what to eat instead (pairing snacks, food swaps, energy swaps)
- `prevention_plan` — proactive planning (default snack, bridge snack, weekend plan, trigger avoidance)
- `recovery` — post-event resets (movement after heavy meals, wind-down routines)

Each template carries two annotation fields that enable goal-aware ranking:
- `targetGoals` — which user goals this template addresses (e.g., `["improve_energy"]`)
- `targetSymptomTypes` — which pattern symptom dimensions this template targets (e.g., `["energy"]`)

**Pattern Types Covered:**
`mood_dip_then_eat`, `late_night_eating_cluster`, `weekday_weekend_shift`, `meal_type_mood_association`, `symptom_correlation`, `mood_boost`, `delayed_trigger`, `energy_dip_trigger`, `sleep_impact_trigger`

**Goal-Aware Priority Boost:**
After the candidate ranking loop, the engine applies a **+0.10 `priorityScore` boost** to any recommendation whose template's `targetGoals` intersects the user's stated goals. The boost is recorded in `scores.goal_boost = true` for traceability.

**Output Tiers (rendered in `RecommendationFeed`):**

| Tier | Condition | UI Treatment |
|------|-----------|-------------|
| PREVENTIVE | `category = symptom_prevention` or `type = prevention_plan` | Top section, highest urgency |
| HEALTHLAB EXPERIMENTS | Has `associatedExperimentId` | Hero card with Beaker icon; Accept navigates to HealthLab with `linkedRecommendationId` |
| OPTIMIZATION | Everything else | Standard card layout |

Active experiments are filtered from the feed (if the experiment is already running, the linked rec is hidden).

---

### D. Adaptation & Feedback Loop
- **Interactive Feedback**: Users respond with `Accept`, `Maybe`, or `Dismiss`.
- **Dynamic Penalty Logic**: Consistently rejected intervention types receive a score penalty to demote them in future rankings.
- **Feedback History**: Dedicated log of past recommendations and their given outcomes.
- **Feedback Persistence**: Feedback is stored both in Firestore (via `RecommendationService.submitAction`) and locally (via `FeedbackStorageService` in AsyncStorage).

---

### E. HealthLab — Behavioral Experimentation System
A system for short, structured behavioral experiments (4–5 days) to measure causal effects of food habits on mood, energy, and symptoms.

#### Canonical Experiment Library (9 Templates)

All experiments are defined in `src/services/healthlab/definitions.ts` (frontend) and `functions/health_lab_service/experiment_library.py` (backend). Both files use an identical set of 9 templates — the single source of truth for experiment IDs and metadata.

| `templateId` | Name | Duration | Primary Metric |
|---|---|---|---|
| `high_protein_breakfast` | High-Protein Breakfast | 5 days | `afternoon_energy` |
| `protein_snack_3pm` | 3 PM Protein Snack | 4 days | `afternoon_energy` |
| `hydration_boost` | Hydration Boost | 5 days | `avg_energy` |
| `caffeine_cutoff` | Caffeine Before Noon | 5 days | `next_day_energy` |
| `early_dinner` | Early Dinner (Before 7 PM) | 5 days | `next_day_energy` |
| `regular_meal_timing` | Regular Meal Timing | 7 days | `mood_stability` |
| `dairy_elimination` | Dairy-Free Week | 7 days | `symptom_frequency` |
| `gluten_elimination` | Gluten-Free Week | 7 days | `symptom_frequency` |
| `stress_reset_60s` | 60-Second Stress Reset | 5 days | `stress_frequency` |

#### Firestore Path & Document Format
All experiment runs are stored at `users/{uid}/experiments/{runId}`. Each `ExperimentRun` document carries both `templateId` (canonical identifier) and `experimentId` (backward-compatible alias) so that pre-existing documents from earlier builds remain readable.

#### Experiment Lifecycle
1. **Discovery**: `HealthLabScreen` shows all 9 available experiments. The "Run Experiment Simulation" button seeds a completed run for testing the full result flow.
2. **Entry Points**:
   - Browse from HealthLab directly
   - Tap "Start Experiment" CTA on an `InsightCard` with `experimentIdToStart`
   - Accept a HEALTHLAB EXPERIMENTS tier recommendation (auto-navigates to `ExperimentDetail`)
   - Tap "Test This" on an `EmergingPatternCard` (navigates with the pattern's `suggestedExperimentId`)
3. **Provenance Chain**: When an experiment is started from an `InsightCard` or a recommendation, the originating `linkedInsightId` or `linkedRecommendationId` is passed through the navigation route and persisted to the `ExperimentRun` document in Firestore via `ExperimentEngine.patchProvenance()`. This creates a traceable chain from pattern → insight/recommendation → experiment run.
4. **Active Experiment Card Nudge**: `ActiveExperimentCard` (displayed on `TimelineScreen` and `HealthLabScreen`) shows a progress bar (day N / total days), a percent-complete label, and a contextual nudge row ("Log today: Meals · Energy") derived from the experiment's `requiredEvents` field. This keeps the user aware of what to log during an active run.
5. **Analysis Engine**: Computes experiment metrics against a 7-day pre-experiment baseline using these 8 metrics:
   - `avg_energy` — average of all `energy` mood logs
   - `afternoon_energy` — average energy logs logged between 12:00–18:00
   - `next_day_energy` — average energy logs logged between 06:00–10:00
   - `avg_mood` — average of all `mood` logs
   - `mood_stability` — `1 − mean(|severity|)` across mood and energy logs
   - `stress_frequency` — count of stress logs with `severity ≥ 1` (inverted scale: +2 = Stressed)
   - `symptom_frequency` — count of physical symptom events
   - `symptom_severity` — average `severity` across physical symptom events
   Returns delta % and confidence score (`high`, `medium`, `low`).
6. **Completion Feedback Loop**: When the user taps "Finish Protocol" on `ExperimentResultScreen`, the app fire-and-forgets calls to `InsightService.recomputeInsights('experiment_completed')` and `RecommendationService.recomputeRecommendations('experiment_completed')`. Both feeds are refreshed immediately, so the completed experiment's data is reflected the next time the user opens either feed.
7. **Smart UX**: Features retry logic for low-confidence results, experiment history archiving, and smart filtering of completed high-confidence studies.

#### Experiment Definitions Key Fields
- `templateId` — canonical identifier shared by frontend and backend
- `targetGoals` — which user goals this experiment addresses
- `targetSymptoms` — which physical symptoms this experiment targets
- `metrics` — which mood dimensions to track during the run
- `instructions` — step-by-step guidance shown in `ExperimentDetail`
- `difficulty` — `easy`, `medium`, or `hard`

---

### F. Pattern Alerts — Real-Time Emerging Pattern Detection

A lightweight background scan that detects short-term patterns forming in the most recent 3–5 days and surfaces them as **Emerging Pattern** cards on the Timeline — before the user runs a full experiment or waits for the weekly report.

#### Detection Logic (`pattern_alerts_service`)

Four detectors run independently (one failure does not block the others):

| Detector | Window | Condition | Suggested Experiment |
|---|---|---|---|
| `energy_dip_streak` | Last 5 days | 3+ afternoon energy logs (hour 12–18, `severity ≤ −1`) on distinct calendar dates | `protein_snack_3pm` (≤3 days streak) or `high_protein_breakfast` (4+ days) |
| `symptom_streak` | Last 5 days | Same `symptomType` on 3+ distinct calendar dates | `dairy_elimination` (digestive), `gluten_elimination` (neurological), `dairy_elimination` (default) |
| `mood_dip_pattern` | Last 4 days | 3+ mood logs (`symptomType='mood'`, `severity ≤ −1`) on any days | `regular_meal_timing` |
| `stress_spike` | Last 3 days | 3+ stress logs (`severity ≥ +1`) — inverted scale; +2 = Stressed | `stress_reset_60s` |

**Stress severity is inverted**: the slider runs from −2 (Relaxed) to +2 (Stressed), so the threshold is `≥ 1`, not `≤ −1`.

#### Firestore Schema

**Collection:** `users/{userId}/pattern_alerts/{alertId}`

```
{
  type:                  'energy_dip_streak' | 'symptom_streak' | 'mood_dip_pattern' | 'stress_spike',
  title:                 string,
  summary:               string,
  suggestedExperimentId: string,
  evidence: {
    streakLength: number,
    metricAvg:    number,
    days:         string[],  // ISO date strings
  },
  status:    'active' | 'dismissed',
  createdAt: string,          // ISO UTC
  expiresAt: string,          // createdAt + 72 hours
  userId:    string,
}
```

**Deduplication**: No new alert is written if an active, non-expired doc of the same `type` already exists for the user (`(userId, type)` key). The scan returns `{ "created": N, "skipped": M }`.

**TTL**: Alerts expire 72 hours after creation. Expired alerts are filtered client-side in `getActiveAlerts()` (no composite Firestore index required — single `where('status', '==', 'active')` query with client-side `expiresAt > now` filter; max 4 active alerts per user makes this negligible).

#### Frontend Integration

- **`PatternAlertService`** (`src/services/patternAlertService.ts`):
  - `scanForAlerts(force?)` — POSTs to `…/v1/users/{uid}/pattern-alerts/scan`. Enforces a 2-hour debounce via AsyncStorage key `veyra_pattern_alerts_last_scan`. Non-blocking — never throws to the caller.
  - `getActiveAlerts()` — Direct Firestore read with client-side expiry filtering. Returns `PatternAlert[]`.
  - `dismissAlert(alertId)` — Sets `status: 'dismissed'` via `updateDoc`.

- **Scan Triggers**: `MoodLoggerScreen` and `SymptomLoggerScreen` each call `PatternAlertService.scanForAlerts()` (fire-and-forget) after saving a log. The 2-hour debounce inside the service prevents redundant network calls.

- **`EmergingPatternCard`** (`app/components/EmergingPatternCard.tsx`): Amber card (`Colors.warning`) rendered on `TimelineScreen` after active experiment cards. Displays:
  - "EMERGING PATTERN" header with `AlertTriangle` icon
  - Alert title and summary
  - Evidence pill: "N days in a row"
  - "Test This" CTA → calls `onStartExperiment(alert.suggestedExperimentId)` (navigates to `ExperimentDetail`)
  - Dismiss X → calls `onDismiss(alertId)` (optimistic local removal + Firestore write)
  The CTA and dismiss are independent actions — tapping CTA does not dismiss.

- **`TimelineScreen` integration**: On `loadData()`, `PatternAlertService.getActiveAlerts()` is included in the `Promise.all`. After `setLoading(false)`, `PatternAlertService.scanForAlerts()` runs in the background. Dismissed alerts are tracked in a local `Set` for optimistic UI updates without waiting for Firestore.

#### Deployment
`pattern_alerts_service` is a Python 3.12 Cloud Function registered in `firebase.json` under the `patternalerts` codebase. A dedicated GitHub Actions workflow (`deploy-patternalerts.yml`) deploys it independently when changes are pushed to `functions/pattern_alerts_service/**`.

---

## 6. Infrastructure & Deployment

- **Independent Backend Services**: Each intelligence engine is a decoupled Python service.
- **Automated Independent CI/CD**: Backend functions are independently deployed via GitHub Actions using path-based triggers. Only the service directory modified is pushed to production (`firebase deploy --only functions:<codebase>`).
- **Fast Experience**: The core logging path must remain under 30 seconds.
- **Safe Fallback**: If confidence is too low (e.g., unidentifiable meal, sparse pattern history), the app will recommend a low-risk action or request more data rather than presenting speculative conclusions.
- **Modular Architecture**: Logging, patterns, recommendations, and HealthLab are kept structurally independent for easy iteration.
- **Privacy by Design**: User PII (name) stored locally only; Firestore stores only anonymous behavioral data keyed by UID.
- **Adaptive Thresholds**: Pattern engine minimum event requirements scale with user-reported symptom frequency, preventing early users from waiting too long for their first insights.

*(End of Product Specification)*
