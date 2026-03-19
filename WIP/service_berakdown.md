Below is a concrete first-pass service boundary for extracting **Recommendations** out of the React app.

# Recommendation Service

## Goal

Move recommendation intelligence out of the mobile app so you can:

* improve ranking and personalization without app releases
* run experiments and feature flags server-side
* keep the UI focused on rendering and user actions
* create a stable contract the app can consume

This service should answer one core question:

> Given this user’s profile, recent logs, active experiments, and known patterns, what should they do next?

---

# 1. Service Scope

## This service owns

* recommendation candidate generation
* recommendation ranking and prioritization
* best next action selection
* explanation generation
* confidence calculation
* feedback ingestion
* recommendation state for display purposes

## This service does not own yet

* raw meal logging
* raw mood/symptom logging
* experiment state machine
* long-form weekly summaries
* heavy pattern discovery from scratch

Those can stay where they are for now and feed this service.

---

# 2. Why this is the right first extraction

Recommendations are the best first service because they sit at the decision layer:

* **Insights** says what may be true
* **Weekly** says what has been happening
* **Lab** says what is being tested
* **Recommendations** says what to do now

That makes it the cleanest boundary with the highest user impact.

---

# 3. Proposed initial architecture

## Short-term architecture

The Recommendation Service can pull from existing sources or receive pre-computed inputs.

### Inputs

* user profile
* onboarding goals
* symptom priorities
* dietary restrictions
* recent meals
* recent moods
* recent symptoms
* pattern outputs from current React logic or existing backend logic
* active experiments
* feedback history

### Output

* ranked feed of recommendations
* best next action
* transparent explanation payload
* confidence and urgency
* action metadata for UI

---

# 4. High-level responsibilities

## A. Candidate generation

Create recommendation candidates from rules or model logic such as:

* avoid likely trigger today
* increase hydration
* try protein breakfast
* avoid late caffeine
* start dairy elimination experiment
* continue experiment logging
* review weekly pattern

## B. Scoring

Score each candidate using:

* relevance to current goals
* symptom severity / urgency
* confidence of underlying pattern
* recency of supporting data
* novelty / fatigue
* experiment compatibility
* feasibility given dietary restrictions

## C. Feed assembly

Return:

* 1 top recommendation as **best next action**
* 3–10 ranked supporting recommendations
* explanation strings and structured reasons
* action buttons / CTA type

## D. Feedback learning

When user accepts, rejects, or maybe’s a recommendation, store feedback and use it to:

* reduce repetition
* infer preference
* change ranking in future
* learn user tolerance for intervention style

---

# 5. Service contract

## Endpoint 1: Get recommendation feed

### Route

`GET /v1/users/{userId}/recommendations`

### Query params

```txt
limit=10
includeDismissed=false
surface=home
```

### Response

```json
{
  "generatedAt": "2026-03-19T15:10:00Z",
  "userId": "user_123",
  "bestNextAction": {
    "recommendationId": "rec_901",
    "type": "preventive_action",
    "title": "Avoid dairy for the rest of today",
    "summary": "Dairy appears to be a likely trigger for your bloating.",
    "confidence": {
      "level": "high",
      "score": 0.81
    },
    "urgency": "high",
    "whyThis": [
      {
        "kind": "pattern",
        "label": "Dairy → bloating within 3–6 hours"
      },
      {
        "kind": "supporting_signal",
        "label": "2 recent bloating events followed dairy intake"
      }
    ],
    "actions": [
      {
        "type": "log_meal",
        "label": "Log next meal"
      },
      {
        "type": "start_experiment",
        "label": "Start 5-day dairy elimination",
        "experimentTemplateId": "exp_dairy_5d"
      }
    ],
    "validUntil": "2026-03-20T03:59:59Z"
  },
  "recommendations": [
    {
      "recommendationId": "rec_901",
      "type": "preventive_action",
      "priorityScore": 0.93,
      "title": "Avoid dairy for the rest of today",
      "summary": "Dairy appears to be a likely trigger for your bloating.",
      "confidence": {
        "level": "high",
        "score": 0.81
      },
      "urgency": "high",
      "category": "symptom_prevention",
      "whyThis": [
        {
          "kind": "pattern",
          "label": "Dairy → bloating within 3–6 hours"
        }
      ],
      "status": "active",
      "cta": {
        "type": "start_experiment",
        "label": "Start elimination test",
        "payload": {
          "experimentTemplateId": "exp_dairy_5d"
        }
      }
    },
    {
      "recommendationId": "rec_902",
      "type": "optimization_action",
      "priorityScore": 0.74,
      "title": "Aim for a protein-forward breakfast tomorrow",
      "summary": "Your energy is more stable on mornings with higher protein.",
      "confidence": {
        "level": "medium",
        "score": 0.62
      },
      "urgency": "medium",
      "category": "energy_support",
      "whyThis": [
        {
          "kind": "pattern",
          "label": "Protein breakfast → fewer afternoon crashes"
        }
      ],
      "status": "active",
      "cta": {
        "type": "log_plan",
        "label": "Plan breakfast"
      }
    }
  ],
  "meta": {
    "version": "1.0",
    "sourceWindowDays": 14,
    "explanationsEnabled": true
  }
}
```

