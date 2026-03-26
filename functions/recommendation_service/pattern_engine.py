import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

def compute_ingredient_baseline(meals: List[Dict[str, Any]]) -> Dict[str, float]:
    """Returns fraction of meals (0.0–1.0) that contain each ingredient."""
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
        return 2.0 if event_rate >= 0.4 else 1.0
    return event_rate / baseline_rate


def run_pattern_engine(meals: List[Dict[str, Any]], moods: List[Dict[str, Any]], symptoms: List[Dict[str, Any]] = []) -> List[Dict[str, Any]]:
    context = {"meals": meals, "moods": moods, "symptoms": symptoms}
    patterns = []

    # Run each analyzer
    patterns.extend(analyze_mood_dip_then_eat(context))
    patterns.extend(analyze_late_night_cluster(context))
    patterns.extend(analyze_weekday_weekend_shift(context))
    patterns.extend(analyze_meal_type_mood_association(context))
    patterns.extend(analyze_symptom_correlations(context))
    patterns.extend(analyze_mood_boost_ingredients(context))
    patterns.extend(analyze_delayed_symptom_triggers(context))

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
    stats = {}
    # Fix 1: baseline for lift calculation
    baseline = compute_ingredient_baseline(meals)

    sorted_meals = sorted(meals, key=lambda x: x.get("occurredAt", ""))
    sorted_moods = sorted(moods, key=lambda x: x.get("occurredAt", ""))

    for meal in sorted_meals:
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

                if has_negative:
                    # Check confirmedIngredients
                    for ing in meal.get("confirmedIngredients", []):
                        if ing.get("confirmedStatus") not in ["removed", "suggested"]:
                            name = ing.get("canonicalName")
                            if name:
                                if name not in stats: stats[name] = {"total": 0, "drops": 0}
                                stats[name]["total"] += 1
                                if has_negative: stats[name]["drops"] += 1
        except Exception:
            continue

    for tag, s in stats.items():
        if s["total"] >= 3:
            rate = s["drops"] / s["total"]
            # Fix 1: lift check — tag must be elevated before mood drops vs. overall frequency
            lift = compute_lift(rate, baseline.get(tag, 0))
            if rate >= 0.60 and lift >= 1.5:
                # It's an ingredient
                triggering_meals = []
                for m in sorted_meals:
                    for ing in m.get("confirmedIngredients", []):
                        if ing.get("canonicalName") == tag:
                            triggering_meals.append(m)
                            break

                title = f"Mood & {tag}"
                desc = f"Your mood often dips after consuming meals containing {tag}."

                patterns.append({
                    "id": str(uuid.uuid4()),
                    "patternType": "meal_type_mood_association",
                    "title": title,
                    "description": desc,
                    "confidence": "high" if rate >= 0.8 else "medium",
                    "evidence": {"tag": tag, "total_count": s["total"], "drop_count": s["drops"], "rate": round(rate, 2)},
                    "segmentation": calculate_segmentation(triggering_meals),
                    "createdAt": datetime.now().isoformat()
                })
    return patterns

