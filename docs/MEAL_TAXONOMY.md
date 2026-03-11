# Meal Taxonomy (V2)

## Goal: coarse classification for pattern detection

V2 meal capture relies on coarse tags rather than precise calorie counting. This significantly reduces logging friction while providing sufficient data for the pattern engine.

---

## 1. Meal Slots (`MealSlot`)
A classification of the time the meal was consumed:
- `breakfast`
- `lunch`
- `dinner`
- `snack`

---

## 2. Meal Type Tags (`MealTypeTag`)
Each meal can be tagged with one or multiple tags to describe its characteristics.

### Base Load
- `light`
- `regular`
- `heavy`

### Craving / Taste
- `sweet`
- `savory`

### Source
- `homemade`
- `restaurant`
- `packaged`

### Composition / Impact
- `high_sugar`
- `fried_greasy`
- `high_protein`
- `high_fiber`
- `caffeinated`

### Fallback
- `unknown`

---

## 3. Data Model Constraints
- **Required fields for logging:** At least one of `photoUri` or `textDescription` must be provided, along with the `mealSlot` and a list of `mealTypeTags` (which will default to `['unknown']` if none apply).
- **Free text:** Users can additionally include `raw_text`, `tags` (string array of custom tags), and `notes`.
