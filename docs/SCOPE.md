# Scope — V2

This document defines what is included and excluded in V2 to prevent feature creep and preserve the core thesis: decision intelligence > tracking dashboards.

---

## 1. MUST HAVE (V2 requirements)
### A.. Logging
- Meal logging via photo or short text
- Timestamp + meal slot (breakfast/lunch/dinner/snack)
- Meal type tags (coarse categories)
- Mood logging with predefined tap-based moods

### B.. Pattern Engine
- Detect patterns across:
  - meal timing
  - mood-linked eating
  - meal type ↔ mood correlations
  - weekday/weekend shifts
- Confidence scoring + minimum sample-size gating

### C.. Recommendation Engine
- Generate 1 best next action + 2 alternatives
- Explanations: “why this, why now”
- Recommendation types:
  - timing intervention
  - substitution
  - prevention plan for high-risk moments
  - recovery recommendation

### D.. Learning Loop
- User outcome feedback:
  - accepted / partial / rejected
- Adaptive logic changes future recommendations

### E.. Trust / Uncertainty
- Visible confidence handling
- Graceful fallback when confidence is low
- No hallucinated specifics

### F.. Evidence / Packaging
- PRD + scope + architecture diagram
- pilot protocol + results
- iteration report + demo video

---

## 2. SHOULD HAVE (only after MUST HAVE is stable)
- Weekly summary view:
  - top 3 patterns
  - top 3 focus actions
- User preference weights:
  - feasibility vs intensity
  - health vs convenience
- Quick-export report (pdf or md)

---

## 3. NOT REQUIRED / NOT IN V2 (explicit exclusions)
These features add complexity without increasing the core signal of decision intelligence.

### Tracking / dashboards
- calorie/macronutrient dashboards
- micronutrient analysis
- “health score” composite metric
- graphs-heavy analytics UI

### Engagement / social
- streaks, points, gamification
- leaderboards, sharing, social competition

### Meal ecosystem
- meal planning
- recipe generation
- grocery lists
- barcode scanning

### Wearables and biomarkers
- HRV integration
- Apple Health / Fitbit / Oura
- labs, biomarkers, supplements

### Medical positioning
- diagnosis or treatment claims
- clinical recommendations

---

## 4. Future Work (Post-V2 / Phase 2)
- incorporate HRV or physiological stress proxies to reduce manual mood logging
- expand behavioral context signals (sleep, schedule constraints)
- improved personalization with longer history
