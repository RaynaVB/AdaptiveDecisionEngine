# Uncertainty Policy

To maintain user trust, the Adaptive Decision Engine suppresses patterns when data is insufficient.

## Minimum Data Requirements

### Global Thresholds
*   **Minimum Meals (Last 7 Days):** 5
    *   *Rationale:* Less than ~1 meal/day is too sparse to detect trends.
*   **Minimum Moods (Last 7 Days):** 3
    *   *Rationale:* Need at least a few data points to correlate with meals.

### Per-Pattern Thresholds

#### P1 (Mood Dip → Eating)
*   **Min Triggers:** 2
*   **Confidence Levels:**
    *   **High:** >= 3 triggers AND >= 5 total negative moods logged.
    *   **Medium:** 2 triggers.
    *   **Low:** < 2 triggers (Suppressed).

#### P2 (Late Night Cluster)
*   **Min Triggers:** 3 late night meals.
*   **Confidence Levels:**
    *   **High:** >= 5 late meals OR > 50% of total meals.
    *   **Medium:** 3-4 late meals OR > 30% of total meals.
    *   **Low:** < 3 late meals (Suppressed).

#### P3 (Weekday/Weekend Shift)
*   **Min Triggers:** N/A (Based on ratio).
*   **Confidence Levels:**
    *   **High:** Ratio >= 2.0 AND >= 10 total snacks.
    *   **Medium:** Ratio >= 1.5 AND >= 5 total snacks.
    *   **Low:** Ratio < 1.5 OR < 5 snacks (Suppressed).

#### P4 (Meal Type Association)
*   **Min Triggers:** 3 meals with specific tag.
*   **Confidence Levels:**
    *   **High:** Association Rate >= 80% AND >= 5 tag occurrences.
    *   **Medium:** Association Rate >= 60% AND >= 3 tag occurrences.
    *   **Low:** Rate < 60% OR < 3 occurrences (Suppressed).

## Fallback Behavior
If global thresholds are not met, the "Weekly Patterns" screen should display:
> "Not enough data yet. Keep logging meals and moods to see patterns."
