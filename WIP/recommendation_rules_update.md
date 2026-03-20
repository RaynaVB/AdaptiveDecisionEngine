Implement recommendation storage as a **two-level model**:

## Data model

### 1) Recommendation Generation

Path:

```txt
users/{userId}/recommendation_generations/{generationId}
```

Fields:

```ts
{
  userId: string
  generatedAt: Timestamp
  trigger: 'meal_logged' | 'mood_logged' | 'symptom_logged' | 'feedback_submitted' | 'experiment_started' | 'experiment_completed' | 'manual_refresh'
  sourceEventId?: string
  engineVersion: string
  status: 'completed' | 'failed'
  recommendationCount: number
  topRecommendationId?: string
  inputSummary: {
    lastMealAt?: Timestamp
    lastMoodAt?: Timestamp
    lastSymptomAt?: Timestamp
    lastExperimentUpdateAt?: Timestamp
    lastFeedbackAt?: Timestamp
  }
}
```

### 2) Recommendations under a generation

Path:

```txt
users/{userId}/recommendation_generations/{generationId}/recommendations/{recommendationId}
```

Fields:

```ts
{
  userId: string
  generationId: string
  type: string
  category: string
  title: string
  summary: string
  priorityScore: number
  confidenceScore: number
  confidenceLevel: 'low' | 'medium' | 'high'
  rank: number
  whyThis: Array<{
    kind: string
    label: string
  }>
  cta?: {
    type: string
    label: string
    payload?: Record<string, any>
  }
  action: {
    state: 'none' | 'accepted' | 'rejected' | 'maybe' | 'dismissed' | 'completed'
    actedAt?: Timestamp
    reasonCode?: string
    freeText?: string
  }
  createdAt: Timestamp
}
```

## Core behavior

### Generation flow

Whenever recommendations are recomputed:

1. Create a **new generation document**
2. Generate recommendation items
3. Store them in the generation’s `recommendations` subcollection
4. Set `recommendationCount`
5. Set `topRecommendationId`
6. Mark generation `status = completed`

Do not overwrite old generations. Every recompute creates a new generation.

## Freshness / validity

Do **not** store `activeUntil` on documents.

The service decides whether the latest generation is still valid using:

* `generatedAt`
* configurable TTL in service logic, such as 6h or 12h
* whether newer source data exists after the generation:

  * meal
  * mood
  * symptom
  * experiment updates
  * recommendation feedback

Validity rule:

```ts
generation is valid if:
- now - generatedAt < configured TTL
- and no newer important source data exists
```

This allows changing the active window later without data migration.

## Read path

When app opens Recommendations screen:

1. Fetch latest generation for the user ordered by `generatedAt desc limit 1`
2. Service checks if generation is still valid
3. If valid:

   * fetch recommendations from that generation
   * order by `rank asc` or `priorityScore desc`
   * return top 5
4. If invalid:

   * generate a new generation
   * save recommendations
   * return the new top 5

## Write path for feedback

When user acts on a recommendation:

* update that recommendation doc’s `action` object
* do not create a separate feedback collection for now

Example action update:

```ts
action: {
  state: 'accepted',
  actedAt: now,
  reasonCode: 'feels_relevant',
  freeText: 'optional'
}
```

## Recompute triggers

Recompute recommendations on:

* meal logged
* mood logged
* symptom logged
* experiment started
* experiment completed
* recommendation feedback submitted
* onboarding goals changed
* dietary restrictions changed
* manual refresh

Optional guardrail:

* debounce rapid events so multiple logs within a short window create only one new generation

## Queries to implement

### Latest generation

```txt
users/{userId}/recommendation_generations
order by generatedAt desc
limit 1
```

### Recommendations for latest generation

```txt
users/{userId}/recommendation_generations/{generationId}/recommendations
order by rank asc
limit 5
```

### Update recommendation action

Direct doc update on:

```txt
users/{userId}/recommendation_generations/{generationId}/recommendations/{recommendationId}
```

## API shape

### Get feed

```txt
GET /v1/users/:userId/recommendations
```

Behavior:

* load latest generation
* validate freshness
* recompute if needed
* return top 5 recommendations plus metadata

### Submit action

```txt
POST /v1/users/:userId/recommendations/:generationId/:recommendationId/action
```

Body:

```ts
{
  state: 'accepted' | 'rejected' | 'maybe' | 'dismissed' | 'completed',
  reasonCode?: string,
  freeText?: string
}
```

### Force recompute

```txt
POST /v1/users/:userId/recommendations/recompute
```

## Important implementation rules

* Treat each generation as immutable once created
* Only mutate recommendation `action` after creation
* Keep all generations for history/debugging
* Keep validity logic in service config, not in stored docs
* Prefer nested recommendations under generation, not a flat recommendation collection

## Deliverables

Build:

1. Firestore schema for `recommendation_generations` and nested `recommendations`
2. Recommendation generation service
3. Latest-generation validity check
4. Get-feed endpoint
5. Recommendation action update endpoint
6. Recompute endpoint
7. Optional debounce around repeated event-triggered generation
