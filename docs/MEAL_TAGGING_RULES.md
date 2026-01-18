# Meal Tagging Rules (V2)
## Adaptive Decision Engine (Health)

This document defines how meals should be tagged in V2.

### Why tagging exists (important)
V2 is not a nutrition dashboard. It is a **decision intelligence system** designed to:
- detect behavioral patterns (timing, mood-linked eating, trigger foods)
- generate feasible recommendations
- optimize for follow-through

Therefore, V2 uses **coarse meal-type tags** rather than exact nutrition estimation.

---

## 1) Core Concept: Coarse Tags > Exact Nutrition
V2 does NOT require:
- calories
- macro/micro nutrient counts
- grams of protein/fat/carbs
- precise portion estimation

Instead, it captures **minimal signals** that support pattern recognition:
- when the meal happened (time)
- what type of meal it was (coarse tags)
- what “behavioral context” it suggests (e.g., late-night snack, high sugar)

---

## 2) Required Meal Fields
Every meal log must include:

### 2.1 Meal Slot (required)
- `breakfast`
- `lunch`
- `dinner`
- `snack`

### 2.2 Meal Type Tags (required)
A meal must have at least one tag in `mealTypeTags`.
If the user selects no tags, assign:
- `unknown`

---

## 3) Meal Type Tag Enum (Exact)
The application must implement these tags exactly:

### 3.1 Base Load Tags (recommended: choose one)
These describe how “heavy” the meal felt.
- `light`
- `regular`
- `heavy`

### 3.2 Craving Flavor (optional)
- `sweet`
- `savory`

### 3.3 Source (optional)
- `homemade`
- `restaurant`
- `packaged`

### 3.4 Impact Heuristics (optional; allow 0–2)
- `high_sugar`
- `fried_greasy`
- `high_protein`
- `high_fiber`
- `caffeinated`

### 3.5 Fallback
- `unknown`

---

## 4) Tagging Logic & Rules

### 4.1 Tag Selection Rules
1. **Zero Tags**: If user selects zero tags → set `['unknown']`.
2. **Base Load Encouragement**: Encourage selecting 1 base load tag (`light`/`regular`/`heavy`) but do not hard-block saving if omitted (as long as something else is selected, or default to unknown).
3. **Display**: Display tags as chips; allow one-tap removal.

### 4.2 Quick-Pick Presets (Speed)
For speed, provide these one-tap combinations:

**“Quick Snack Sweet”**
- `regular`
- `sweet`
- `packaged`

**“Heavy Dinner Out”**
- `heavy`
- `savory`
- `restaurant`

**“Light Breakfast”**
- `light`
- `homemade`

---

## 5) Editing Tags
Editing tags must be possible from the timeline (tap a row).
User should be able to add/remove tags easily.
