# Pattern Definitions (V1)

This document defines the behavior patterns detected by the Adaptive Decision Engine (Health) V1.

## P1: Mood Dip → Eating

**ID:** `mood_dip_then_eat`

### Definition
Detects if a "Negative" or "High Stress" mood log is followed by a meal log within a short time window. This identifies potential emotional eating triggers.

### Trigger Logic
1.  Find all Mood Events where:
    *   `valence` is 'negative' OR
    *   `stress` is 'high'
2.  For each such mood, check if any Meal Event occurred where:
    *   `meal.occurredAt` > `mood.occurredAt` AND
    *   `meal.occurredAt` <= `mood.occurredAt` + `WINDOW_MINUTES`

### Parameters
*   `WINDOW_MINUTES`: **60 minutes** (Default)

### Output Example
```json
{
  "id": "p1_123",
  "patternType": "mood_dip_then_eat",
  "title": "Mood Dip Trigger",
  "description": "2 instances of high stress followed by eating within 60 minutes.",
  "confidence": "medium",
  "evidence": {
    "trigger_count": 2,
    "window_minutes": 60,
    "total_negative_moods": 5
  }
}
```

---

## P2: Late Night Eating Cluster

**ID:** `late_night_eating_cluster`

### Definition
Identifies a frequent pattern of eating late at night, which may impact sleep or metabolic health.

### Trigger Logic
1.  Filter meals that occurred in the last 7 days.
2.  Count meals where local time is after `CUTOFF_TIME`.
3.  Trigger if:
    *   Count >= `MIN_OCCURRENCES` OR
    *   (Count / Total Weekly Meals) >= `MIN_PERCENTAGE`

### Parameters
*   `CUTOFF_TIME`: **21:00 (9:00 PM)**
*   `MIN_OCCURRENCES`: **3**
*   `MIN_PERCENTAGE`: **0.30 (30%)**

### Output Example
```json
{
  "id": "p2_456",
  "patternType": "late_night_eating_cluster",
  "title": "Late Night Snacking",
  "description": "You logged 4 meals after 9:00 PM this week.",
  "confidence": "high",
  "evidence": {
    "late_meal_count": 4,
    "cutoff_time": "21:00",
    "total_weekly_meals": 10
  }
}
```

---

## P3: Weekday vs Weekend Shift

**ID:** `weekday_weekend_shift`

### Definition
Detects significant shifts in eating frequency (specifically snacking) between weekdays (Mon-Fri) and weekends (Sat-Sun).

### Trigger Logic
1.  Calculate `Weekday Snack Frequency` = (Total Weekday Snacks / Number of Weekdays with logs).
2.  Calculate `Weekend Snack Frequency` = (Total Weekend Snacks / Number of Weekend Days with logs).
3.  Trigger if:
    *   Weekend Freq >= 1.5 * Weekday Freq (Weekend Binge?)
    *   Weekday Freq >= 1.5 * Weekend Freq (Work Stress Snacking?)

### Parameters
*   `RATIO_THRESHOLD`: **1.5**

### Output Example
```json
{
  "id": "p3_789",
  "patternType": "weekday_weekend_shift",
  "title": "Weekend Snacking Shift",
  "description": "You snack 2x more often on weekends than weekdays.",
  "confidence": "medium",
  "evidence": {
    "weekday_freq": 1.0,
    "weekend_freq": 2.2,
    "ratio": 2.2
  }
}
```

---

## P4: Meal Type ↔ Mood Shift Correlation

**ID:** `meal_type_mood_association`

### Definition
Identifies if specific meal tags (e.g., "high_sugar", "fried_greasy") are consistently associated with a negative mood shift shortly after eating.

### Trigger Logic
1.  For each target tag (e.g., `high_sugar`, `heavy`):
2.  Find all meals with this tag.
3.  Look for "Mood Shift" events within `WINDOW_HOURS` after meal.
    *   Mood Shift = Valence dropping (e.g., Positive -> Neutral, or Neutral -> Negative).
4.  Trigger if Association Rate (Shift Count / Tag Count) >= `THRESHOLD`.

### Parameters
*   `WINDOW_HOURS`: **4 hours**
*   `MIN_TAG_OCCURRENCES`: **3** (Need sample size)
*   `ASSOCIATION_THRESHOLD`: **0.60 (60%)**

### Output Example
```json
{
  "id": "p4_101",
  "patternType": "meal_type_mood_association",
  "title": "Sugar Crash",
  "description": "60% of 'high_sugar' meals are followed by a drop in energy or mood within 4 hours.",
  "confidence": "medium",
  "evidence": {
    "tag": "high_sugar",
    "total_tag_count": 5,
    "mood_drop_count": 3
  }
}
```
