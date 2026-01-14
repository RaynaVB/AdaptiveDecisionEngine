# Product Requirements Document (PRD)
## Adaptive Decision Engine (Health) — V2

**Owner:** Rayna  
**Duration:** 90-day build  
**Primary goal:** Build an AI-driven decision engine that converts meal+mood logs into prioritized recommendations that improve lifestyle outcomes through feasible interventions.

---

## 1. Background / Problem
Most food logging apps emphasize nutritional dashboards (calories/macros), but this does not reliably change user behavior. Users often:
- log inconsistently
- feel overwhelmed by data
- fail to translate insights into action
- ignore generic recommendations

This project reframes health logging into decision support:
> The system should identify high-impact behavioral patterns and recommend the best next action a user can realistically follow.

---

## 2. Project Goals (What success looks like)
### Primary Success Metrics
- **Logging friction:** user can log a meal+mood in under 30 seconds
- **Pattern quality:** system identifies repeatable patterns only when statistically meaningful
- **Recommendation utility:** recommendations feel personal, actionable, and relevant
- **Follow-through:** measurable % of accepted/partially accepted recommendations
- **Iteration evidence:** documented changes from pilot outcomes

### Secondary Success Metrics
- improved user awareness of triggers (mood-linked eating)
- reduced decision fatigue (“what should I do?”)

---

## 3. Users
### Primary User Profile
- wants lifestyle improvement but struggles with consistency
- tends to snack or eat impulsively during stress or low mood
- benefits from low-friction, “one best action” suggestions

---

## 4. Functional Requirements
### A.. Logging (Inputs)
**FR-1: Meal logging**
- User can log a meal via:
  - photo OR short text description
- Timestamp captured automatically
- Meal slot captured: Breakfast / Lunch / Dinner / Snack

**FR-2: Meal classification**
- Assign coarse meal type tags (not exact nutrition):
  - Light / Regular / Heavy
  - Sweet / Savory
  - Fried/Greasy / High-sugar (coarse)
  - Homemade / Restaurant / Packaged (optional)
- Portion estimate: Small / Medium / Large (optional)

**FR-3: Mood logging**
- Mood selected from predefined categories (fast tap-based)
- Minimal structure:
  - valence (positive/neutral/negative)
  - energy (high/ok/low)
  - stress (low/med/high)
  - optional tag: anxious/bored/sad/angry/lonely/celebratory

---

### B.. Pattern Engine
**FR-4: Pattern detection**
System detects patterns including:
- mood dip → eating within a time window (e.g. 60 minutes)
- late-night eating clusters
- weekday vs weekend differences
- meal type ↔ mood correlation shifts

**FR-5: Pattern confidence**
- Patterns include confidence levels
- Patterns are suppressed unless minimum sample size is met

---

### C. Recommendation Engine (Core)
**FR-6: Ranked recommendations**
For each cycle (day/meal slot):
- generate candidate interventions
- output:
  - 1 best next action
  - up to 2 alternatives

**FR-7: Explainability**
Every recommendation includes:
- “why this, why now”
- link to detected pattern(s)
- feasibility framing (low friction)

**FR-8: Recommendation types**
At minimum:
- timing intervention
- substitution recommendation
- preventive plan for high-risk day/moment
- recovery recommendation (low mood / crash)

---

### D.. Feedback Loop
**FR-9: Outcome capture**
For each recommendation, user can respond:
- Accepted ✅
- Partially Accepted ⚠️
- Rejected ❌

**FR-10: Adaptation**
System adapts recommendations based on outcomes:
- reduce intensity after repeated rejection
- shift to feasibility-first actions
- avoid repeating rejected action types too soon

---

### E.. Trust and Uncertainty
**FR-11: Meal confidence**
Meal type inference includes confidence:
- if low, ask clarification OR mark unknown

**FR-12: Safe fallback**
If confidence is too low:
- recommend low-risk action OR request more data
- never present speculative conclusions as certain

---

## 5. Non-Functional Requirements
- Fast logging experience
- Modular architecture: logging, patterns, recommendations independent
- Reproducible evaluation: ability to replay dataset through engines
- Clean documentation: PRD, scope, system diagram, pilot results

---

## 6. Out of Scope
(See `docs/SCOPE.md`)

---

## 7. Risks / Challenges
- sparse data / cold start (early users)
- mood is subjective and inconsistent
- false correlation risk (must emphasize uncertainty)
- balancing “helpful” vs “intrusive”
- overbuilding dashboards instead of decision logic

---

## 8. Validation Plan
- internal seeded dataset for initial iteration
- pilot with 3–10 users for 7 days
- track:
  - logging consistency
  - rejection/acceptance rate by recommendation type
  - user feedback: usefulness + friction
- publish iteration report documenting changes

---

## 9. Deliverables
- working app prototype
- pattern engine module
- recommendation engine module
- pilot protocol + results
- iteration report
- demo video (2–3 min)