def analyze_symptom_correlations(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    meals = context.get("meals", [])
    symptoms = context.get("symptoms", [])
    patterns = []
    if not symptoms: return []

    # Fix 1: baseline for lift calculation
    baseline = compute_ingredient_baseline(meals)

    symptoms_by_type = {}
    for s in symptoms:
        st = s.get("symptomType")
        sev = s.get("severity", 0)

        # Only correlate moderate-to-high severity physical symptoms (1-3 scale)
        if st != "mood" and sev < 2:
            continue

        if st not in symptoms_by_type: symptoms_by_type[st] = []
        symptoms_by_type[st].append(s)

    for symptom_type, events in symptoms_by_type.items():
        if len(events) >= 2:
            tag_counter = {}
            for sym in events:
                try:
                    sym_time = datetime.fromisoformat(sym["occurredAt"].replace('Z', '+00:00'))
                    meals_before = [
                        m for m in meals
                        if (lambda t: t < sym_time and (sym_time - t) <= timedelta(hours=6))(
                            datetime.fromisoformat(m["occurredAt"].replace('Z', '+00:00'))
                        )
                    ]
                    # Fix: seen set per symptom event so multi-meal windows don't inflate counts
                    seen_in_this_sym: set = set()
                    for m in meals_before:
                        for ing in m.get("confirmedIngredients", []):
                            if ing.get("confirmedStatus") not in ["removed", "suggested"]:
                                name = ing.get("canonicalName")
                                if name and name not in seen_in_this_sym:
                                    tag_counter[name] = tag_counter.get(name, 0) + 1
                                    seen_in_this_sym.add(name)
                except Exception:
                    continue

            if tag_counter:
                top_trigger = max(tag_counter, key=tag_counter.get)
                top_count = tag_counter[top_trigger]
                if top_count >= max(1, len(events) * 0.5):
                    event_rate = top_count / len(events)
                    # Fix 1: lift check — ingredient must be elevated before symptoms
                    lift = compute_lift(event_rate, baseline.get(top_trigger, 0))
                    if lift < 1.5:
                        continue

                    triggering_meals = []
                    for m in meals:
                        for ing in m.get("confirmedIngredients", []):
                            if ing.get("canonicalName") == top_trigger:
                                triggering_meals.append(m)
                                break

                    patterns.append({
                        "id": str(uuid.uuid4()),
                        "patternType": "symptom_correlation",
                        "title": f"Possible Trigger: {top_trigger}",
                        "description": f"We noticed that your {symptom_type} often occurs 0-6 hours after logging {top_trigger}.",
                        "confidence": "medium",
                        "severity": "medium",
                        "evidence": {"symptomCount": len(events), "matches": top_count, "trigger": top_trigger, "symptom_type": symptom_type},
                        "segmentation": calculate_segmentation(triggering_meals),
                        "createdAt": datetime.now().isoformat()
                    })
    return patterns

def analyze_mood_boost_ingredients(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    meals = context.get("meals", [])
    moods = context.get("moods", [])
    patterns = []
    if not moods: return []

    # Identify high mood states (severity >= 1 for bipolar -2 to 2)
    high_moods = [m for m in moods if m.get("symptomType") == "mood" and m.get("severity", 0) >= 1]
    if len(high_moods) < 2: return []

    # Fix 1: baseline for lift calculation
    baseline = compute_ingredient_baseline(meals)
    presence_counter = {}

    for mood in high_moods:
        try:
            mood_time = datetime.fromisoformat(mood["occurredAt"].replace('Z', '+00:00'))
            meals_before = []
            for m in meals:
                m_time = datetime.fromisoformat(m["occurredAt"].replace('Z', '+00:00'))
                if m_time < mood_time and (mood_time - m_time) <= timedelta(hours=4):
                    meals_before.append(m)
            
            seen_in_this_mood = set()
            for m in meals_before:
                # Check ingredients
                for ing in m.get("confirmedIngredients", []):
                    if ing.get("confirmedStatus") not in ["removed", "suggested"]:
                        name = ing.get("canonicalName")
                        if name and name not in seen_in_this_mood:
                            presence_counter[name] = presence_counter.get(name, 0) + 1
                            seen_in_this_mood.add(name)
        except Exception:
            continue

    for trigger, count in presence_counter.items():
        if count >= 2:
            rate = count / len(high_moods)
            # Fix 1: lift check — ingredient must be elevated before good moods vs. baseline
            lift = compute_lift(rate, baseline.get(trigger, 0))
            if rate >= 0.5 and lift >= 1.5:
                triggering_meals = []
                for m in meals:
                    for ing in m.get("confirmedIngredients", []):
                        if ing.get("canonicalName") == trigger:
                            triggering_meals.append(m)
                            break

                patterns.append({
                    "id": str(uuid.uuid4()),
                    "patternType": "mood_boost",
                    "title": f"Mood Booster: {trigger}",
                    "description": f"Your mood is often elevated after eating meals containing {trigger}.",
                    "confidence": "medium",
                    "severity": "low",
                    "evidence": {"matchCount": count, "sampleSize": len(high_moods), "trigger": trigger},
                    "segmentation": calculate_segmentation(triggering_meals),
                    "createdAt": datetime.now().isoformat()
                })
    return patterns

def analyze_delayed_symptom_triggers(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    meals = context.get("meals", [])
    symptoms = context.get("symptoms", [])
    patterns = []
    if not symptoms: return []

    # Filter for significant symptoms (severity >= 2)
    significant_symptoms = [s for s in symptoms if s.get("symptomType") != "mood" and s.get("severity", 0) >= 2]
    if not significant_symptoms: return []

    # Fix 1+7: baseline for lift; higher lift threshold for noisy 6-24h window
    baseline = compute_ingredient_baseline(meals)

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
                    # Fix: seen set per event to prevent multi-meal inflation
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

            if trigger_counter:
                top_trigger = max(trigger_counter, key=trigger_counter.get)
                top_count = trigger_counter[top_trigger]
                # Fix 7: raise threshold from 0.6 → 0.75 for the noisier 6-24h window
                if top_count < max(2, len(events) * 0.75):
                    continue

                event_rate = top_count / len(events)
                # Fix 7: require lift >= 2.0 — stricter threshold for delayed window
                lift = compute_lift(event_rate, baseline.get(top_trigger, 0))
                if lift < 2.0:
                    continue

                triggering_meals = []
                for m in meals:
                    for ing in m.get("confirmedIngredients", []):
                        if ing.get("canonicalName") == top_trigger:
                            triggering_meals.append(m)
                            break

                patterns.append({
                    "id": str(uuid.uuid4()),
                    "patternType": "delayed_trigger",
                    "title": f"Delayed Trigger: {top_trigger}",
                    "description": f"Your {symptom_type} often occurs 6-24 hours after consuming {top_trigger}.",
                    "confidence": "low",  # Delayed triggers are noisier
                    "severity": "medium",
                    "evidence": {"matchCount": top_count, "sampleSize": len(events), "trigger": top_trigger, "symptom_type": symptom_type},
                    "segmentation": calculate_segmentation(triggering_meals),
                    "createdAt": datetime.now().isoformat()
                })
    return patterns
