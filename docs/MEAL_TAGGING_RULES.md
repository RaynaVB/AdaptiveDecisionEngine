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
- `li