---

## Endpoint 2: Submit recommendation feedback

### Route

`POST /v1/users/{userId}/recommendations/{recommendationId}/feedback`

### Request

```json
{
  "feedback": "accepted",
  "reasonCode": "feels_relevant",
  "freeText": "This matches what I already suspected.",
  "context": {
    "surface": "recommendations_feed",
    "position": 1
  }
}
```

### Allowed feedback values

* `accepted`
* `rejected`
* `maybe`
* `dismissed`
* `completed`

### Response

```json
{
  "ok": true,
  "recommendationId": "rec_901",
  "feedbackRecordedAt": "2026-03-19T15:12:00Z"
}
```

---

## Endpoint 3: Recompute recommendations

### Route

`POST /v1/users/{userId}/recommendations/recompute`

### Request

```json
{
  "trigger": "symptom_logged",
  "sourceEventId": "sym_345",
  "surface": "background_refresh"
}
```

### Valid trigger values

* `meal_logged`
* `symptom_logged`
* `mood_logged`
* `experiment_started`
* `experiment_completed`
* `profile_updated`
* `manual_refresh`

### Response

```json
{
  "ok": true,
  "jobType": "inline",
  "generatedAt": "2026-03-19T15:15:00Z",
  "changed": true
}
```

For the first version, this can be synchronous. Later it can become async behind the same API shape.

---

# 6. Internal domain model

## Recommendation entity

```json
{
  "recommendationId": "rec_901",
  "userId": "user_123",
  "type": "preventive_action",
  "category": "symptom_prevention",
  "title": "Avoid dairy for the rest of today",
  "summary": "Dairy appears to be a likely trigger for your bloating.",
  "priorityScore": 0.93,
  "confidenceScore": 0.81,
  "confidenceLevel": "high",
  "urgency": "high",
  "status": "active",
  "whyThis": [
    {
      "kind": "pattern",
      "refId": "pat_111",
      "label": "Dairy → bloating within 3–6 hours"
    }
  ],
  "cta": {
    "type": "start_experiment",
    "label": "Start elimination test",
    "payload": {
      "experimentTemplateId": "exp_dairy_5d"
    }
  },
  "supportingSignals": {
    "goalMatchScore": 0.9,
    "symptomSeverityScore": 0.8,
    "patternConfidenceScore": 0.81,
    "noveltyScore": 0.6,
    "feasibilityScore": 1.0
  },
  "createdAt": "2026-03-19T15:10:00Z",
  "validUntil": "2026-03-20T03:59:59Z"
}
```

## Recommendation feedback entity

```json
{
  "feedbackId": "rf_222",
  "userId": "user_123",
  "recommendationId": "rec_901",
  "feedback": "accepted",
  "reasonCode": "feels_relevant",
  "freeText": "This matches what I already suspected.",
  "surface": "recommendations_feed",
  "position": 1,
  "createdAt": "2026-03-19T15:12:00Z"
}
```

---

# 7. Inputs the service needs

You do not need all of these to be separate services yet. They can be fetched from Firestore or whatever source you already use.

## Required now

* user profile
* goals
* symptom targets
* dietary restrictions
* recent meal logs
* recent symptom logs
* recent mood logs
* active experiments
* recent recommendation feedback

## Helpful but optional

* pre-computed pattern candidates
* user sensitivity profile
* adherence score
* sleep/hydration context if available

---

# 8. Candidate recommendation types

Start with a small fixed taxonomy.

## Preventive actions

Actions that reduce risk of likely bad outcomes.

* avoid likely trigger
* delay caffeine
* hydrate now
* do not skip next meal

## Optimization actions

Actions that improve a goal.

* choose protein breakfast
* increase fiber today
* eat earlier dinner
* repeat successful meal pattern

## Experiment actions

Used when confidence is promising but not yet strong.

* run 3-day caffeine cutoff
* start 5-day dairy elimination
* test lower sugar breakfast

