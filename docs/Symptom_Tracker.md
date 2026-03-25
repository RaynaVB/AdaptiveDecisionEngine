# Symptom Tracker + AI Insight Engine

**Product Requirements Document (PRD)**

## 1. Overview

The Symptom Tracker + AI Insight Engine enables users to easily log symptoms and discover patterns between symptoms and daily behaviors such as food, sleep, hydration, stress, and activity.

The goal is to help users answer questions like:

- *Why do I get headaches?*
- *What causes my bloating?*
- *Why do I feel fatigued in the afternoon?*
- *What behaviors make symptoms worse or better?*

The system analyzes longitudinal behavioral data and produces non-medical, AI-driven insights that help users identify potential lifestyle contributors to symptoms.

This feature transforms the application from a food tracker into a personal health intelligence platform.

## 2. Goals

### Primary Goals

- Enable fast symptom logging (<10 seconds).
- Identify patterns between symptoms and behaviors.
- Generate AI-driven insights about possible triggers.
- Suggest safe personal experiments to test hypotheses.
- Provide predictive alerts when symptoms are likely.

### Secondary Goals

- Increase daily engagement.
- Create valuable longitudinal health data.
- Build a foundation for future predictive health features.

## 3. Non-Goals

The system will **not**:

- Diagnose medical conditions.
- Provide medical treatment recommendations.
- Replace clinical care.
- Interpret symptoms as medical advice.

All outputs must be framed as pattern observations or behavioral insights.

## 4. Key Value Proposition

Most symptom trackers are static journals. This system creates a learning loop:

1. **Log Symptom**
2. **Connect to Context**
3. **Detect Patterns**
4. **Generate Insight**
5. **Suggest Experiment**
6. **Measure Improvement**

This transforms the application into a personal health laboratory.

## 5. User Personas

### Persona 1 — Wellness Optimizer
- Tracks diet and habits
- Wants to improve energy and performance
- Interested in data-driven insights

### Persona 2 — Symptom Explorer
- Experiences recurring symptoms
- Wants to understand triggers
- Open to behavior experiments

### Persona 3 — Preventative Health User
- Wants to identify patterns early
- Uses technology for proactive health

## 6. Core Feature Set

### 6.1 Symptom Logging

Users can log symptoms quickly.

**Required Fields**
| Field | Description |
|---|---|
| Symptom | symptom type |
| Severity | intensity scale |
| Time | when symptom occurred |

**Optional Fields**
| Field | Description |
|---|---|
| Duration | how long symptom lasted |
| Body area | location |
| Notes | free text |
| Suspected trigger | optional tag |

### 6.2 Severity Scale

Recommended scale: 0–5

| Score | Meaning |
|---|---|
| 0 | none |
| 1 | mild |
| 2 | noticeable |
| 3 | moderate |
| 4 | strong |
| 5 | severe |

This provides enough resolution for modeling without overwhelming users.

## 7. Symptom Taxonomy

**Digestive**
- bloating
- nausea
- reflux
- stomach pain
- constipation
- diarrhea

**Neurological**
- headache
- migraine
- dizziness
- brain fog

**Energy**
- fatigue
- low energy

**Mood**
- anxiety
- irritability
- low mood

**Sleep**
- poor sleep
- restless sleep
- waking tired

**Respiratory**
- congestion
- shortness of breath

**Skin**
- rash
- itching
- irritation

*Users may also create custom symptoms.*

## 8. User Experience Design

### Quick Log Flow
1. Tap "+"
2. Select symptom
3. Select severity
4. Save

*(Expected time: under 10 seconds)*

### Symptom Chips
Common symptoms appear as tappable shortcuts.
> **Example**: Headache | Bloating | Fatigue | Brain Fog

### Smart Personalization
The app surfaces the user’s most frequently logged symptoms.
> **Example**: Today's quick log: Headache | Bloating | Fatigue

## 9. Data Model

### Symptom Event Schema
```typescript
export interface SymptomEvent {
  id: string;
  symptomType: string;
  category: 'digestive' | 'neurological' | 'energy' | 'mood' | 'sleep' | 'respiratory' | 'skin' | 'custom';
  severity: 0 | 1 | 2 | 3 | 4 | 5;
  occurredAt: string; // ISO timestamp
  endedAt?: string;
  isOngoing: boolean;
  durationMinutes?: number;
  bodyArea?: string;
  notes?: string;
  suspectedTriggerIds?: string[]; // IDs of meals/events
  tags?: string[];
  source: 'manual' | 'checkin' | 'predicted';
  createdAt: string;
}
```

