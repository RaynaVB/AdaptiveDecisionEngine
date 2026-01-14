# Architecture
## Adaptive Decision Engine (Health) — V2

This document defines the end-to-end architecture for V2. The system is intentionally modular so the “decision intelligence” core (patterns + recommendations + learning loop) can evolve independently of the UI.

---

## 1) Goals
- **Low-friction capture** of meals (photo/text + coarse tags) and mood (tap-based).
- **Pattern detection** over time-stamped events (meal+mood).
- **Decision engine** that outputs **1 best next action + up to 2 alternatives**, with “why this, why now”.
- **Trust via uncertainty handling** (confidence scores + graceful fallback).
- **Learning loop** from accept/reject outcomes to adapt future recommendations.
- **Reproducibility**: store run metadata (versions, parameters) so results can be replayed.

---

## 2) Major Modules

### 2.1 Logging UI (Client)
**Responsibilities**
- Meal logging: photo OR short text + meal slot + meal type tags.
- Mood logging: valence/energy/stress (+ optional tag).
- Timeline/history view (for transparency).
- Recommendation display + feedback capture.

**Inputs/Outputs**
- Writes: `meal_events`, `mood_events`, `recommendation_feedback`
- Reads: recent `meal_events`, `mood_events`, `patterns`, `recommendations`

---

### 2.2 Inference / Labeling Layer (Hybrid)
V2 treats inference as **assistive**, not authoritative.

**Responsibilities**
- Convert photo/text into *suggested* meal type tags.
- Produce **confidence** (or “unknown”) for inferred tags.
- Optionally ask 1 clarification question when confidence is low.

**Interfaces**
- Client can do lightweight rules (e.g., user-selected tags).
- Server can host model-backed inference (optional for V2).
- Always preserve user overrides as the source of truth.

**Writes**
- `meal_events.inferred_tags`, `meal_events.inference_confidence` (optional)

---

### 2.3 Pattern Engine (Server)
Consumes events and produces patterns with confidence gating.

**Responsibilities**
- Compute patterns from the event window (e.g., last 7/14/30 days):
  - mood dip → eat within N minutes
  - late-night eating cluster
  - weekday vs weekend shift
  - meal type ↔ mood association
- Apply minimum sample-size thresholds.
- Output patterns as structured JSON + readable text.

**Writes**
- `pattern_runs` (metadata: version, params, window)
- `patterns` (materialized results)

---

### 2.4 Recommendation Engine (Server)
Transforms patterns into ranked, explainable actions.

**Responsibilities**
- Generate candidate interventions from patterns.
- Score each candidate by:
  - expected impact
  - feasibility (friction)
  - confidence (data quality)
  - recent acceptance/rejection history
- Output **ranked recommendations**:
  - rank 1 = best next action
  - rank 2–3 = alternatives
- Provide “why this, why now” linked to pattern evidence.

**Writes**
- `recommendation_runs` (metadata: version, params, window)
- `recommendations` (ranked outputs)

---

### 2.5 Feedback Loop / Learning Logic (Server)
Turns outcomes into adaptation signals.

**Responsibilities**
- Store outcomes: accepted / partial / rejected (+ optional reason).
- Update user-level signals:
  - “feasibility preference” proxy (based on repeated rejection)
  - “avoid list” for action types repeatedly rejected
  - time-of-day preferences (if needed)
- Adjust future ranking weights (simple rules in V2 are OK).

**Writes**
- `recommendation_feedback`
- Optional: user preference state (in `users.preference_weights` or a separate table)

---

## 3) Client vs Server Responsibilities

### Client (Mobile App)
**Must**
- Capture input fast and reliably.
- Display outputs clearly and honestly (including uncertainty).
- Collect feedback with minimal friction.

**May**
- Perform basic tag suggestions (non-ML heuristics).
- Cache recent data for speed/offline.

### Server (API / Functions)
**Must**
- Run pattern computation and recommendation generation.
- Enforce confidence gating and safe fallbacks.
- Store run metadata for reproducibility.

**May**
- Host ML inference (optional in V2).
- Provide scheduled jobs (nightly/weekly runs).

---

## 4) Data Flow (End-to-End)

1. **User logs meal**
   - Photo/text + slot + tags saved to `meal_events`
   - Optional inference suggests additional tags with confidence

2. **User logs mood**
   - Tap-based mood saved to `mood_events`

3. **Pattern run executes (scheduled or manual)**
   - Creates `pattern_runs` + `patterns` (with confidence gating)

4. **Recommendation run executes**
   - Reads latest patterns + history + prior feedback
   - Creates `recommendation_runs` + ranked `recommendations`

5. **User provides outcome feedback**
   - Saves to `recommendation_feedback`
   - Future runs adapt ranking/selection logic

---

## 5) APIs (Conceptual)
These can be REST endpoints, edge functions, or callable functions.

### Logging
- `POST /meal-events`
- `POST /mood-events`
- `GET /timeline?start=...&end=...`

### Patterns
- `POST /pattern-runs` (optional manual trigger)
- `GET /patterns?window=7d`

### Recommendations
- `POST /recommendation-runs` (optional manual trigger)
- `GET /recommendations?date=today`

### Feedback
- `POST /recommendation-feedback`

---

## 6) Versioning & Reproducibility
Every run stores:
- `algorithm_version` (e.g., `pattern_v1.0`, `reco_v1.1`)
- `parameters` (thresholds, weights)
- time window and event counts

This enables:
- comparing iterations
- explaining changes (critical for M&T narrative)
- debugging regressions

---

## 7) Security / Privacy (V2 baseline)
- Minimal user data stored.
- Photos stored in private buckets; avoid public URLs.
- No medical claims; recommendations are lifestyle suggestions.
- Clear user control to delete logs (optional for later).

---

## 8) Future Extensions (Out of Scope for V2)
- HRV/Apple Health/Oura integration (physio proxy signals)
- More robust personalization (learned models)
- Multi-language support
- Advanced analytics dashboards (deliberately excluded)

---
