# Recommendation Engine V1

## Overview
The Recommendation Engine generates safe, actionable, and personalized suggestions based on patterns detected by the Pattern Engine.

## Curated Action Library
All recommendations are strictly selected from `src/core/recommender_engine/actionLibrary.ts`. The engine **does not** invent new health advice or use generative AI to write suggestions. This ensures all advice is reviewed, safe, and actionable.

### Recommendation Types
- `timing_intervention`: Suggestions to delay or timebox eating (e.g., adding a 10-minute buffer).
- `substitution`: Suggesting pairing or swapping foods (e.g., adding a protein to a sweet snack).
- `prevention_plan`: Pre-planning a response to a likely scenario (e.g., default snack for stressful moments).
- `recovery`: Actions to take after eating or a symptom/mood flare-up (e.g., a light walk or wind-down routine).
- `soft_intervention`: Very low-friction pauses or hydration prompts.

## Selection & Guardrails
For a template to be selected as a candidate, it must match the detected pattern type and pass several guardrails:
1. **Minimum Pattern Confidence:** The confidence of the detected pattern must meet or exceed the template's required minimum confidence.
2. **Minimum Data Volume:** The time window must contain enough meal and symptom/mood logs to support the recommendation (e.g., `minMealEventsInWindow`, `minSymptomEventsInWindow`).

## Scoring Model
Each candidate recommendation receives a total score out of 1.0, calculated as follows:
`Total Score = (0.4 * Impact) + (0.4 * Feasibility) + (0.2 * Confidence)`

- **Impact (40%):** How directly the action addresses the pattern. Higher intensity actions generally have higher impact.
- **Feasibility (40%):** How realistic it is for the user to do. Lower intensity actions are considered more feasible.
- **Confidence (20%):** Derived from the engine's confidence in the underlying pattern.

If no highly confident patterns exist, the system safely falls back to low-friction "soft interventions" (e.g., hydration resets).

## Ranking Logic
The engine ranks all scored candidates by their total score in descending order. The UI then displays exactly 3 recommendations:
1. **Best Next Action:** The single highest-scoring recommendation.
2. **Alternative Options:** The subsequent top 2 recommendations.