## Experiment support

For active lab flows.

* remember day 2 check-in
* log symptoms after lunch
* complete experiment review tonight

## Reflection actions

Lower priority, useful when urgent interventions are weak.

* review your weekly trend
* compare good-energy days vs low-energy days

---

# 9. Ranking model

Start simple and explicit.

## Priority score

```txt
priorityScore =
  0.25 * goalMatch
+ 0.20 * symptomUrgency
+ 0.20 * patternConfidence
+ 0.10 * recency
+ 0.10 * novelty
+ 0.10 * feasibility
+ 0.05 * feedbackAffinity
- repetitionPenalty
```

## Factor definitions

### goalMatch

How strongly recommendation aligns with primary onboarding goals.

Examples:

* improve energy → protein breakfast gets high score
* reduce bloating → dairy elimination gets high score

### symptomUrgency

Higher if:

* recent symptoms are severe
* symptoms are recurring
* current recommendation may prevent a near-term issue

### patternConfidence

Derived from:

* amount of supporting evidence
* strength of association
* consistency across repeated logs

### recency

More weight if the underlying pattern appeared recently.

### novelty

Avoid showing same class of recommendation too often.

### feasibility

Penalty if recommendation conflicts with dietary restrictions, experiment load, or user context.

### feedbackAffinity

Boost recommendations similar to prior accepted ones, reduce those similar to prior rejected ones.

### repetitionPenalty

Apply if:

* same recommendation shown repeatedly
* user ignored or rejected similar items recently

---

# 10. Explanation model

Your explanations should be structured, not just plain text.

## Why this matters

If explanations are structured:

* the UI can render them flexibly
* you can improve wording later
* you can track which explanation styles drive action

## Structure

```json
[
  {
    "kind": "pattern",
    "label": "Dairy → bloating within 3–6 hours"
  },
  {
    "kind": "goal_match",
    "label": "Supports your goal: reduce digestive discomfort"
  },
  {
    "kind": "experiment_opportunity",
    "label": "A short elimination test could confirm this pattern"
  }
]
```

The app can convert these into:

* Why this?
* Confidence
* What to do next

---

# 11. What stays in the React app

Keep the app thin.

## UI app keeps

* rendering cards and feed
* local loading/error states
* navigation
* invoking CTA actions
* optimistic feedback submission if desired
* lightweight caching of last feed

## Move out of app

* ranking formulas
* confidence scoring
* explanation assembly
* repetition suppression
* personalization logic
* recommendation taxonomy rules

That separation is the real win.

---

# 12. Storage strategy

## First version

Store recommendations and feedback in your backend datastore, likely Firestore if that is already your system.

Suggested collections:

```txt
users/{userId}/recommendation_feedback/{feedbackId}
users/{userId}/recommendation_snapshots/{snapshotId}
```

Optional:

```txt
users/{userId}/active_recommendations/{recommendationId}
```

## Better medium-term pattern

A dedicated service DB or recommendation store is fine later, but not required now.

The biggest win is moving decision logic server-side, not changing databases on day one.

---

# 13. Suggested Firestore shapes

## Snapshot document

```json
{
  "snapshotId": "snap_555",
  "generatedAt": "2026-03-19T15:10:00Z",
  "bestNextActionId": "rec_901",
  "recommendationIds": ["rec_901", "rec_902", "rec_903"],
  "meta": {
    "engineVersion": "rec-engine-v1",
    "sourceWindowDays": 14
  }
}
```

## Active recommendation document

```json
{
  "recommendationId": "rec_901",
  "type": "preventive_action",
  "title": "Avoid dairy for the rest of today",
  "priorityScore": 0.93,
  "confidenceScore": 0.81,
  "status": "active",
  "validUntil": "2026-03-20T03:59:59Z"
}
```

---

# 14. Migration plan

## Phase 0: Inventory

Audit the current React app and identify:

* current recommendation generation functions
* data dependencies
* ranking rules
* explanation text generation
* feedback handling

Deliverable:

* list of all modules/functions currently involved

---

## Phase 1: Extract pure engine code

Move the current recommendation engine into a shared backend-friendly module without changing behavior.

Goal:

* same results
* different runtime location

Deliverables:

* `recommendation-engine-core`
* unit tests based on current app outputs
* golden test fixtures for 10–20 representative users

This is the most important step because it reduces migration risk.

---

## Phase 2: Wrap with service API

Expose the engine via backend endpoints:

* get feed
* submit feedback
* recompute

Keep the mobile app still able to fall back to local logic during rollout.

