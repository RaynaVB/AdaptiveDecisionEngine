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
    insights.extend(analyze_meal_type_mood_association(context))
    insights.extend(analyze_symptom_correlations(context))

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

def analyze_meal_type_mood_association(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    meals = context.get("meals", [])
    moods = context.get("moods", [])
    insights = []
    TARGET_TAGS = ["high_sugar", "fried_greasy", "heavy", "caffeinated", "sweet"]
    stats = {tag: {"total": 0, "drops": 0} for tag in TARGET_TAGS}

    sorted_meals = sorted(meals, key=lambda x: x.get("occurredAt", ""))
    sorted_moods = sorted(moods, key=lambda x: x.get("occurredAt", ""))

    for meal in sorted_meals:
        tags = meal.get("mealTypeTags", [])
        present_targets = [t for t in tags if t in TARGET_TAGS]
        if present_targets:
            try:
                meal_time = datetime.fromisoformat(meal["occurredAt"].replace('Z', '+00:00'))
                sub_moods = []
                for m in sorted_moods:
                    m_time = datetime.fromisoformat(m["occurredAt"].replace('Z', '+00:00'))
                    if meal_time < m_time <= meal_time + timedelta(hours=4):
                        sub_moods.append(m)
                
                if sub_moods:
                    has_negative = False
                    for m in sub_moods:
                        stype = m.get("symptomType", "").lower()
                        sev = m.get("severity", 0)
                        if stype == "mood" and sev < 0:
                            has_negative = True
                            break
                        if stype == "stress" and sev > 0:
                            has_negative = True
                            break

                    for tag in present_targets:
                        stats[tag]["total"] += 1
                        if has_negative: stats[tag]["drops"] += 1
            except Exception:
                continue

    for tag, s in stats.items():
        if s["total"] >= 3:
            rate = s["drops"] / s["total"]
            if rate >= 0.60:
                score = rate
                insights.append({
                    "insightId": str(uuid.uuid4()),
                    "type": "mood_association",
                    "category": "mental_health",
                    "title": f"{tag.replace('_', ' ').capitalize()} & Mood",
                    "summary": f"{int(rate * 100)}% of '{tag.replace('_', ' ')}' meals are followed by negative mood within 4 hours.",
                    "confidenceScore": score,
                    "confidenceLevel": get_confidence_level(score),
                    "window": {"minHours": 0, "maxHours": 4},
                    "supportingEvidence": {"matchCount": s["drops"], "sampleSize": s["total"]},
                    "status": "active"
                })
    return insights

def analyze_symptom_correlations(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    meals = context.get("meals", [])
    symptoms = context.get("symptoms", [])
    insights = []
    if not symptoms: return []

    symptoms_by_type = {}
    for s in symptoms:
        st = s.get("symptomType")
        if st not in symptoms_by_type: symptoms_by_type[st] = []
        symptoms_by_type[st].append(s)

    for symptom_type, events in symptoms_by_type.items():
        if len(events) >= 2:
            meals_before_count = 0
            tag_counter = {}
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
                            for tag in m.get("mealTypeTags", []):
                                tag_counter[tag] = tag_counter.get(tag, 0) + 1
                except Exception:
                    continue
            
            if meals_before_count > 0 and tag_counter:
                top_tag = max(tag_counter, key=tag_counter.get)
                if tag_counter[top_tag] >= max(1, len(events) * 0.5):
                    score = 0.75 # Placeholder scoring logic
                    insights.append({
                        "insightId": str(uuid.uuid4()),
                        "type": "trigger_pattern",
                        "category": "symptom",
                        "title": f"Possible Trigger: {top_tag} and {symptom_type}",
                        "summary": f"We noticed that your {symptom_type} often occurs 0-6 hours after logging {top_tag} meals.",
                        "confidenceScore": score,
                        "confidenceLevel": get_confidence_level(score),
                        "window": {"minHours": 0, "maxHours": 6},
                        "supportingEvidence": {"matchCount": tag_counter[top_tag], "sampleSize": len(events)},
                        "status": "active"
                    })
    return insights
