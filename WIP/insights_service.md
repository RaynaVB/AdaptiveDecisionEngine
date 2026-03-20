Next: **Insights Service**.

That is the best follow-on extraction after Recommendations because it becomes the upstream engine that produces the signals Recommendations ranks.

# Why Insights next

Recommendations answers:

* what should the user do now

Insights answers:

* what patterns are likely true

The clean target is:

* **Insights Service** = detect patterns, correlations, sensitivities, and emerging signals
* **Recommendation Service** = rank and deliver actions based on those signals
* **Lab Service** = run experiments to confirm or reject uncertain signals
* **Weekly Service** = summarize the last 7 days for display/reporting

So Insights is the natural next extraction.

# What Insights Service should own

It should take user logs and produce reusable pattern outputs such as:

* likely triggers
* likely protective foods/behaviors
* symptom correlations
* timing patterns
* meal timing effects
* energy/mood stability patterns
* confidence scores
* emerging vs confirmed patterns
* user sensitivity signals

Examples:

* Dairy → bloating within 3–6 hours
* Protein breakfast → better afternoon energy
* Late caffeine → worse sleep next day
* Skipping breakfast → increased anxiety before lunch

These outputs then feed:

* Recommendations
* Weekly Patterns
* Health Lab experiment suggestions

# Best service boundary

The service should not care about cards/screens. It should return structured findings.

Example output shape:

```json
{
  "insightId": "ins_123",
  "type": "trigger_pattern",
  "category": "digestive",
  "title": "Dairy may be linked to bloating",
  "summary": "Bloating appears more often within 3–6 hours of dairy intake.",
  "confidenceScore": 0.78,
  "confidenceLevel": "high",
  "window": {
    "minHours": 3,
    "maxHours": 6
  },
  "supportingEvidence": {
    "matchCount": 4,
    "sampleSize": 7
  },
  "status": "active"
}
```

# Recommended responsibilities for Insights Service

Own:

* input normalization from logs
* feature extraction from meals/symptoms/moods
* association and pattern scoring
* confidence calculation
* deduping overlapping patterns
* emerging vs confirmed labeling
* persistence of insight generations/results

Do not own yet:

* UI wording variations for every screen
* recommendation ranking
* experiment enrollment logic

# Suggested extraction order from here

1. **Insights Service**
2. **Health Lab Service**
3. **Weekly Patterns Service**

# Why this order works

Once Insights is extracted:

* Recommendation Service consumes backend-generated insights
* Lab can use insights to choose experiments
* Weekly can summarize insights rather than rediscover them

That gives you a much cleaner stack.

# What to build first inside Insights

Start narrow. Do not try to extract every analytical rule at once.

First version should handle only the highest-value pattern families:

* food/ingredient → symptom
* food/meal pattern → energy/mood
* timing-based patterns
* protective patterns

That will already power a lot.

# Good v1 data model

Mirror what you did for Recommendations:

* **Insight Generation**
* **Insight**

For example:

```txt
users/{userId}/insight_generations/{generationId}
users/{userId}/insight_generations/{generationId}/insights/{insightId}
```

This keeps things consistent across services.
