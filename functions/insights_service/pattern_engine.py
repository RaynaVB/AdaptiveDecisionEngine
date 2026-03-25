import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

def run_pattern_engine(meals: List[Dict[str, Any]], moods: List[Dict[str, Any]], symptoms: List[Dict[str, Any]] = []) -> List[Dict[str, Any]]:
    context = {"meals": meals, "moods": moods, "symptoms": symptoms}
    insights = []

    # Run each analyzer and convert to Insight format
    insights.extend(analyze_mood_dip_then_eat(context))
    insights.extend(analyze_late_night_cluster(context))
    insights.extend(analyze_weekday_weekend_shift(context))
    insights.extend(analyze_mood_correlations(context))
    insights.extend(analyze_positive_mood_ingredients(context))
    insights.extend(analyze_symptom_correlations(context))
    insights.extend(analyze_delayed_symptom_triggers(context))

    return insights

def get_confidence_level(score: float) -> str:
    if score >= 0.8: return "high"
    if score >= 0.5: return "medium"
    return "low"

def analyze_mood_dip_then_eat(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    meals = context.get("meals", [])
    moods = context.get("moods", [])
    insights = []

    WINDOW_MS = 60 * 60 * 1000
    sorted_moods = sorted(moods, key=lambda x: x.get("occurredAt", ""))
    sorted_meals = sorted(meals, key=lambda x: x.get("occurredAt", ""))

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
                "sampleSize": len(moods)
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
        confidence_score = 0.85
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
    # Ported from original but adapted to Insight format
    meals = context.get("meals", [])
    insights = []
    snacks = [m for m in meals if m.get("mealSlot") == "snack"]
    if len(snacks) < 5: return []

    weekday_snacks = 0
    weekend_snacks = 0
    weekday_days = set()
    weekend_days = set()

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
            "supportingEvidence": {"weekdayFreq": weekday_freq, "weekendFreq": weekend_freq, "ratio": ratio},
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
            "supportingEvidence": {"weekdayFreq": weekday_freq, "weekendFreq": weekend_freq, "ratio": inv_ratio},
            "status": "active"
        })
    return insights

