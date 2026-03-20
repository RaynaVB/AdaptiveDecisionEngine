Insights should be generated on a **slower cadence than recommendations**, but refreshed on **important user events**.

Think of it like this:

* **Insights** = pattern detection layer
* **Recommendations** = decision layer

Recommendations may change often. Insights should change only when there is enough new evidence.

# Good rule of thumb

## Recommendations

Refresh:

* on every meaningful event
* or when screen is opened and cache is stale

## Insights

Refresh:

* on a schedule
* and on important evidence-changing events
* but **not** on every tiny interaction

Insights should be more stable than recommendations.

---

# How often insights should be generated

Use a **hybrid model**:

## 1. Scheduled regeneration

Run a full insights generation:

* every **6–24 hours** for active users

A strong default:

* **every 12 hours**

That is usually enough for:

* new correlations
* confidence updates
* emerging pattern detection
* trend stabilization

---

## 2. Event-driven regeneration

Also regenerate when something materially changes the evidence base, such as:

* new symptom log
* new meal log
* experiment completed
* major onboarding/profile change
* enough new data accumulated since last run

But do not always run a full regeneration immediately.

Better:

* queue it
* debounce it
* coalesce multiple new logs together

Example:

* user logs breakfast
* then logs bloating
* then logs mood 20 minutes later

You probably want **one insight refresh**, not three.

---

# Best cadence for v1

I would use:

## Full insights generation

* every **12 hours**
* or when there are meaningful new logs since last generation

## Trigger-based generation

Regenerate if:

* at least 1 new symptom log exists after last insight generation
* or at least 1–3 new meal logs exist after last generation
* or an experiment completes
* or a profile/goals/restrictions change

## Debounce window

If events happen close together:

* wait **5–15 minutes**
* then generate once

That is a very practical first version.

---

# Why not generate insights on every screen open

Because insights are heavier and more analytical.

They often involve:

* windowed correlation checks
* trigger detection
* symptom timing analysis
* confidence recalculation
* dedupe of overlapping findings

Doing that on every open is wasteful and can make outputs jitter too much.

Insights should feel:

* evidence-based
* stable
* cumulative

Not:

* constantly reshuffled

---

# What recommendations should do with insights

Recommendations should **consume the latest insight generation** as an input.

The flow should be:

## Step 1: Insights Service produces findings

Examples:

* Dairy → bloating within 3–6h
* Protein breakfast → better afternoon energy
* Late caffeine → worse sleep
* Skipping breakfast → higher morning anxiety

Each insight should include:

* type
* category
* confidence
* evidence strength
* recency
* status (emerging / confirmed)

---

## Step 2: Recommendation Service reads latest insights

It uses those insights to generate candidate actions like:

* avoid dairy today
* try protein breakfast tomorrow
* stop caffeine after 1pm
* start a 5-day dairy elimination experiment

---

## Step 3: Recommendation Service ranks actions

Ranking uses:

* onboarding goals
* recent symptoms
* latest insight confidence
* urgency
* user feedback history
* active experiments
* dietary restrictions

So:

> Insights tell you **what seems true**
> Recommendations tell you **what to do about it**

That separation is the right architecture.

---

# Concrete feeding model

## Insights output

Store latest insight generation like:

```txt
users/{userId}/insight_generations/{generationId}
users/{userId}/insight_generations/{generationId}/insights/{insightId}
```

Each insight doc might look like:

```json
{
  "type": "trigger_pattern",
  "category": "digestive",
  "title": "Dairy may be linked to bloating",
  "confidenceScore": 0.78,
  "confidenceLevel": "high",
  "evidence": {
    "matchCount": 4,
    "sampleSize": 7
  },
  "window": {
    "minHours": 3,
    "maxHours": 6
  },
  "status": "confirmed"
}
```

---

## Recommendation input

When recommendation generation runs, it should pull:

* latest valid insight generation
* recent user logs since that generation
* active experiments
* latest profile/goals/restrictions
* recommendation feedback history

Then it can combine:

* **stable pattern knowledge** from insights
* **fresh event context** from recent logs

That combination is powerful.

---

# Important nuance: recommendations should not depend only on insights

Recommendations should use both:

## A. Latest insights

Stable pattern layer

## B. Fresh raw events after latest insight generation

Immediate context layer

Example:

* latest insight says dairy may trigger bloating
* user just logged a dairy-heavy meal 5 minutes ago

Even if insights have not regenerated yet, recommendations can still act on:

* existing dairy insight
* fresh meal event

and produce:

* “Watch for bloating in the next few hours”
* “Log symptoms after lunch”
* “Avoid more dairy today”

So recommendation logic should not wait for a full insight rerun every time.

---

# Best architecture

## Insights Service responsibilities

Produces:

* pattern detections
* sensitivity signals
* confidence levels
* supporting evidence
* emerging/confirmed states

Cadence:

* slower
* evidence-based
* periodic + event-driven

## Recommendation Service responsibilities

Consumes:

* latest insights
* fresh recent logs
* profile/goals/restrictions
* active experiment state
* recommendation feedback

Cadence:

* faster
* more responsive
* event-driven

---

# Recommended timing strategy

## Insights freshness

Treat latest insight generation as valid if:

* within last **12 hours**
* and no major evidence-changing event demands refresh
* and minimum new-data threshold has not been crossed

## Recommendation freshness

Treat recommendation generation as valid if:

* within last **6–12 hours**
* and no new major event has occurred since generation

Recommendations can refresh more often than insights.

That is okay and desirable.

---

# Example end-to-end flow

## Example 1

User has existing insight:

* Dairy → bloating (high confidence)

User logs:

* pizza at 1:00 PM

Recommendation service can immediately generate:

* Avoid more dairy today
* Log digestion symptoms by evening
* Start dairy elimination experiment

No need to rerun full insights instantly.

---

## Example 2

Over 2 days, user logs:

* 3 protein-heavy breakfasts
* noticeably better afternoon energy

At next insight generation:

* new insight created: Protein breakfast → better afternoon energy

Recommendation service now starts surfacing:

* Plan a protein breakfast tomorrow
* Repeat your successful breakfast pattern

---

## Example 3

User completes experiment:

* 5-day caffeine cutoff

That should trigger immediate insight regeneration because the evidence base changed meaningfully.

Insights may now say:

* Late caffeine likely contributes to sleep disruption

Recommendation service then uses that to:

* Recommend caffeine cutoff after 1 PM

---

# Strong v1 implementation advice

Do this:

## Insights

* generate every 12 hours
* also regenerate after symptom logs, experiment completion, or enough new meal data
* debounce by 5–15 minutes

## Recommendations

* generate more frequently
* read latest insights
* combine with fresh logs after latest insight generation
* do not wait for insights every time

---

# Simple mental model

Use this pipeline:

```txt
raw logs → Insights Service → structured patterns
structured patterns + fresh context → Recommendation Service → actions
```

That is the clean split.

---

# Final answer

Insights should be generated **less frequently than recommendations**—typically on a **scheduled cadence like every 12 hours**, plus on important evidence-changing events such as new symptoms, experiment completion, or enough new meal data. Recommendations should then consume the **latest insight generation** as the stable pattern layer, and combine it with **fresh recent logs** to decide what to suggest right now. This lets insights stay stable and evidence-based while recommendations remain fast and responsive.
