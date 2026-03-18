Here’s a **clean, build-ready one-pager** you can hand directly to an agent or engineering team.

---

# 📄 Recycler Onboarding Redesign — One Pager

## 🎯 Objective

Redesign onboarding to shift from **food logging** → **food + symptom intelligence**, enabling:

* personalized ingredient inference
* symptom correlation
* targeted insights & interventions

---

# 🧠 Core Product Principle

> “Help me understand what foods affect how I feel.”

Onboarding must capture:

1. **User goals**
2. **Target symptoms**
3. **Dietary constraints**
4. **Sensitivity signals**

---

# 🧩 Updated Onboarding Structure

## 1. Primary Goal (Required)

### Prompt:

**“What would you like to improve?”**

### Selection (multi-select, max 2–3):

* Understand how food affects my body
* Identify foods causing symptoms
* Improve digestion & gut health
* Improve energy levels
* Improve mood & mental clarity
* Eat better for long-term health

### Data Model:

```json
{
  "goals": ["digestive_health", "identify_triggers"]
}
```

---

## 2. Symptoms (Required)

### Prompt:

**“What symptoms do you want to understand?”**

### Categories:

#### Digestive

* Bloating
* Gas
* Stomach pain
* Acid reflux
* Constipation
* Diarrhea

#### Energy

* Fatigue
* Energy crashes

#### Mental

* Brain fog
* Mood swings
* Anxiety
* Irritability

#### Physical

* Headaches
* Skin issues
* Sleep problems

### Data Model:

```json
{
  "symptoms": ["bloating", "fatigue", "brain_fog"]
}
```

---

## 3. Dietary Restrictions, Allergies & Sensitivities (Required)

### Prompt:

**“Do you follow any dietary restrictions or have sensitivities?”**

### Grouped UI (chips)

#### Allergies

* Peanuts
* Tree Nuts
* Eggs
* Soy
* Fish/Shellfish

#### Dietary Preferences

* Vegan
* Vegetarian
* Gluten-Free
* Dairy-Free

#### Sensitivities (NEW — critical)

* Lactose Intolerance
* High FODMAP sensitivity
* Spicy foods
* Caffeine sensitivity
* Sugar sensitivity
* Fried/oily foods
* Artificial sweeteners
* Alcohol

#### Other

* Free text input OR searchable ingredient selector

### Data Model:

```json
{
  "allergies": ["peanuts"],
  "dietaryPreferences": ["gluten_free"],
  "sensitivities": ["lactose", "caffeine"]
}
```

---

## 4. Foods Avoided (Optional)

### Prompt:

**“Any foods you avoid?”**

### Input:

* Free text OR ingredient search (linked to canonical DB)

### Example:

* “Mushrooms”
* “Olives”

### Data Model:

```json
{
  "avoidedFoods": ["mushrooms", "olives"]
}
```

---

## 5. Symptom Frequency (Required — High Impact)

### Prompt:

**“How often do you experience symptoms?”**

### Options:

* Rarely
* A few times a week
* Almost daily
* After most meals

### Data Model:

```json
{
  "symptomFrequency": "daily"
}
```

---

# 🔗 Backend Integration

## Map onboarding → system behavior

### 1. Ingredient Risk Weighting

* If `bloating` → prioritize:

  * onion, garlic, dairy, beans, artificial sweeteners

* If `fatigue` → prioritize:

  * sugar, refined carbs, fried foods

---

### 2. Photo Analysis Enhancement

Use onboarding to:

* adjust ingredient confidence scores
* bias inference toward likely triggers
* generate better follow-up questions

Example:

* lactose sensitive → ask:
  “Did this contain dairy?”

---

### 3. HealthLab / Experiments (future)

Auto-generate:

* “Try removing dairy for 3 days”
* “Test low-FODMAP meals this week”

---

### 4. Insight Engine

Use onboarding as baseline filters:

Example:

* “80% of your bloating meals contained garlic or onion”
* “Caffeine correlates with your anxiety logs”

---

# 🧱 Firestore Schema

## `users/{userId}/preferences`

```json
{
  "goals": [],
  "symptoms": [],
  "symptomFrequency": "",
  "allergies": [],
  "dietaryPreferences": [],
  "sensitivities": [],
  "avoidedFoods": [],
  "createdAt": "",
  "updatedAt": ""
}
```

---

# 🎨 UI/UX Requirements

## Interaction

* Chip-based multi-select
* Grouped sections (not flat)
* Max selections for goals (2–3)
* Progressive disclosure (avoid overwhelm)

## Behavior

* Allow skip ONLY for optional fields
* Validate required sections before continue
* Persist partial progress (in case of drop-off)

---

# 🚫 Anti-Patterns to Avoid

Do NOT:

* Treat this as a “diet app”
* Overload with too many options
* Use clinical language (e.g. “GI distress”)
* Skip symptom collection (critical mistake)
* Store only free text (must map to structured data)

---

# ✅ Success Criteria

* ≥80% onboarding completion rate
* ≥70% users select at least 2 symptoms
* Improved ingredient inference accuracy (via personalization)
* Reduced user corrections in meal review
* Increased engagement with insights

---

# 🚀 Summary

This redesign transforms onboarding from:

❌ “What do you eat?”

→ into →

✅ “What’s happening in your body, and how can food explain it?”

This is the foundation for:

* smarter ingredient extraction
* meaningful correlations
* long-term retention

---
