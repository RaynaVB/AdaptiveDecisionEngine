# Evaluation Strategy

The Adaptive Decision Engine relies on heuristic-based pattern detection. Validation is performed through a combination of **Automated Logic Verification** and **User-Based Manual Verification**.

## Automated Verification ("The Harness")

We use a suite of fabricated test cases (`src/dev/verify_patterns.ts` and `tests/pattern_engine_tests/`) to ensure the engine behaves deterministically.

### Test Cases Covered
1.  **P1 (Mood Dip → Eating)**
    *   **Trigger:** Negative/High Stress mood followed by meal < 60 mins.
    *   **Suppression:** Mood followed by meal > 60 mins (No trigger).
    *   **Gating:** < 2 triggers should produce no pattern.
2.  **P2 (Late Night Cluster)**
    *   **Trigger:** >= 3 meals after 9 PM.
    *   **Suppression:** Meals before 9 PM only.
3.  **P3 (Weekday/Weekend Shift)**
    *   **Trigger:** Weekend snack freq >= 1.5x Weekday freq.
    *   **Gating:** < 5 total snacks (No pattern).
4.  **P4 (Meal Type Association)**
    *   **Trigger:** Specific tag (e.g., 'high_sugar') followed by negative mood (rate >= 60%).
    *   **Suppression:** Association rate < 60%.

## Manual Verification
*   **Seed Data:** We use a realistic 7-day seed generator to populate the app and verify patterns appear in the UI.
*   **Edge Cases:** We manually test sparse data (clearing logs) to ensure the "Not enough data" empty state appears.

## Known Limitations (V1)
*   **Timezones:** Logic assumes local device time for all calculations. Travel across timezones may skew "Late Night" detection temporarily.
*   **Causality:** Determining "Mood -> Food" vs "Food -> Mood" is based purely on timestamps. Overlapping windows may cause double-counting triggers.
