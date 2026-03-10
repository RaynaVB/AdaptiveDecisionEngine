# Uncertainty & Trust Policy

This document outlines how the Adaptive Decision Engine handles uncertainty, sparse data, and low-confidence predictions to maintain user trust (Phase 3B requirement).

## 1. The Gating Principle
The engine refuses to "overclaim" or hallucinate patterns when there is insufficient data. All generative and analytical components are bound by strict thresholds:
- **Pattern Engine Confidence:** Patterns are explicitly tagged with `low`, `medium`, or `high` confidence based on the frequency of occurrences and the total volume of logs (e.g., Min 5 meals and 3 moods in a 7-day window).
- **Template Minimums:** The Recommender Engine's `ActionLibrary` enforces minimum data thresholds (`minMealEventsInWindow`, `minMoodEventsInWindow`) and minimum pattern confidences (`minPatternConfidence`) for every single recommendation template. If these thresholds are not met, the template is dropped from the candidate pool.

## 2. Graceful Fallback (Safe Baseline)
If the user is new (sparse logs) or their recent behavior forms no detectable patterns, the pattern engine will output empty or very low confidence patterns. Subsequently, the recommender engine will find 0 eligible templates in the main library. 

In this scenario, the engine guarantees an output by serving a **Safe Fallback Intervention**:
- **Mechanism:** The engine selects from a pool of `safe_` templates (e.g., `safe_soft_hydration`).
- **Characteristics:** These templates have `minMealEventsInWindow: 0` and do not require strong patterns. They focus on universally healthy, extremely low-friction actions (like taking a pause or hydrating).
- **Transparency:** The `whyThis` explanation explicitly states the system's uncertainty. Example: *"You’re still building consistent logs. This is a safe, low-effort step while the system learns your patterns."*

## 3. Feedback Loop & Adaptation
If the system provides a recommendation that the user repeatedly rejects (e.g., poor mapping of a substitute), the `Learning Logic` steps in. The engine demotes the rejected recommendation type in future rankings. Over time, the recommendations self-correct away from friction points, minimizing long-term errors and preserving trust.