Deliverables:

* service endpoints
* auth
* input validation
* response schemas
* telemetry

---

## Phase 3: Dual-run and compare

For a period, run:

* old in-app recommendation logic
* new backend recommendation logic

Compare:

* top recommendation match rate
* ranking differences
* latency
* confidence output consistency

Deliverables:

* comparison logs
* mismatch dashboard
* cutover checklist

---

## Phase 4: Switch app to service-first

The app now:

* fetches recommendation feed from service
* submits feedback to service
* triggers recompute when user logs key events

Keep a fallback path only temporarily.

Deliverables:

* feature flag
* rollout cohorts
* monitoring

---

## Phase 5: Improve engine independently

Once backend is source of truth:

* add feature flags
* tune scoring weights
* improve novelty suppression
* test new recommendation classes
* start model-based ranking later if desired

---

# 15. Rollout strategy

## Recommended rollout

* internal users first
* 5% beta cohort
* 25%
* 50%
* 100%

Track:

* feed load success rate
* recommendation acceptance rate
* repeat recommendation frequency
* latency
* user session engagement after recommendation exposure
* experiment starts from recommendation CTA

---

# 16. Key telemetry to add

## Request-level

* feed generated
* generation latency
* number of candidates
* number of recommendations returned
* engine version

## Recommendation-level

* recommendation shown
* recommendation opened
* recommendation accepted/rejected/maybe
* CTA clicked
* experiment started
* recommendation completed

## Quality-level

* top recommendation acceptance rate
* 3-day downstream symptom outcome after acceptance
* repeat exposure fatigue rate
* conflict rate with dietary restrictions or active experiments

---

# 17. Guardrails

Your service should explicitly avoid bad recommendations.

## Do not recommend

* foods conflicting with dietary restrictions
* experiments already active
* redundant recommendations shown too often
* recommendations based on too little evidence unless clearly labeled exploratory

## Confidence thresholds

Example:

* `high` ≥ 0.75
* `medium` 0.5–0.74
* `low` < 0.5

Low-confidence items should generally be framed as:

* “possible pattern”
* “worth testing”
  not “strong recommendation”

---

# 18. Versioning strategy

Add an engine version to every generated feed.

Example:

```json
"meta": {
  "engineVersion": "recommendation-engine-v1.2.0"
}
```

This will save you later when:

* debugging behavior changes
* A/B testing
* tracing regressions
* comparing cohorts

---

# 19. Minimal MVP boundary

If you want the smallest useful extraction, build only this:

## Backend does

* fetch user inputs
* generate top 5 recommendations
* return best next action
* store feedback

## App does

* render
* submit feedback
* refresh after meal/symptom logs

That alone gets you most of the benefit.

---

# 20. Recommended implementation order this week

## Day 1

Inventory current recommendation code and data inputs.

## Day 2

Extract pure engine module and lock behavior with tests.

## Day 3

Add `GET /recommendations` endpoint.

## Day 4

Add feedback endpoint and persistence.

## Day 5

Add recompute endpoint and wire app behind a feature flag.

## Day 6

Dual-run comparison and fix mismatches.

## Day 7

Enable for internal users.

---

# 21. Suggested package/module structure

```txt
services/
  recommendation-service/
    src/
      api/
        routes.ts
        handlers.ts
      domain/
        recommendationTypes.ts
        scoring.ts
        candidateGeneration.ts
        explanationBuilder.ts
        feedbackAdaptation.ts
      data/
        userProfileRepo.ts
        logsRepo.ts
        feedbackRepo.ts
        recommendationRepo.ts
      orchestration/
        generateRecommendations.ts
      validation/
        schemas.ts
      telemetry/
        events.ts
```

---

# 22. What comes next after this service

Once Recommendation Service is stable, the next best extraction is **Insights Service**.

Why:

* it becomes the provider of pattern candidates
* Recommendations becomes a ranking/orchestration layer instead of doing both discovery and decisioning
* you get cleaner long-term boundaries

Final target shape:

* **Insights Service** = detects what is likely true
* **Recommendation Service** = decides what to do about it
* **Lab Service** = tests uncertain hypotheses
* **Weekly Service** = summarizes trends and progress

---

# 23. Concrete handoff summary

## First service to extract

**Recommendation Service**

## First version responsibilities

* rank and return best next actions
* return recommendation feed
* accept feedback
* recompute on key events

## Mobile app after extraction

* thinner client
* fewer app releases for logic changes
* better experimentation velocity

## Migration philosophy

* preserve behavior first
* improve behavior second

That order matters.
