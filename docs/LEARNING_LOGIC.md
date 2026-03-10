# Learning Logic (Recommendation Adaptation)

This document describes how the Adaptive Decision Engine learns from user feedback, a key requirement for Phase 3B.

## Core Mechanism

The engine tracks explicit user feedback—mapped as a `FeedbackOutcome` ("Adopted," "Partially Accepted," or "Rejected")—for each recommendation presented. This data is persisted via `FeedbackStorageService`.

During the generation of new recommendations, the system adapts its scoring logic based on historical rejections to optimize for better adoption rates.

### Adaptation Rule: Rejection Penalty

1. **Calculate Rejection Rate:** When evaluating a candidate action template, the engine querys `FeedbackStorageService.getRejectionRateByType(template.recommendationType)`. This returns a value between 0.0 and 1.0 representing how frequently this specific *type* of recommendation (e.g., `substitution`, `timing_intervention`) has been explicitly rejected by the user.

2. **Calculate Base Scores:** The standard scoring function evaluates Impact (40%), Feasibility (40%), and Confidence (20%) to determine the `total` score.

3. **Apply Penalty:** 
   If a recommendation type has a non-zero rejection rate, a penalty is applied linearly to the `total` score:
   ```javascript
   const penalty = rejectionRate * 0.4;
   total = Math.max(0, total - penalty);
   ```
   **Why 0.4?** A `0.4` penalty ensures that a recommendation type with a 100% rejection rate is severely demoted in the ranking (losing up to 40% of its total score), effectively preventing it from surfacing as the "Best Next Action" while still allowing it to occasionally surface as an alternative if no other strong candidates exist.

### Future Roadmap (Phase 4 / Post-Pilot)
- **Cooldowns:** Implement hard cooldown periods (e.g., hiding a specific `recommendationType` for 3 days if rejected twice in a row).
- **Feasibility Boosting:** Dynamically increase the weight of the Feasibility score (and lower Impact) if recent recommendations were rejected, inferring that the user might be experiencing high friction.