### Daily Symptom Summary
```typescript
type DailySymptomSummary = {
  userId: string
  date: string
  symptomScores: Record<string, number>
  totalSymptomLoad: number
  topSymptoms: string[]
}
```

## 10. Symptom Burden Scoring

Each symptom event produces a burden score:
`burden = severity × duration_weight`

### Duration Weight
| Duration | Weight |
|---|---|
| <30 minutes | 1.0 |
| 30 min–2 hr | 1.25 |
| 2–6 hr | 1.5 |
| >6 hr | 2.0 |

**Daily burden:** `daily_load = sum(event_burdens)`
This becomes the primary metric for improvement.

## 11. Behavioral Context Sources

The system correlates symptoms with:

- **Food**: ingredients, nutrients, food groups, meal size, meal timing
- **Sleep**: duration, sleep quality, bedtime
- **Hydration**
- **Stress**
- **Exercise**
- **Cycle phase** *(optional)*
- **Supplements / medications** *(optional)*

## 12. Pattern Detection Engine

The system evaluates correlations across time windows to enable identification of both immediate and delayed triggers.

**Time Windows:**
- 0–2 hours
- 2–6 hours
- 6–24 hours
- previous day
- rolling 3 days

## 13. AI Insight Types

### Correlation Insight
> **Example**: “Bloating appears on 64% of days with high dairy intake compared with 18% on low-dairy days.”

### Timing Insight
> **Example**: “Headaches tend to occur 2–4 hours after skipped meals.”

### Compound Trigger Insight
> **Example**: “Fatigue appears more often when poor sleep and high caffeine occur together.”

### Protective Factor Insight
> **Example**: “Days with morning exercise show lower fatigue scores.”

### Prediction Insight
> **Example**: “Based on past patterns, today may be a higher-risk day for headaches.”

## 14. Prediction Engine

Once enough data exists, the system estimates symptom likelihood. Predictions must always be expressed as probabilities, not certainty.

`Risk Score = f(sleep, hydration, food timing, stress)`
> **Example**: “You have a higher likelihood of afternoon fatigue today.”

## 15. Experiment System (HealthLab Integration)

The system can suggest personal experiments and measure symptom frequency, severity change, and statistical confidence.

### Examples:
- **Hydration Experiment**: Try increasing water intake before noon for 4 days.
- **Late Dinner Experiment**: Reduce meal size after 8pm for 5 days.
- **Dairy Reduction Experiment**: Avoid dairy at breakfast for 1 week.

## 16. Key Screens

- **Symptom Logger**: Fast entry interface.
- **Symptom Timeline**: Visual timeline showing symptoms, meals, sleep, exercise, and hydration.
- **Insight Feed**: AI-generated insights and observations.
- **Prediction Cards**: Daily heads-up warnings.
- **Weekly Intelligence Report**: Includes top symptoms, improvement trends, possible contributors, and suggested experiments.

## 17. Safety and Compliance

The system must include clear disclaimers:
- Not medical advice
- Not diagnostic
- Informational insights only

### Red Flag Symptom Handling

Certain symptoms should trigger a warning:
- chest pain
- fainting
- severe allergic reaction
- blood in stool
- seizure
- suicidal ideation

In these cases, display:
> *"This symptom may require medical attention."*

## 18. Analytics Metrics

### Engagement Metrics
- symptom logs per user per week
- symptom logging completion rate
- repeat logging rate

### Insight Metrics
- insight click-through rate
- insight share rate

### Experiment Metrics
- experiment start rate
- experiment completion rate
- symptom improvement rate

## 19. Development Phases

### Phase 1 — Symptom Logging
- Deliverables: symptom taxonomy, logging UI, event storage, history view

### Phase 2 — Context Correlation
- Deliverables: meal linking, sleep linking, hydration linking, basic pattern detection

### Phase 3 — Insight Engine
- Deliverables: correlation insights, timing analysis, weekly reports

### Phase 4 — Prediction
- Deliverables: symptom likelihood scoring, predictive alerts, adaptive check-ins

### Phase 5 — Experiments
- Deliverables: HealthLab experiments, automated experiment suggestions, improvement tracking

## 20. Success Criteria

The feature is successful if:
- users log symptoms ≥3x per week
- ≥40% of users view insights
- ≥15% of users run experiments
- symptom burden decreases for active users

## 21. Long-Term Vision

The system becomes a personal health intelligence engine that continuously learns:

**Food + Behavior + Context → Symptoms → Insights → Experiments → Improvement**

Over time the platform evolves into:
- predictive wellness guidance
- personalized lifestyle optimization
- preventative health intelligence