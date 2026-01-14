# Data Model (Schema)
## Adaptive Decision Engine (Health) — V2

This document defines the core data entities for V2. The schema is designed to:
- minimize logging friction
- support reliable pattern detection under sparse/noisy data
- enable a recommendation + feedback loop (learning signal)
- support uncertainty handling and reproducible evaluation

> Note: Field types are conceptual. Implementation can be Postgres (Supabase), Firestore, or similar.

---

## 1) Design Principles
1. **Event-based logging:** Meals and moods are time-stamped events.
2. **Coarse labels > precise nutrition:** Meal *type* tags are sufficient for V2 patterns.
3. **Uncertainty is first-class:** Inference outputs include confidence.
4. **Learning loop is explicit:** Recommendation outcomes are stored as structured feedback.
5. **Reproducibility:** Pattern and recommendation runs can be replayed from raw events.

---

## 2) Entity Overview
Core entities:
- `users`
- `meal_events`
- `mood_events`
- `pattern_runs`
- `patterns`
- `recommendation_runs`
- `recommendations`
- `recommendation_feedback`

Optional/phase-2 entities:
- `physio_events` (e.g., HRV proxies)
- `user_preferences`

---

## 3) Tables (Schema)

### 3.1 `users`
Stores minimal user profile + preferences used by the decision engine.

| Field | Type | Required | Notes |
|------|------|----------|------|
| id | UUID/string | ✅ | Primary key |
| created_at | timestamp | ✅ | |
| timezone | string | ✅ | e.g., `America/New_York` |
| display_name | string | ❌ | optional |
| age_range | enum | ❌ | optional, coarse |
| dietary_constraints | json/array | ❌ | e.g., vegetarian, allergies |
| goal_focus | enum | ❌ | e.g., energy, mood stability, weight mgmt (non-medical) |
| preference_weights | json | ❌ | tradeoff weights (impact vs feasibility vs cost) |

---

### 3.2 `meal_events`
A meal log entry (photo or short text), with meal slot + coarse meal type tags.

| Field | Type | Required | Notes |
|------|------|----------|------|
| id | UUID/string | ✅ | Primary key |
| user_id | UUID/string | ✅ | FK to users |
| created_at | timestamp | ✅ | when logged |
| occurred_at | timestamp | ✅ | when eaten (default = created_at) |
| meal_slot | enum | ✅ | `breakfast/lunch/dinner/snack` |
| input_mode | enum | ✅ | `photo/text` |
| photo_uri | string | ❌ | storage URL if photo |
| text_description | string | ❌ | short description |
| portion_size | enum | ❌ | `small/medium/large` |
| meal_type_tags | json/array | ✅ | list of coarse tags (see MEAL_TAXONOMY) |
| inferred_tags | json/array | ❌ | model-inferred tags (if any) |
| inference_confidence | float | ❌ | 0.0–1.0 or categorical |
| location_context | enum | ❌ | `home/work/school/restaurant/other` |
| notes | string | ❌ | optional free text |

**Constraints**
- Require at least one of: `photo_uri` or `text_description`.
- Require at least one `meal_type_tag` OR allow `unknown` tag when confidence is low.

---

### 3.3 `mood_events`
A fast mood check-in associated with time (and optionally linked to a meal).

| Field | Type | Required | Notes |
|------|------|----------|------|
| id | UUID/string | ✅ | Primary key |
| user_id | UUID/string | ✅ | FK to users |
| created_at | timestamp | ✅ | |
| occurred_at | timestamp | ✅ | when mood was felt (default = created_at) |
| valence | enum | ✅ | `positive/neutral/negative` |
| energy | enum | ✅ | `high/ok/low` |
| stress | enum | ✅ | `low/medium/high` |
| tag | enum | ❌ | optional single tag (anxious/bored/sad/angry/lonely/celebratory) |
| confidence_self_report | enum | ❌ | `sure/unsure` (optional) |
| linked_meal_event_id | UUID/string | ❌ | optionally link to meal event |
| notes | string | ❌ | optional text |

---

### 3.4 `pattern_runs`
A record of a pattern computation run for reproducibility.

| Field | Type | Required | Notes |
|------|------|----------|------|
| id | UUID/string | ✅ | Primary key |
| user_id | UUID/string | ✅ | |
| created_at | timestamp | ✅ | |
| window_start | timestamp | ✅ | |
| window_end | timestamp | ✅ | |
| algorithm_version | string | ✅ | e.g., `pattern_v1.2` |
| parameters | json | ✅ | thresholds, min sample sizes |
| data_counts | json | ❌ | counts of meal/mood events used |

---

### 3.5 `patterns`
Materialized patterns from a `pattern_run`.

