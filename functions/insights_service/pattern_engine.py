import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

def get_frequency_factor(user_profile: Optional[Dict[str, Any]]) -> float:
    """Scale min-event thresholds based on how often the user reports symptoms.
    Users with frequent symptoms build patterns faster; those with rare symptoms need more evidence."""
    freq = (user_profile or {}).get("symptomFrequency", "few_times_week")
    return {
        "most_meals":    0.6,   # very frequent → confirm with fewer events
        "almost_daily":  0.75,
        "few_times_week": 1.0,  # default
        "rarely":        1.25,  # infrequent → require more evidence before surfacing
    }.get(freq, 1.0)


def run_pattern_engine(meals: List[Dict[str, Any]], moods: List[Dict[str, Any]], symptoms: List[Dict[str, Any]] = [], user_profile: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    freq_factor = get_frequency_factor(user_profile)
    context = {"meals": meals, "moods": moods, "symptoms": symptoms, "freq_factor": freq_factor}
    insights = []

    # Run each analyzer and convert to Insight format
    insights.extend(analyze_mood_dip_then_eat(context))
    insights.extend(analyze_late_night_cluster(context))
    insights.extend(analyze_weekday_weekend_shift(context))
    insights.extend(analyze_mood_correlations(context))
    insights.extend(analyze_positive_mood_ingredients(context))
    insights.extend(analyze_symptom_correlations(context))
    insights.extend(analyze_delayed_symptom_triggers(context))
    insights.extend(analyze_energy_dip_ingredients(context))
    insights.extend(analyze_sleep_impact_ingredients(context))

    # Fix 8: remove duplicate (ingredient, symptomType) pairs — prefer 0-6h over 6-24h
    insights = deduplicate_trigger_insights(insights)

    return insights


def get_confidence_level(score: float) -> str:
    if score >= 0.8: return "high"
    if score >= 0.5: return "medium"
    return "low"


def compute_ingredient_baseline(meals: List[Dict[str, Any]]) -> Dict[str, float]:
    """Returns fraction of meals (0.0–1.0) that contain each ingredient.
    Used as a baseline frequency to detect genuine lift vs. common staple foods.
    """
    counter: Dict[str, int] = {}
    total = len(meals)
    if total == 0:
        return {}
    for m in meals:
        seen: set = set()
        for ing in m.get("confirmedIngredients", []):
            if ing.get("confirmedStatus") not in ["removed", "suggested"]:
                name = ing.get("canonicalName")
                if name and name not in seen:
                    counter[name] = counter.get(name, 0) + 1
                    seen.add(name)
    return {k: v / total for k, v in counter.items()}


def compute_lift(event_rate: float, baseline_rate: float) -> float:
    """Lift = how much more often an ingredient appears before events vs. in general."""
    if baseline_rate <= 0:
        # No baseline data — treat as moderate lift if rate is meaningful
        return 2.0 if event_rate >= 0.4 else 1.0
    return event_rate / baseline_rate


def deduplicate_trigger_insights(insights: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Fix 8: If the same (ingredient, symptomType) pair is flagged by both
    the 0-6h and 6-24h analyzers, drop the delayed version — the immediate
    signal is cleaner and more actionable.
    """
    seen_immediate: set = set()
    immediate: List[Dict] = []
    delayed: List[Dict] = []
    other: List[Dict] = []

    for ins in insights:
        t = ins.get("type")
        if t == "trigger_pattern":
            meta = ins.get("metadata", {})
            key = (meta.get("triggerIngredient", ""), meta.get("symptomType", ""))
            seen_immediate.add(key)
            immediate.append(ins)
        elif t == "delayed_trigger":
            delayed.append(ins)
        else:
            other.append(ins)

    deduped_delayed = []
    for ins in delayed:
        meta = ins.get("metadata", {})
        key = (meta.get("triggerIngredient", ""), meta.get("symptomType", ""))
        if key not in seen_immediate:
            deduped_delayed.append(ins)

    return immediate + other + deduped_delayed


def get_top_meal_slot(meals: List[Dict[str, Any]]) -> str:
    """Returns the dominant mealSlot among the given meals if one accounts for ≥60%, else 'mixed'."""
    slot_counter: Dict[str, int] = {}
    for m in meals:
        slot = m.get("mealSlot", "")
        if slot:
            slot_counter[slot] = slot_counter.get(slot, 0) + 1
    if not slot_counter:
        return "mixed"
    total = sum(slot_counter.values())
    top = max(slot_counter, key=slot_counter.get)
    return top if slot_counter[top] / total >= 0.6 else "mixed"


# ─── Analyzers ───────────────────────────────────────────────────────────────

def analyze_mood_dip_then_eat(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    meals = context.get("meals", [])
    moods = context.get("moods", [])
    insights = []

    WINDOW_MS = 60 * 60 * 1000
    sorted_moods = sorted(moods, key=lambda x: x.get("occurredAt", ""))
    sorted_meals = sorted(meals, key=lambda x: x.get("occurredAt", ""))

    # Fix 2: track negative moods separately so sampleSize reflects the relevant pool
    negative_moods = []
    trigger_count = 0
    triggers = []

    for mood in sorted_moods:
        is_negative = False
        stype = mood.get("symptomType", "").lower()
        severity = mood.get("severity", 0)

        if stype == "mood" and severity < 0:
            is_negative = True
        elif stype == "stress" and severity > 0:
            is_negative = True

        if is_negative:
            negative_moods.append(mood)
            try:
                mood_time = datetime.fromisoformat(mood["occurredAt"].replace('Z', '+00:00'))
                for meal in sorted_meals:
                    meal_time = datetime.fromisoformat(meal["occurredAt"].replace('Z', '+00:00'))
                    if meal_time > mood_time and meal_time <= mood_time + timedelta(milliseconds=WINDOW_MS):
                        trigger_count += 1
                        triggers.append({"moodId": mood.get("id"), "mealId": meal.get("id")})
                        break
            except Exception:
                continue

    if trigger_count >= 2:
        confidence_score = 0.9 if trigger_count >= 3 else 0.7
        insights.append({
            "insightId": str(uuid.uuid4()),
            "type": "mood_trigger",
            "category": "mental_health",
            "title": "Mood Dip Trigger",
            "summary": f"{trigger_count} instances of high stress or negative mood followed by eating within 60 minutes.",
            "confidenceScore": confidence_score,
            "confidenceLevel": get_confidence_level(confidence_score),
            "window": {"minHours": 0, "maxHours": 1},
            "supportingEvidence": {
                "matchCount": trigger_count,
                "sampleSize": len(negative_moods)  # Fix 2: only negative moods, not all moods
            },
            "status": "active",
            "metadata": {"triggers": triggers}
        })
    return insights


def analyze_late_night_cluster(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    meals = context.get("meals", [])
    insights = []

    seven_days_ago = datetime.now() - timedelta(days=7)
    recent_meals = []
    for m in meals:
        try:
            m_time = datetime.fromisoformat(m["occurredAt"].replace('Z', '+00:00'))
            if m_time.replace(tzinfo=None) >= seven_days_ago.replace(tzinfo=None):
                recent_meals.append(m)
        except Exception:
            continue

    if not recent_meals: return []

    CUTOFF_HOUR = 21
    late_count = 0

    for meal in recent_meals:
        try:
            date = datetime.fromisoformat(meal["occurredAt"].replace('Z', '+00:00'))
            if date.hour >= CUTOFF_HOUR or date.hour < 4:
                late_count += 1
        except Exception:
            continue

    percentage = late_count / len(recent_meals) if recent_meals else 0

    if late_count >= 3 or percentage >= 0.30:
        confidence_score = min(0.90, 0.55 + percentage * 1.0)
        insights.append({
            "insightId": str(uuid.uuid4()),
            "type": "timing_pattern",
            "category": "lifestyle",
            "title": "Late Night Snacking",
            "summary": f"You logged {late_count} meals after 9:00 PM in the last 7 days.",
            "confidenceScore": confidence_score,
            "confidenceLevel": get_confidence_level(confidence_score),
            "window": {"minHours": 21, "maxHours": 4},
            "supportingEvidence": {
                "matchCount": late_count,
                "sampleSize": len(recent_meals)
            },
            "status": "active"
        })
    return insights


def analyze_weekday_weekend_shift(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    meals = context.get("meals", [])
    insights = []
    snacks = [m for m in meals if m.get("mealSlot") == "snack"]
    min_snacks = max(3, round(5 * context.get("freq_factor", 1.0)))
    if len(snacks) < min_snacks: return []

    weekday_snacks = 0
    weekend_snacks = 0
    weekday_days: set = set()
    weekend_days: set = set()

    for m in snacks:
        try:
            date = datetime.fromisoformat(m["occurredAt"].replace('Z', '+00:00'))
            day = date.weekday()
            day_str = date.date().isoformat()
            if day >= 5:
                weekend_snacks += 1
                weekend_days.add(day_str)
            else:
                weekday_snacks += 1
                weekday_days.add(day_str)
        except Exception:
            continue

    if not weekday_days or not weekend_days: return []

    weekday_freq = weekday_snacks / len(weekday_days)
    weekend_freq = weekend_snacks / len(weekend_days)

    ratio = weekend_freq / weekday_freq if weekday_freq > 0 else 2.0
    inv_ratio = weekday_freq / weekend_freq if weekend_freq > 0 else 2.0

    if ratio >= 1.5:
        score = 0.65
        insights.append({
            "insightId": str(uuid.uuid4()),
            "type": "behavior_shift",
            "category": "lifestyle",
            "title": "Weekend Snacking Shift",
            "summary": f"You snack {round(ratio, 1)}x more often on weekends than weekdays.",
            "confidenceScore": score,
            "confidenceLevel": get_confidence_level(score),
            "supportingEvidence": {
                "matchCount": weekend_snacks,
                "sampleSize": weekend_snacks + weekday_snacks,
                "weekdayFreq": round(weekday_freq, 2),
                "weekendFreq": round(weekend_freq, 2),
            },
            "status": "active"
        })
    elif inv_ratio >= 1.5:
        score = 0.65
        insights.append({
            "insightId": str(uuid.uuid4()),
            "type": "behavior_shift",
            "category": "lifestyle",
            "title": "Weekday Snacking Shift",
            "summary": f"You snack {round(inv_ratio, 1)}x more often on weekdays than weekends.",
            "confidenceScore": score,
            "confidenceLevel": get_confidence_level(score),
            "supportingEvidence": {
                "matchCount": weekday_snacks,
                "sampleSize": weekend_snacks + weekday_snacks,
                "weekdayFreq": round(weekday_freq, 2),
                "weekendFreq": round(weekend_freq, 2),
            },
            "status": "active"
        })
    return insights


def analyze_mood_correlations(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    meals = context.get("meals", [])
    moods = context.get("moods", [])
    insights = []
    if not moods: return []

    mood_dips = [m for m in moods if m.get("symptomType") == "mood" and m.get("severity", 0) < 0]
    min_dips = max(2, round(3 * context.get("freq_factor", 1.0)))
    if len(mood_dips) < min_dips: return []

    # Fix 1: compute baseline ingredient frequency across all meals
    baseline = compute_ingredient_baseline(meals)

    trigger_counter: Dict[str, int] = {}

    for dip in mood_dips:
        try:
            dip_time = datetime.fromisoformat(dip["occurredAt"].replace('Z', '+00:00'))
            meals_before = [
                m for m in meals
                if (lambda t: t < dip_time and (dip_time - t) <= timedelta(hours=4))(
                    datetime.fromisoformat(m["occurredAt"].replace('Z', '+00:00'))
                )
            ]
            seen_in_this_dip: set = set()
            for m in meals_before:
                for ing in m.get("confirmedIngredients", []):
                    if ing.get("confirmedStatus") not in ["removed", "suggested"]:
                        name = ing.get("canonicalName")
                        if name and name not in seen_in_this_dip:
                            trigger_counter[name] = trigger_counter.get(name, 0) + 1
                            seen_in_this_dip.add(name)
        except Exception:
            continue

    for ingredient, count in trigger_counter.items():
        if count >= 2:
            rate = count / len(mood_dips)
            # Fix 1: require lift >= 1.5 to rule out common staple foods
            lift = compute_lift(rate, baseline.get(ingredient, 0))
            if rate >= 0.5 and lift >= 1.5:
                score = min(0.9, 0.4 + rate * 0.5)
                insights.append({
                    "insightId": str(uuid.uuid4()),
                    "type": "mood_association",
                    "category": "mental_health",
                    "title": f"Mood & {ingredient}",
                    "summary": f"Your mood often dips after consuming meals containing {ingredient}.",
                    "confidenceScore": score,
                    "confidenceLevel": get_confidence_level(score),
                    "window": {"minHours": 0, "maxHours": 4},
                    "supportingEvidence": {"matchCount": count, "sampleSize": len(mood_dips)},
                    "status": "active"
                })
    return insights


def analyze_symptom_correlations(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    meals = context.get("meals", [])
    symptoms = context.get("symptoms", [])
    insights = []
    if not symptoms: return []

    # Fix 1: baseline for lift calculation
    baseline = compute_ingredient_baseline(meals)

    # Exclude mood dimensions — they live in the moods collection and have their own analyzers
    MOOD_DIMENSIONS = {"mood", "stress", "social", "energy", "focus", "sleep quality"}

    symptoms_by_type: Dict[str, list] = {}
    for s in symptoms:
        st = s.get("symptomType")
        sev = s.get("severity", 0)
        if not st or st in MOOD_DIMENSIONS:
            continue
        if sev < 2:
            continue
        if st not in symptoms_by_type:
            symptoms_by_type[st] = []
        symptoms_by_type[st].append(s)

    for symptom_type, events in symptoms_by_type.items():
        if len(events) < 2:
            continue

        trigger_counter: Dict[str, int] = {}
        for sym in events:
            try:
                sym_time = datetime.fromisoformat(sym["occurredAt"].replace('Z', '+00:00'))
                meals_before = [
                    m for m in meals
                    if (lambda t: t < sym_time and (sym_time - t) <= timedelta(hours=6))(
                        datetime.fromisoformat(m["occurredAt"].replace('Z', '+00:00'))
                    )
                ]
                seen_in_this_sym: set = set()
                for m in meals_before:
                    for ing in m.get("confirmedIngredients", []):
                        if ing.get("confirmedStatus") not in ["removed", "suggested"]:
                            name = ing.get("canonicalName")
                            if name and name not in seen_in_this_sym:
                                trigger_counter[name] = trigger_counter.get(name, 0) + 1
                                seen_in_this_sym.add(name)
            except Exception:
                continue

        if not trigger_counter:
            continue

        threshold = max(1, len(events) * 0.5)

        # Surface top 3 triggers per symptom type
        candidates = sorted(
            [(ing, cnt) for ing, cnt in trigger_counter.items() if cnt >= threshold],
            key=lambda x: x[1],
            reverse=True
        )[:3]

        for ingredient, count in candidates:
            rate = count / len(events)
            lift = compute_lift(rate, baseline.get(ingredient, 0))
            if lift < 1.5:
                continue

            # Find triggering meals to determine dominant meal slot
            trigger_meals_for_slot = []
            for sym in events:
                try:
                    sym_time = datetime.fromisoformat(sym["occurredAt"].replace('Z', '+00:00'))
                    for m in meals:
                        m_time = datetime.fromisoformat(m["occurredAt"].replace('Z', '+00:00'))
                        if m_time < sym_time and (sym_time - m_time) <= timedelta(hours=6):
                            for ing in m.get("confirmedIngredients", []):
                                if (ing.get("canonicalName") == ingredient and
                                        ing.get("confirmedStatus") not in ["removed", "suggested"]):
                                    trigger_meals_for_slot.append(m)
                                    break
                except Exception:
                    continue

            top_slot = get_top_meal_slot(trigger_meals_for_slot)
            slot_note = f" at {top_slot}" if top_slot != "mixed" else ""

            score = min(0.95, 0.5 + (count / len(events)) * 0.4)
            insights.append({
                "insightId": str(uuid.uuid4()),
                "type": "trigger_pattern",
                "category": "symptom",
                "title": f"Possible Trigger: {ingredient} and {symptom_type}",
                "summary": f"Your {symptom_type} often occurs 0–6 hours after eating {ingredient}{slot_note}.",
                "confidenceScore": score,
                "confidenceLevel": get_confidence_level(score),
                "window": {"minHours": 0, "maxHours": 6},
                "supportingEvidence": {"matchCount": count, "sampleSize": len(events)},
                "status": "active",
                "metadata": {"triggerIngredient": ingredient, "symptomType": symptom_type}
            })
    return insights


def analyze_positive_mood_ingredients(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    meals = context.get("meals", [])
    moods = context.get("moods", [])
    insights = []
    if not moods: return []

    high_moods = [m for m in moods if m.get("symptomType") == "mood" and m.get("severity", 0) >= 1]
    min_high = max(2, round(3 * context.get("freq_factor", 1.0)))
    if len(high_moods) < min_high: return []

    # Fix 1: baseline for lift calculation
    baseline = compute_ingredient_baseline(meals)

    presence_counter: Dict[str, int] = {}

    for mood in high_moods:
        try:
            mood_time = datetime.fromisoformat(mood["occurredAt"].replace('Z', '+00:00'))
            meals_before = [
                m for m in meals
                if (lambda t: t < mood_time and (mood_time - t) <= timedelta(hours=4))(
                    datetime.fromisoformat(m["occurredAt"].replace('Z', '+00:00'))
                )
            ]
            seen_in_this_mood: set = set()
            for m in meals_before:
                for ing in m.get("confirmedIngredients", []):
                    if ing.get("confirmedStatus") not in ["removed", "suggested"]:
                        name = ing.get("canonicalName")
                        if name and name not in seen_in_this_mood:
                            presence_counter[name] = presence_counter.get(name, 0) + 1
                            seen_in_this_mood.add(name)
        except Exception:
            continue

    for ingredient, count in presence_counter.items():
        if count >= 2:
            rate = count / len(high_moods)
            # Fix 1: lift check — protective ingredients must stand out from the baseline
            lift = compute_lift(rate, baseline.get(ingredient, 0))
            if rate >= 0.5 and lift >= 1.5:
                score = min(0.85, 0.3 + rate * 0.6)
                insights.append({
                    "insightId": str(uuid.uuid4()),
                    "type": "mood_boost",
                    "category": "mental_health",
                    "title": f"Mood Booster: {ingredient}",
                    "summary": f"Your mood is often elevated after eating meals containing {ingredient}.",
                    "confidenceScore": score,
                    "confidenceLevel": get_confidence_level(score),
                    "window": {"minHours": 0, "maxHours": 4},
                    "supportingEvidence": {"matchCount": count, "sampleSize": len(high_moods)},
                    "status": "active"
                })
    return insights


def analyze_delayed_symptom_triggers(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    meals = context.get("meals", [])
    symptoms = context.get("symptoms", [])
    insights = []
    if not symptoms: return []

    MOOD_DIMENSIONS = {"mood", "stress", "social", "energy", "focus", "sleep quality"}
    significant_symptoms = [
        s for s in symptoms
        if s.get("symptomType") not in MOOD_DIMENSIONS and s.get("severity", 0) >= 2
    ]
    if not significant_symptoms: return []

    # Fix 1+7: baseline for lift; higher lift threshold for noisy 6-24h window
    baseline = compute_ingredient_baseline(meals)

    symptoms_by_type: Dict[str, list] = {}
    for s in significant_symptoms:
        st = s.get("symptomType")
        if st not in symptoms_by_type:
            symptoms_by_type[st] = []
        symptoms_by_type[st].append(s)

    for symptom_type, events in symptoms_by_type.items():
        if len(events) < 2:
            continue

        trigger_counter: Dict[str, int] = {}
        for sym in events:
            try:
                sym_time = datetime.fromisoformat(sym["occurredAt"].replace('Z', '+00:00'))
                seen_in_this_sym: set = set()
                for m in meals:
                    m_time = datetime.fromisoformat(m["occurredAt"].replace('Z', '+00:00'))
                    td = sym_time - m_time
                    if timedelta(hours=6) <= td <= timedelta(hours=24):
                        for ing in m.get("confirmedIngredients", []):
                            if ing.get("confirmedStatus") not in ["removed", "suggested"]:
                                name = ing.get("canonicalName")
                                if name and name not in seen_in_this_sym:
                                    trigger_counter[name] = trigger_counter.get(name, 0) + 1
                                    seen_in_this_sym.add(name)
            except Exception:
                continue

        if not trigger_counter:
            continue

        top_trigger = max(trigger_counter, key=trigger_counter.get)
        top_count = trigger_counter[top_trigger]

        # Fix 7: raise match threshold from 0.6 → 0.75 for the noisier 6-24h window
        if top_count < max(2, len(events) * 0.75):
            continue

        event_rate = top_count / len(events)
        # Fix 7: require lift >= 2.0 (stricter than immediate triggers) for delayed window
        lift = compute_lift(event_rate, baseline.get(top_trigger, 0))
        if lift < 2.0:
            continue

        score = 0.7  # Delayed triggers carry inherently lower confidence due to window noise
        insights.append({
            "insightId": str(uuid.uuid4()),
            "type": "delayed_trigger",
            "category": "symptom",
            "title": f"Delayed Trigger: {top_trigger}",
            "summary": f"Your {symptom_type} often occurs 6-24 hours after consuming {top_trigger}. This might be a delayed reaction.",
            "confidenceScore": score,
            "confidenceLevel": get_confidence_level(score),
            "window": {"minHours": 6, "maxHours": 24},
            "supportingEvidence": {"matchCount": top_count, "sampleSize": len(events)},
            "status": "active",
            "metadata": {"triggerIngredient": top_trigger, "symptomType": symptom_type}  # Fix 8: dedup key
        })
    return insights


def analyze_energy_dip_ingredients(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Finds ingredients that frequently precede low-energy events (symptomType='energy', severity < 0)."""
    meals = context.get("meals", [])
    moods = context.get("moods", [])
    insights = []
    if not moods: return []

    low_energy = [m for m in moods if m.get("symptomType") == "energy" and m.get("severity", 0) < 0]
    min_energy = max(2, round(3 * context.get("freq_factor", 1.0)))
    if len(low_energy) < min_energy: return []

    baseline = compute_ingredient_baseline(meals)
    trigger_counter: Dict[str, int] = {}

    for event in low_energy:
        try:
            t = datetime.fromisoformat(event["occurredAt"].replace('Z', '+00:00'))
            seen: set = set()
            for m in meals:
                m_time = datetime.fromisoformat(m["occurredAt"].replace('Z', '+00:00'))
                if m_time < t and (t - m_time) <= timedelta(hours=4):
                    for ing in m.get("confirmedIngredients", []):
                        if ing.get("confirmedStatus") not in ["removed", "suggested"]:
                            name = ing.get("canonicalName")
                            if name and name not in seen:
                                trigger_counter[name] = trigger_counter.get(name, 0) + 1
                                seen.add(name)
        except Exception:
            continue

    for ingredient, count in trigger_counter.items():
        if count >= 2:
            rate = count / len(low_energy)
            lift = compute_lift(rate, baseline.get(ingredient, 0))
            if rate >= 0.5 and lift >= 1.5:
                score = min(0.85, 0.35 + rate * 0.5)
                insights.append({
                    "insightId": str(uuid.uuid4()),
                    "type": "energy_dip",
                    "category": "energy",
                    "title": f"Energy Dip After {ingredient}",
                    "summary": f"Your energy is often low within 4 hours of eating {ingredient}.",
                    "confidenceScore": score,
                    "confidenceLevel": get_confidence_level(score),
                    "window": {"minHours": 0, "maxHours": 4},
                    "supportingEvidence": {"matchCount": count, "sampleSize": len(low_energy)},
                    "status": "active",
                    "metadata": {"triggerIngredient": ingredient, "symptomType": "energy"}
                })
    return insights


def analyze_sleep_impact_ingredients(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Finds evening meal ingredients that frequently precede poor sleep quality."""
    meals = context.get("meals", [])
    moods = context.get("moods", [])
    insights = []
    if not moods: return []

    poor_sleep = [m for m in moods if m.get("symptomType") == "sleep quality" and m.get("severity", 0) < 0]
    min_sleep = max(2, round(3 * context.get("freq_factor", 1.0)))
    if len(poor_sleep) < min_sleep: return []

    baseline = compute_ingredient_baseline(meals)
    trigger_counter: Dict[str, int] = {}

    for event in poor_sleep:
        try:
            t = datetime.fromisoformat(event["occurredAt"].replace('Z', '+00:00'))
            seen: set = set()
            for m in meals:
                m_time = datetime.fromisoformat(m["occurredAt"].replace('Z', '+00:00'))
                td = t - m_time
                # Evening meals (after 5 PM) logged 2–8 hours before the sleep quality entry
                if timedelta(hours=2) <= td <= timedelta(hours=8) and m_time.hour >= 17:
                    for ing in m.get("confirmedIngredients", []):
                        if ing.get("confirmedStatus") not in ["removed", "suggested"]:
                            name = ing.get("canonicalName")
                            if name and name not in seen:
                                trigger_counter[name] = trigger_counter.get(name, 0) + 1
                                seen.add(name)
        except Exception:
            continue

    for ingredient, count in trigger_counter.items():
        if count >= 2:
            rate = count / len(poor_sleep)
            lift = compute_lift(rate, baseline.get(ingredient, 0))
            if rate >= 0.5 and lift >= 1.5:
                score = min(0.80, 0.35 + rate * 0.45)
                insights.append({
                    "insightId": str(uuid.uuid4()),
                    "type": "sleep_impact",
                    "category": "sleep",
                    "title": f"Sleep & {ingredient}",
                    "summary": f"Your sleep quality is often poor on nights when you ate {ingredient} in the evening.",
                    "confidenceScore": score,
                    "confidenceLevel": get_confidence_level(score),
                    "window": {"minHours": 2, "maxHours": 8},
                    "supportingEvidence": {"matchCount": count, "sampleSize": len(poor_sleep)},
                    "status": "active",
                    "metadata": {"triggerIngredient": ingredient, "symptomType": "sleep quality"}
                })
    return insights


# TODO: NEXT VERSION - Implement AI Pattern Recognition
# This will use the Gemini 1.5 Flash API to perform deep discovery across
# long-term logs (14-30 days) to identify non-obvious correlations
# between dietary patterns and health outcomes.
