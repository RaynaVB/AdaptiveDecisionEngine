# Adaptive Decision Engine (Health) — Product Specification
## Current Implementation State (March 2026)

This document details the active features and technical capabilities of the **Adaptive Decision Engine**. It focuses exclusively on the live codebase, covering data ingestion, intelligence engines, and the personalized adaptation loop.

---

### 1. Core Architecture & Infrastructure
The system is built as a modular React Native application (Expo) that separates data collection from behavioral analysis and intervention logic.

- **Frontend**: Expo Router-based navigation with a centralized `Timeline` state.
- **Backend Service Layer**:
  - **Firebase Firestore**: Persistent storage for user profiles, meal logs, and mood events.
  - **Firebase Auth**: Secure user authentication and session management.
  - **Local Storage**: `AsyncStorage` handles recommendation feedback for fast, offline-compatible adaptation.
- **Intelligence Core**: Decoupled `pattern_engine` and `recommender_engine` modules allow for independent iteration on analytical logic.

---

### 2. Multi-Modal Data Ingestion
The application supports rich data capture to build a comprehensive picture of user behavior.

#### A. Interactive Meal Logging
- **Visual Capture**: Integrated camera and image library support.
- **ML-Powered Inference**: Automated image analysis via `visionService.ts` using Gemini 2.0 Flash to suggest descriptions and tags.
- **Structured Tagging**: Supports three-tier tagging (Load: `light`/`regular`/`heavy`, Type: `sweet`/`savory`, Context: `homemade`/`restaurant`/`packaged`).
- **Temporal Slotting**: Automatic assignment of meals to slots (`breakfast`, `lunch`, `dinner`, `snack`) based on time of entry.

#### B. Mood & Stress Tracking
- **Multi-Dimensional Logging**: Captures Valence (Positivity), Energy levels, and Stress intensity.
- **Contextual Linking**: Implicitly associates mood events with the most recent meal event for pattern analysis.
- **Granular Feelings**: Optional tag support for specific emotional states (e.g., `anxious`, `bored`).

---

### 3. Intelligence Engines

#### A. Pattern Engine
The analytical core that detects behavioral clusters using a 7-day sliding window. It employs an **Uncertainty Policy** that gates findings until a minimum data density is reached (5 meals, 3 moods).

**Active Pattern Detectors:**
1. **Mood-Triggered Eating (P1)**: Detects when eating follows a "low" mood or "high" stress event.
2. **Late-Night Clustering (P2)**: Identifies contiguous eating events occurring during late-night hours.
3. **Routine Shifts (P3)**: Highlights divergences in eating/mood behavior between weekdays and weekends.
4. **Meal-Mood Correlations (P4)**: Statistically links specific meal tags (e.g., `high_sugar`) to subsequent energy or mood shifts.

#### B. Personalized Recommender Engine
Transforms detected patterns into ranked, actionable interventions using a **Contextual Bandit Model**.

- **Personalization Layer**: `banditModel.ts` and `contextBuilder.ts` utilize temporal factors and recent behavioral history to predict the most effective intervention.
- **Action Library**: A curated repository of 5 distinct archetypes:
  - `timing_intervention` (e.g., 10-minute buffers)
  - `substitution` (e.g., pairing sweet snacks with protein)
  - `prevention_plan` (e.g., pre-planned bridge snacks)
  - `recovery` (e.g., short movement resets)
  - `soft_intervention` (e.g., 60-second pauses)
- **Scoring & Ranking**: Every candidate is scored across three dimensions: **Impact** (40%), **Feasibility** (40%), and **ML-Reward** (20%). The engine always returns exactly 3 options: 1 "Best Next Action" and 2 "Alternatives."

---

### 4. Adaptation & Feedback Loop
The engine learns from user interaction to refine its future recommendations.

- **Interactive Feedback**: Users can explicitly `Adopt`, `Maybe`, or `Reject` any recommendation.
- **Persisted Outcomes**: Feedback is stored locally as structured events with a queryable schema.
- **Dynamic Penalty Logic**: The engine calculates rejection rates by recommendation type. If a specific type (e.g., `substitution`) is consistently rejected, a penalty (up to 40%) is applied to its score, naturally demoting it in future rankings in favor of more accepted strategies.

---

### 5. Application Scren Inventory
- **Timeline**: Chronological feed of meals and moods over the last 7 days.
- **Recommendation Feed**: The primary interface for viewing and interacting with personalized advice.
- **Log Meal / Log Mood**: Specialized, high-speed entry screens.
- **Weekly Patterns**: Visual summary of recognized behavioral patterns.
- **Feedback History**: A persistent log of previous interventions and their outcomes.
- **Auth Flow**: Login, Sign Up, and Password Recovery screens.
- **Onboarding**: Progressive profile setup for initial personalization.