def analyze_mood_correlations(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    meals = context.get("meals", [])
    moods = context.get("moods", [])
    insights = []
    if not moods: return []

    # Map moods to identify severe dips (severity < 0 for bipolar -2 to 2)
    mood_dips = [m for m in moods if m.get("symptomType") == "mood" and m.get("severity", 0) < 0]
    if len(mood_dips) < 2: return []

    trigger_counter = {}

    for dip in mood_dips:
        try:
            dip_time = datetime.fromisoformat(dip["occurredAt"].replace('Z', '+00:00'))
            # Find meals 0-4 hours before the mood dip
            meals_before = []
            for m in meals:
                m_time = datetime.fromisoformat(m["occurredAt"].replace('Z', '+00:00'))
                if m_time < dip_time and (dip_time - m_time) <= timedelta(hours=4):
                    meals_before.append(m)
            
            seen_in_this_dip = set()
            for m in meals_before:
                # Correlate with ingredients
                for ing in m.get("confirmedIngredients", []):
                    if ing.get("confirmedStatus") not in ["removed", "suggested"]:
                        name = ing.get("canonicalName")
                        if name and name not in seen_in_this_dip:
                            trigger_counter[name] = trigger_counter.get(name, 0) + 1
                            seen_in_this_dip.add(name)
        except Exception:
            continue

    # Identify significant correlations
    for ingredient, count in trigger_counter.items():
        if count >= 2:
            # Simple heuristic: if ingredient is present in 50% of mood dips
            rate = count / len(mood_dips)
            if rate >= 0.5:
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

    # Map symptoms by type and filter for significant severity (>= 2 for unipolar 1-3)
    symptoms_by_type = {}
    for s in symptoms:
        st = s.get("symptomType")
        sev = s.get("severity", 0)
        
        # Only correlate moderate-to-high severity physical symptoms
        # For mood, we focus on negative dips in analyze_mood_dip_then_eat
        if st != "mood" and sev < 2:
            continue
            
        if st not in symptoms_by_type: symptoms_by_type[st] = []
        symptoms_by_type[st].append(s)

    for symptom_type, events in symptoms_by_type.items():
        if len(events) >= 2:
            meals_before_count = 0
            trigger_counter = {}
            for sym in events:
                try:
                    sym_time = datetime.fromisoformat(sym["occurredAt"].replace('Z', '+00:00'))
                    meals_before = []
                    for m in meals:
                        m_time = datetime.fromisoformat(m["occurredAt"].replace('Z', '+00:00'))
                        if m_time < sym_time and (sym_time - m_time) <= timedelta(hours=6):
                            meals_before.append(m)
                    
                    if meals_before:
                        meals_before_count += 1
                        for m in meals_before:
                            # 1. Check legacy mealTypeTags
                            for tag in m.get("mealTypeTags", []):
                                trigger_counter[tag] = trigger_counter.get(tag, 0) + 1
                            
                            # 2. Check new confirmedIngredients
                            for ing in m.get("confirmedIngredients", []):
                                if ing.get("confirmedStatus") not in ["removed", "suggested"]:
                                    name = ing.get("canonicalName")
                                    if name:
                                        trigger_counter[name] = trigger_counter.get(name, 0) + 1
                                        
                except Exception:
                    continue
            
            if meals_before_count > 0 and trigger_counter:
                top_trigger = max(trigger_counter, key=trigger_counter.get)
                if trigger_counter[top_trigger] >= max(1, len(events) * 0.5):
                    score = min(0.95, 0.5 + (trigger_counter[top_trigger] / len(events)) * 0.4)
                    insights.append({
                        "insightId": str(uuid.uuid4()),
                        "type": "trigger_pattern",
                        "category": "symptom",
                        "title": f"Possible Trigger: {top_trigger} and {symptom_type}",
                        "summary": f"We noticed that your {symptom_type} often occurs 0-6 hours after logging {top_trigger}.",
                        "confidenceScore": score,
                        "confidenceLevel": get_confidence_level(score),
                        "window": {"minHours": 0, "maxHours": 6},
                        "supportingEvidence": {"matchCount": trigger_counter[top_trigger], "sampleSize": len(events)},
                        "status": "active"
                    })
    return insights

def analyze_positive_mood_ingredients(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    meals = context.get("meals", [])
    moods = context.get("moods", [])
    insights = []
    if not moods: return []

    # Identify high mood states (severity >= 1 for bipolar -2 to 2)
    high_moods = [m for m in moods if m.get("symptomType") == "mood" and m.get("severity", 0) >= 1]
    if len(high_moods) < 2: return []

    presence_counter = {}

    for mood in high_moods:
        try:
            mood_time = datetime.fromisoformat(mood["occurredAt"].replace('Z', '+00:00'))
            # Find meals 0-4 hours before the high mood
            meals_before = []
            for m in meals:
                m_time = datetime.fromisoformat(m["occurredAt"].replace('Z', '+00:00'))
                if m_time < mood_time and (mood_time - m_time) <= timedelta(hours=4):
                    meals_before.append(m)
            
            seen_in_this_mood = set()
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
            if rate >= 0.5:
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

    # Filter for significant symptoms (severity >= 2)
    significant_symptoms = [s for s in symptoms if s.get("symptomType") != "mood" and s.get("severity", 0) >= 2]
    if not significant_symptoms: return []

    symptoms_by_type = {}
    for s in significant_symptoms:
        st = s.get("symptomType")
        if st not in symptoms_by_type: symptoms_by_type[st] = []
        symptoms_by_type[st].append(s)

    for symptom_type, events in symptoms_by_type.items():
        if len(events) >= 2:
            trigger_counter = {}
            for sym in events:
                try:
                    sym_time = datetime.fromisoformat(sym["occurredAt"].replace('Z', '+00:00'))
                    # Look for meals 6-24 hours before
                    for m in meals:
                        m_time = datetime.fromisoformat(m["occurredAt"].replace('Z', '+00:00'))
                        td = sym_time - m_time
                        if timedelta(hours=6) <= td <= timedelta(hours=24):
                            for ing in m.get("confirmedIngredients", []):
                                if ing.get("confirmedStatus") not in ["removed", "suggested"]:
                                    name = ing.get("canonicalName")
                                    if name:
                                        trigger_counter[name] = trigger_counter.get(name, 0) + 1
                except Exception:
                    continue
            
            if trigger_counter:
                top_trigger = max(trigger_counter, key=trigger_counter.get)
                if trigger_counter[top_trigger] >= max(2, len(events) * 0.6):
                    score = 0.7 # Lower confidence for delayed triggers due to noise
                    insights.append({
                        "insightId": str(uuid.uuid4()),
                        "type": "delayed_trigger",
                        "category": "symptom",
                        "title": f"Delayed Trigger: {top_trigger}",
                        "summary": f"Your {symptom_type} often occurs 6-24 hours after consuming {top_trigger}. This might be a delayed reaction.",
                        "confidenceScore": score,
                        "confidenceLevel": get_confidence_level(score),
                        "window": {"minHours": 6, "maxHours": 24},
                        "supportingEvidence": {"matchCount": trigger_counter[top_trigger], "sampleSize": len(events)},
                        "status": "active"
                    })
    return insights

# TODO: NEXT VERSION - Implement AI Pattern Recognition
# This will use the Gemini 1.5 Flash API to perform deep discovery across
# long-term logs (14-30 days) to identify non-obvious correlations
# between dietary patterns and health outcomes.
