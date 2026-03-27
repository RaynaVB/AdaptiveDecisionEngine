import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from action_library import ACTION_LIBRARY, ActionTemplate
from scoring import calculate_scores
from ranker import rank_recommendations
from ml.bandit_model import ContextualBandit
from ml.context_builder import build_context_vector

def run_recommendation_engine(
    db: Any,
    user_id: str,
    patterns: List[Dict[str, Any]],
    context: Dict[str, Any],
    rejection_rates: Dict[str, float] = {},
    latest_rejections: Dict[str, str] = {},
    latest_insights: List[Dict[str, Any]] = [],
    user_profile: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    # Normalize latest_insights to match Pattern structure for the candidate loop
    normalized_insights = []
    type_mapping = {
        "mood_trigger": "mood_dip_then_eat",
        "timing_pattern": "late_night_eating_cluster",
        "behavior_shift": "weekday_weekend_shift",
        "mood_association": "meal_type_mood_association",
        "trigger_pattern": "symptom_correlation",
        "mood_boost": "mood_boost",
        "delayed_trigger": "delayed_trigger"
    }
    
    for ins in latest_insights:
        normalized_insights.append({
            "id": ins.get("insightId"),
            "patternType": type_mapping.get(ins.get("type"), "unknown"),
            "confidence": ins.get("confidenceLevel"),
            "source": "stable_insight"
        })

    # Combine fresh patterns and stable insights.
    # Fresh patterns take priority; stable insights fill in any pattern types not yet detected fresh.
    # Fix 3: deduplicate by patternType so the same template cannot fire twice from both sources.
    seen_pattern_types: set = set()
    all_patterns = []
    for p in patterns + normalized_insights:
        pt = p.get("patternType")
        if pt not in seen_pattern_types:
            seen_pattern_types.add(pt)
            all_patterns.append(p)
    
    candidates = []
    meal_count = len(context.get("meals", []))
    mood_count = len(context.get("moods", []))

    # Initialize Bandit Model
    bandit = ContextualBandit(db, user_id)
    bandit.ensure_loaded()
    
    target_time_ms = int(datetime.now().timestamp() * 1000)
    current_context = build_context_vector(target_time_ms, context.get("moods", []))

    for pattern in all_patterns:
        pattern_type = pattern.get("patternType")
        applicable_templates = [
            t for t in ACTION_LIBRARY 
            if pattern_type in t["applicablePatternTypes"]
        ]

        for template in applicable_templates:
            # Confidence check
            if get_confidence_value(pattern.get("confidence")) < get_confidence_value(template["minPatternConfidence"]):
                continue
            
            # Event count check
            if meal_count < template["minMealEventsInWindow"]:
                continue
            if mood_count < template["minMoodEventsInWindow"]:
                continue

            # Cooldown check (5 days) — don't resurface a rejected/dismissed
            # recommendation until enough time has passed for it to feel fresh.
            latest_rejection_str = latest_rejections.get(template["id"])
            if latest_rejection_str:
                try:
                    rejection_time = datetime.fromisoformat(latest_rejection_str.replace('Z', '+00:00'))
                    days_since = (datetime.now().astimezone() - rejection_time).total_seconds() / 86400
                    if days_since < 5:
                        continue
                except Exception:
                    pass

            rejection_rate = rejection_rates.get(template["recommendationType"], 0.0)
            ml_score = bandit.predict(template["id"], current_context)
            
            scores = calculate_scores(template, pattern, rejection_rate, ml_score)

            # Map confidence value to level
            conf_val = get_confidence_value(pattern.get("confidence"))
            conf_level = 'low'
            if conf_val == 3: conf_level = 'high'
            elif conf_val == 2: conf_level = 'medium'

            why_this = format_template(template["whyTemplate"], pattern)

            candidates.append({
                "id": str(uuid.uuid4()),
                "templateId": template["id"],
                "type": template["recommendationType"],
                "category": template.get("category", "general"), # Default if not in template
                "title": format_template(template["titleTemplate"], pattern),
                "summary": format_template(template.get("summaryTemplate", template["actionTemplate"]), pattern),
                "confidenceScore": scores["confidence"],
                "confidenceLevel": conf_level,
                "priorityScore": scores["total"],
                "whyThis": [
                    {"kind": "pattern", "label": why_this}
                ],
                "cta": {
                    "type": template.get("ctaType", "view_details"),
                    "label": template.get("ctaLabel", "Take Action"),
                    "payload": {"experimentId": template.get("associatedExperimentId")} if template.get("associatedExperimentId") else {}
                },
                "action": {
                    "state": "none"
                },
                "linkedPatternIds": [pattern.get("id")],
                "scores": scores,
                "associatedExperimentId": template.get("associatedExperimentId"),
                "createdAt": datetime.now().isoformat()
            })

    if not candidates:
        safe_templates = [t for t in ACTION_LIBRARY if t["id"].startswith("safe_")]
        for template in safe_templates:
            rec_id = str(uuid.uuid4())
            candidates.append({
                "id": rec_id,
                "templateId": template["id"],
                "userId": user_id,
                "generationId": "fallback", # Placeholder for fallback
                "type": template["recommendationType"],
                "category": template.get("category", "general"),
                "title": template["titleTemplate"],
                "summary": template.get("summaryTemplate", template["actionTemplate"]),
                "confidenceScore": 0.5,
                "confidenceLevel": "medium",
                "priorityScore": 0.6,
                "whyThis": [
                    {"kind": "safe_fallback", "label": template["whyTemplate"]}
                ],
                "cta": {
                    "type": template.get("ctaType", "view_details"),
                    "label": template.get("ctaLabel", "Take Action"),
                    "payload": {"experimentId": template.get("associatedExperimentId")} if template.get("associatedExperimentId") else {}
                },
                "action": {
                    "state": "none"
                },
                "linkedPatternIds": [],
                "scores": {
                    "impact": 0.3,
                    "feasibility": 1.0,
                    "confidence": 0.5,
                    "mlScore": 0.5,
                    "total": 0.6
                },
                "associatedExperimentId": template.get("associatedExperimentId"),
                "createdAt": datetime.now().isoformat()
            })

    # Goal-awareness boost: +0.10 priority for templates that match the user's stated goals
    user_goals = set((user_profile or {}).get("goals", []))
    if user_goals:
        for c in candidates:
            template = next((t for t in ACTION_LIBRARY if t["id"] == c["templateId"]), None)
            if template and user_goals & set(template.get("targetGoals") or []):
                c["priorityScore"] = min(1.0, c["priorityScore"] + 0.10)
                c["scores"]["goal_boost"] = True

    ranked = rank_recommendations(candidates)

    # Add rank field
    for i, rec in enumerate(ranked):
        rec["rank"] = i + 1
        
    return ranked

def get_confidence_value(c: str) -> int:
    if c == "high": return 3
    if c == "medium": return 2
    return 1

def format_template(text: str, pattern: Dict[str, Any]) -> str:
    if not text: return text
    evidence = pattern.get("evidence", {})
    trigger = evidence.get("trigger", "this")
    symptom = evidence.get("symptom_type", "symptoms")
    
    formatted = text.replace("{trigger}", str(trigger))
    formatted = formatted.replace("{symptom}", str(symptom))
    return formatted
