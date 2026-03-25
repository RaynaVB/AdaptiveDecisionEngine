import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

def run_pattern_engine(meals: List[Dict[str, Any]], moods: List[Dict[str, Any]], symptoms: List[Dict[str, Any]] = []) -> List[Dict[str, Any]]:
    context = {"meals": meals, "moods": moods, "symptoms": symptoms}
    patterns = []

    # Run each analyzer
    patterns.extend(analyze_mood_dip_then_eat(context))
    patterns.extend(analyze_late_night_cluster(context))
    patterns.extend(analyze_weekday_weekend_shift(context))
    patterns.extend(analyze_meal_type_mood_association(context))
    patterns.extend(analyze_symptom_correlations(context))

    return patterns

def calculate_segmentation(events: List[Dict[str, Any]]) -> Optional[Dict[str, str]]:
    if not events:
        return None

    morning = 0
    afternoon = 0
    night = 0
    late_night = 0
    weekday = 0
    weekend = 0

    for e in events:
        try:
            d = datetime.fromisoformat(e["occurredAt"].replace('Z', '+00:00'))
            h = d.hour
            day = d.weekday() # 0-6, Mon-Sun

            if 5 <= h < 11: morning += 1
            elif 11 <= h < 17: afternoon += 1
            elif 17 <= h <= 23: night += 1
            else: late_night += 1

            if day >= 5: weekend += 1 # Sat, Sun
            else: weekday += 1
        except Exception:
            continue

    total = len(events)
    if total == 0: return None

    time_of_day = "mixed"
    if morning / total > 0.6: time_of_day = "morning"
    elif afternoon / total > 0.6: time_of_day = "afternoon"
    elif night / total > 0.6: time_of_day = "night"
    elif late_night / total > 0.6: time_of_day = "late_night"

    day_type = "mixed"
    if weekday / total > 0.8: day_type = "weekday"
    elif weekend / total > 0.6: day_type = "weekend"

    return {"timeOfDay": time_of_day, "dayType": day_type}

def analyze_mood_dip_then_eat(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    meals = context.get("meals", [])
    moods = context.get("moods", [])
    patterns = []

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
        triggering_meals = [m for m in meals if any(t["mealId"] == m.get("id") for t in triggers)]
        patterns.append({
            "id": str(uuid.uuid4()),
            "patternType": "mood_dip_then_eat",
            "title": "Mood Dip Trigger",
            "description": f"{trigger_count} instances of high stress or negative mood followed by eating within 60 minutes.",
            "confidence": "high" if trigger_count >= 3 else "medium",
            "severity": "medium",
            "evidence": {
                "trigger_count": trigger_count,
                "window_minutes": 60,
                "triggers": triggers
            },
            "segmentation": calculate_segmentation(triggering_meals),
            "createdAt": datetime.now().isoformat()
        })
    return patterns

def analyze_late_night_cluster(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    meals = context.get("meals", [])
    patterns = []
    
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
    triggering_meals = []

    for meal in recent_meals:
        try:
            date = datetime.fromisoformat(meal["occurredAt"].replace('Z', '+00:00'))
            if date.hour >= CUTOFF_HOUR or date.hour < 4:
                late_count += 1
                triggering_meals.append(meal)
        except Exception:
            continue

    percentage = late_count / len(recent_meals)

    if late_count >= 3 or percentage >= 0.30:
        patterns.append({
            "id": str(uuid.uuid4()),
            "patternType": "late_night_eating_cluster",
            "title": "Late Night Snacking",
            "description": f"You logged {late_count} meals after 9:00 PM in the last 7 days.",
            "confidence": "high",
            "severity": "medium",
            "evidence": {
                "late_meal_count": late_count,
                "cutoff_time": "21:00",
                "total_weekly_meals": len(recent_meals),
                "percentage": round(percentage, 2)
            },
            "segmentation": calculate_segmentation(triggering_meals),
            "createdAt": datetime.now().isoformat()
        })
    return patterns

def analyze_weekday_weekend_shift(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    meals = context.get("meals", [])
    patterns = []
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
        patterns.append({
            "id": str(uuid.uuid4()),
            "patternType": "weekday_weekend_shift",
            "title": "Weekend Snacking Shift",
            "description": f"You snack {round(ratio, 1)}x more often on weekends than weekdays.",
            "confidence": "medium",
            "evidence": {"weekday_freq": weekday_freq, "weekend_freq": weekend_freq, "ratio": round(ratio, 2)},
            "createdAt": datetime.now().isoformat()
        })
    elif inv_ratio >= 1.5:
        patterns.append({
            "id": str(uuid.uuid4()),
            "patternType": "weekday_weekend_shift",
            "title": "Weekday Snacking Shift",
            "description": f"You snack {round(inv_ratio, 1)}x more often on weekdays than weekends.",
            "confidence": "medium",
            "evidence": {"weekday_freq": weekday_freq, "weekend_freq": weekend_freq, "ratio": round(inv_ratio, 2)},
            "createdAt": datetime.now().isoformat()
        })
    return patterns

def analyze_meal_type_mood_association(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    meals = context.get("meals", [])
    moods = context.get("moods", [])
    patterns = []
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
                triggering_meals = [m for m in sorted_meals if tag in m.get("mealTypeTags", [])]
                patterns.append({
                    "id": str(uuid.uuid4()),
                    "patternType": "meal_type_mood_association",
                    "title": f"{tag.replace('_', ' ').capitalize()} & Mood",
                    "description": f"{int(rate * 100)}% of '{tag.replace('_', ' ')}' meals are followed by negative mood within 4 hours.",
                    "confidence": "high" if rate >= 0.8 else "medium",
                    "evidence": {"tag": tag, "total_tag_count": s["total"], "mood_drop_count": s["drops"], "rate": round(rate, 2)},
                    "segmentation": calculate_segmentation(triggering_meals),
                    "createdAt": datetime.now().isoformat()
                })
    return patterns

def analyze_symptom_correlations(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    meals = context.get("meals", [])
    symptoms = context.get("symptoms", [])
    patterns = []
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
                    patterns.append({
                        "id": str(uuid.uuid4()),
                        "patternType": "symptom_correlation",
                        "title": f"Possible Trigger: {top_tag} and {symptom_type}",
                        "description": f"We noticed that your {symptom_type} often occurs 0-6 hours after logging {top_tag} meals.",
                        "confidence": "medium",
                        "severity": "medium",
                        "evidence": {"symptomCount": len(events), "mealsCorrelatedCount": tag_counter[top_tag], "tag": top_tag},
                        "createdAt": datetime.now().isoformat()
                    })
    return patterns
