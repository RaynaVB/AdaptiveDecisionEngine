Here’s a **condensed, agent-ready spec** for the **Health Lab Service**, plus a **curated experiment library mapped to onboarding (Goals + Symptoms + Dietary Restrictions)**.

---

# 🧪 HEALTH LAB SERVICE — IMPLEMENTATION SPEC

## Data Model

### 1) Experiment Templates

Path:

```txt
experiment_templates/{templateId}
```

```ts
{
  templateId: string
  title: string
  category: 'elimination' | 'timing' | 'addition' | 'behavior'
  durationDays: number
  targetSymptoms: string[]
  targetGoals: string[]
  dietaryTags?: string[] // e.g. ['dairy', 'gluten']
  restrictionsExcluded?: string[] // e.g. ['vegan']
  instructions: string[]
  dailyRequirements: {
    meals?: boolean
    symptoms?: boolean
    mood?: boolean
  }
  successCriteria: {
    symptomImprovement?: number // % reduction
    goalImprovement?: number
  }
  difficulty: 'easy' | 'medium' | 'hard'
  tags: string[] // ['caffeine', 'sleep', 'protein']
}
```

---

### 2) User Experiments

Path:

```txt
users/{userId}/experiments/{experimentId}
```

```ts
{
  experimentId: string
  templateId: string
  status: 'active' | 'completed' | 'abandoned'
  startedAt: Timestamp
  endsAt: Timestamp
  linkedInsightIds: string[]
  progress: {
    daysCompleted: number
    adherenceScore: number // 0–1
  }
  baseline: {
    symptomScores?: Record<string, number>
  }
  result?: {
    outcome: 'positive' | 'negative' | 'inconclusive'
    confidenceDelta: number
    summary: string
    completedAt: Timestamp
  }
}
```

---

## Core APIs

### 1. Get recommended experiments

```txt
GET /v1/users/:userId/experiments/recommended
```

Returns:

* top 3–5 experiments ranked

---

### 2. Start experiment

```txt
POST /v1/users/:userId/experiments/start
```

Body:

```ts
{
  templateId: string,
  linkedInsightIds?: string[]
}
```

---

### 3. Get active experiments

```txt
GET /v1/users/:userId/experiments/active
```

---

### 4. Update progress (optional v1)

```txt
POST /v1/users/:userId/experiments/:experimentId/progress
```

---

### 5. Complete experiment

```txt
POST /v1/users/:userId/experiments/:experimentId/complete
```

Triggers:

* result calculation
* insight confidence update

---

# ⚙️ Core Logic

## Experiment Recommendation Ranking

```txt
score =
  0.30 * insightConfidenceGap   // medium confidence = best candidate
+ 0.25 * symptomSeverity
+ 0.20 * goalMatch
+ 0.10 * recency
+ 0.10 * feasibility
+ 0.05 * novelty
```

### Key rules

* Prioritize **medium-confidence insights (0.4–0.75)** → best for testing
* Avoid:

  * already active experiments
  * recently completed ones
  * conflicts with dietary restrictions

---

## Experiment Lifecycle

### Start

* store baseline (last 3–7 days symptoms)
* set duration
* link to insight(s)

### During

* track adherence
* encourage logging via Recommendations service

### Completion

* compare:

  * baseline vs experiment period
* compute:

  * symptom delta
  * outcome
  * confidence update

---

## Result Evaluation (simple v1)

```txt
if symptomImprovement >= 30% → positive
if symptomImprovement <= 10% → negative
else → inconclusive
```

---

## Feedback into Insights

On completion:

```txt
if positive:
  increase insight confidence (+0.1 to +0.3)
if negative:
  decrease confidence (-0.1 to -0.3)
```

---

# 🔗 Integration Points

## With Insights Service

* consume:

  * trigger patterns
  * protective patterns
  * confidence scores

* update:

  * confidence after experiment

---

## With Recommendation Service

Add new recommendation types:

* start experiment
* continue experiment
* complete experiment
* log required data

---

# 🧠 EXPERIMENT LIBRARY (TIED TO ONBOARDING)

Below are **high-value experiments mapped to symptoms/goals**.

---

# 🥛 Digestive Issues (Bloating, Gas, IBS)

## Dairy Elimination (5 days)

* tags: dairy
* symptoms: bloating, gas
* goals: reduce discomfort

## Gluten Elimination (7 days)

* tags: gluten
* symptoms: bloating, fatigue

## Low-FODMAP Lite (5 days)

* remove high-FODMAP foods
* symptoms: IBS, bloating

---

# ⚡ Energy / Fatigue

## High-Protein Breakfast (3–5 days)

* goal: stable energy
* measure: afternoon crashes

## Hydration Boost (3 days)

* +2–3L water daily
* symptoms: fatigue, headaches

## Reduce Sugar Spikes (5 days)

* remove added sugar breakfasts

---

# 😴 Sleep

## Caffeine Cutoff (3–5 days)

* no caffeine after 12–2pm

## Early Dinner (5 days)

* last meal before 7pm

---

# 🧠 Mood / Anxiety

## Regular Meal Timing (3–5 days)

* no skipping meals

## Omega-3 Addition (5–7 days)

* add fish / supplements

---

# 🕒 Timing-Based

## Intermittent Fasting Shift (5 days)

* test 12–14h fasting window

## No Late-Night Eating (5 days)

---

# 🧬 General Sensitivity Discovery

## Elimination + Reintroduction (Advanced)

* remove food → reintroduce → compare

---

# 🎯 Mapping to Onboarding

## From Symptoms

* bloating → dairy/gluten/FODMAP experiments
* fatigue → protein/hydration/sugar
* anxiety → meal timing / caffeine

## From Goals

* energy → protein breakfast, hydration
* sleep → caffeine cutoff, early dinner
* focus → sugar reduction, protein

## From Dietary Restrictions

Filter:

* vegan → remove dairy experiments
* keto → avoid carb-related suggestions
* lactose intolerant → prioritize dairy testing

---

# 🧠 Smart Matching Logic

When recommending experiments:

```txt
for each insight:
  if confidence in (0.4–0.75):
    map to experiment

rank experiments by:
  symptom severity
  goal match
  feasibility
```

---

# 🧩 UX Integration

## In Recommendations feed

* “Start 5-day dairy elimination”
* “Continue Day 2 of hydration test”
* “Complete your experiment today”

## In Health Lab screen

* Recommended experiments
* Active experiments
* Completed experiments (results)

---

# 🚀 MVP Scope (Build First)

1. Experiment templates collection
2. Start experiment
3. Active experiment tracking
4. Basic completion + result scoring
5. Experiment recommendations (simple rules)

---

# 🔥 Final Architecture After This

```txt
Logs → Insights → Recommendations → Health Lab → Insights
```

This is now a **closed learning loop system**.

---

# Final instruction to agent

Implement:

* experiment_templates collection
* user experiments collection
* experiment recommendation endpoint
* experiment lifecycle (start → active → complete)
* result evaluation logic
* integration hooks for:

  * recommendations (start/continue/complete)
  * insights (confidence update)

Keep logic simple, deterministic, and rule-based for v1.