| Field | Type | Required | Notes |
|------|------|----------|------|
| id | UUID/string | ✅ | Primary key |
| pattern_run_id | UUID/string | ✅ | FK |
| user_id | UUID/string | ✅ | |
| pattern_type | enum | ✅ | see below |
| title | string | ✅ | human-readable |
| description | string | ✅ | human-readable |
| confidence | enum/float | ✅ | `low/med/high` or 0–1 |
| severity | enum/float | ❌ | optional |
| evidence | json | ✅ | supporting stats, sample sizes |
| created_at | timestamp | ✅ | |

**Pattern Types (V2 minimum set)**
- `mood_dip_then_eat` (mood negative/high stress → meal/snack within N minutes)
- `late_night_eating_cluster` (meal after cutoff time occurs frequently)
- `weekday_weekend_shift` (pattern differs across day types)
- `meal_type_mood_association` (certain meal types correlate with mood change)

---

### 3.6 `recommendation_runs`
Record of a recommendation generation run.

| Field | Type | Required | Notes |
|------|------|----------|------|
| id | UUID/string | ✅ | Primary key |
| user_id | UUID/string | ✅ | |
| created_at | timestamp | ✅ | |
| window_start | timestamp | ✅ | data window used |
| window_end | timestamp | ✅ | |
| algorithm_version | string | ✅ | e.g., `reco_v1.0` |
| parameters | json | ✅ | scoring weights |
| input_pattern_run_id | UUID/string | ❌ | link to patterns used |

---

### 3.7 `recommendations`
Recommendations produced for a user at a point in time.

| Field | Type | Required | Notes |
|------|------|----------|------|
| id | UUID/string | ✅ | Primary key |
| recommendation_run_id | UUID/string | ✅ | FK |
| user_id | UUID/string | ✅ | |
| created_at | timestamp | ✅ | |
| priority_rank | int | ✅ | 1 = best next action |
| recommendation_type | enum | ✅ | see below |
| title | string | ✅ | short |
| action | string | ✅ | what to do |
| why_this | string | ✅ | explanation referencing patterns |
| expected_impact | enum/float | ✅ | coarse |
| feasibility | enum/float | ✅ | coarse |
| confidence | enum/float | ✅ | system confidence |
| linked_pattern_ids | json/array | ✅ | patterns this is based on |
| target_time_window | json | ❌ | e.g., “today 3–5pm” |
| metadata | json | ❌ | extra info (meal types etc.) |

**Recommendation Types (V2 minimum set)**
- `timing_intervention`
- `substitution`
- `prevention_plan`
- `recovery_action`
- `soft_nudge` (low-friction option for low mood/high stress)

---

### 3.8 `recommendation_feedback`
Outcome and learning signal for recommendations.

| Field | Type | Required | Notes |
|------|------|----------|------|
| id | UUID/string | ✅ | Primary key |
| recommendation_id | UUID/string | ✅ | FK |
| user_id | UUID/string | ✅ | |
| created_at | timestamp | ✅ | |
| outcome | enum | ✅ | `accepted/partial/rejected` |
| reason_tag | enum | ❌ | `too_hard/not_relevant/no_time/disagree/other` |
| notes | string | ❌ | optional text |
| follow_up_meal_event_id | UUID/string | ❌ | optional link if action affected meal |
| follow_up_mood_event_id | UUID/string | ❌ | optional link if mood changed |

---

## 4) Optional (Phase 2) Tables

### 4.1 `physio_events` (HRV proxy, etc.)
| Field | Type | Required | Notes |
|------|------|----------|------|
| id | UUID/string | ✅ | |
| user_id | UUID/string | ✅ | |
| occurred_at | timestamp | ✅ | |
| source | enum | ✅ | `oura/apple_health/fitbit/manual` |
| metric_type | enum | ✅ | `hrv/resting_hr/sleep_score` |
| value | float | ✅ | |
| confidence | enum/float | ❌ | |
| metadata | json | ❌ | |

### 4.2 `user_preferences`
| Field | Type | Required | Notes |
|------|------|----------|------|
| user_id | UUID/string | ✅ | |
| aggressiveness | enum | ✅ | `soft/balanced/aggressive` |
| cost_sensitivity | enum | ❌ | |
| dietary_rules | json | ❌ | |
| quiet_hours | json | ❌ | when not to send recommendations |

---

## 5) Example Event Flow (Happy Path)
1. User logs meal (photo) + selects tags + timestamp stored in `meal_events`
2. User logs mood (tap-based) stored in `mood_events`
3. A scheduled or manual computation creates a `pattern_run` and populates `patterns`
4. Recommendation generation creates a `recommendation_run` and 1–3 `recommendations`
5. User marks outcome → stored in `recommendation_feedback`
6. Next recommendation run uses feedback to adjust feasibility/intensity scoring

---
