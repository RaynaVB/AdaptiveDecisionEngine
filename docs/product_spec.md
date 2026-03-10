# Adaptive Decision Engine (Health) — V2
## Current Implemented Product Spec (Generated March 2026)

This document provides a comprehensive breakdown of the current implementation state of the **Adaptive Decision Engine** application, derived directly from the `src/` and `app/` codebase, and mapped against the official 90-Day Plan (`docs/FinalVersion.md`).

---

### **1. Core Concept & Infrastructure**
The application is a mobile tracking tool (React Native + Expo) designed to record **Meals** and **Moods**, detect actionable patterns between them, and provide dynamically scored, low-friction recommendations that adapt to user feedback.
- **Backend/Storage**: 
  - Firebase Firestore via `StorageService` (`src/services/storage.ts`) and Firebase Auth for meals and moods.
  - Local Device Storage via `AsyncStorage` (`src/services/feedbackStorage.ts`) for recommendation feedback.
- **Project Structure**: Uses Expo Router (`app/screens/`) for navigation. Core intelligence modules are decoupled (`src/core/pattern_engine/` and `src/core/recommender_engine/`).

---

### **2. Data Models & Logging (Inputs — Phase 1 Complete)**
The app currently supports capturing two primary event types:

#### **A. Meal Events (`MealEvent`)**
- Users log meals through the `LogMealScreen`.
- **Inputs Supported:**
  - **Multimedia**: Camera photo or Image Library selection OR text description.
  - **Time/Date**: Native Date/Time pickers.
  - **Quick Presets**: 1-tap options (`Quick Snack Sweet`, `Heavy Dinner Out`, `Light Breakfast`).
  - **Tags**: 
    - Base Load: `light`, `regular`, `heavy`.
    - Details: `sweet`, `savory`, `homemade`, `restaurant`, `packaged`, `high_sugar`, `fried_greasy`, `high_protein`, `high_fiber`, `caffeinated`.
  - **Slot**: Automatically assigned (`breakfast`, `lunch`, `dinner`, `snack`).

#### **B. Mood Events (`MoodEvent`)**
- Users log moods via the `LogMoodScreen`.
- **Inputs Supported:**
  - **Valence (Positivity)**: `positive`, `neutral`, `negative` (🙂 😐 🙁).
  - **Energy**: `high`, `ok`, `low`.
  - **Stress**: `low`, `medium`, `high`.
  - **Tagging**: Optional tags (e.g., `anxious`, `bored`, `sad`).
  - **Implicit Linking**: Can link mood to a recently occurring meal.

---

### **3. User Experience & Navigation (Screens)**
Driven by Expo Router (`AppNavigator.tsx`):
- **TimelineScreen**: The central hub displaying the trailing **7 days**. Merges meals/moods chronologically. Sub-calculates contextual mood for meals (within a 6-hour prior window). Features a Speed Dial FAB.
- **LogMealScreen / LogMoodScreen**: Data entry.
- **MealDetailScreen**: Dedicated view for a saved log.
- **WeeklyPatternsScreen**: Renders the analytical output from the Pattern Engine.
- **RecommendationFeedScreen**: Renders the ranked output of the Recommender Engine with interactive feedback buttons.
- **LoginScreen / SignUpScreen**: User authentication.

---

### **4. System Intelligence (Engines)**

#### **A. Pattern Engine (Phase 2 Complete)**
Ingests past data to find behavioral clusters. Uses an Uncertainty Policy gating threshold: **Min 5 meals, Min 3 moods in past 7 days**. 
Supports 4 explicitly programmed patterns:
1. **Mood Dip Then Eat (P1)**: Eating follows a "low" mood.
2. **Late Night Eating Cluster (P2)**: Contiguous late-night eating.
3. **Weekday / Weekend Shift (P3)**: Divergences in routines based on the day of the week.
4. **Meal Type ↔ Mood Association (P4)**: Correlations between specific meal tags (e.g., high sugar) and subsequent moods.
*Output is sorted by Severity then Confidence.*

#### **B. Recommender Engine (Phase 3A Complete)**
Transforms recognized patterns into actionable interventions. Powered by `recommenderEngine.ts`, `scoring.ts`, and `actionLibrary.ts`.
- **Action Library**: Curated list of safe, low-medical-risk actions (`timing_intervention`, `substitution`, `prevention_plan`, `recovery`, `soft_intervention`).
- **Scoring Function**: Candidates are scored dynamically (Max 1.0):
  - **Impact (40%)**: Derived from action intensity.
  - **Feasibility (40%)**: Inverse of friction (low intensity = high feasibility).
  - **Confidence (20%)**: Derived from underlying Pattern Engine confidence.
- **Ranking**: The engine sorts all valid templates and outputs exactly 3 options:
  - 1 **Best Next Action**
  - 2 **Alternative Options**
- **Safe Fallbacks / Trust Policy (`docs/TRUST_POLICY.md`)**: If no patterns meet the strict data thresholds, the engine guarantees an output by serving a "safe" baseline intervention (e.g., "Start with a simple reset - Hydrate") with manually boosted feasibility.

#### **C. Learning & Adaptation Logic (Phase 3B Complete)**
The recommendation system now acts as a closed, interactive loop that adapts to user behavior.
- **Feedback Loop**: Users react to recommendations in the UI using buttons ("Adopted ✅", "Partially Accepted ⚠️", or "Rejected ❌"). This data is persisted locally via `AsyncStorage` (`src/services/feedbackStorage.ts`). Schema is documented in `docs/FEEDBACK_SCHEMA.md`.
- **Adaptation (`docs/LEARNING_LOGIC.md`)**: The engine queries historical rejection rates (`getRejectionRateByType`) before surfacing new candidate actions. If a `recommendationType` (e.g., `substitution`) has been frequently rejected, the scoring engine applies a penalty (up to a 40% reduction in total score), demoting it in the ranking to optimize for higher adoption.

---

### **5. Remaining / Unimplemented Work (Phase 4)**
Comparing the current codebase to the `docs/FinalVersion.md` 90-Day Plan, Phases 1 through 3 are completed. The following pieces are visibly pending:

- **Model Inference**: Auto-labeling tags from photos/text via an external ML service is not active.
- **Pilot Phase (Phase 4 Pending)**: Analytics tracking, friction bottlenecks, and iteration reporting (recruiting beta users to test efficacy) are not yet present. Exporting Pilot Data and analyzing results (`docs/PILOT_RESULTS.md`) remain on the roadmap.
