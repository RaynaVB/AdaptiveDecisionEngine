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
    latest_rejections: Dict[str, str] = {}
) -> List[Dict[str, Any]]:
    candidates = []
    meal_count = len(context.get("meals", []))
    mood_count = len(context.get("moods", []))

    # Initialize Bandit Model
    bandit = ContextualBandit(db, user_id)
    bandit.ensure_loaded()
    
    target_time_ms = int(datetime.now().timestamp() * 1000)
    current_context = build_context_vector(target_time_ms, context.get("moods", []))

    for pattern in patterns:
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

            # Cooldown check (24h)
            latest_rejection_str = latest_rejections.get(template["id"])
            if latest_rejection_str:
                try:
                    rejection_time = datetime.fromisoformat(latest_rejection_str.replace('Z', '+00:00'))
                    hours_since = (datetime.now().astimezone() - rejection_time).total_seconds() / 3600
                    if hours_since < 24:
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

            candidates.append({
                "id": str(uuid.uuid4()),
                "templateId": template["id"],
                "type": template["recommendationType"],
                "category": template.get("category", "general"), # Default if not in template
                "title": template["titleTemplate"],
                "summary": template.get("summaryTemplate", template["actionTemplate"]), # Fallback to action if summary missing
                "confidenceScore": scores["confidence"],
                "confidenceLevel": conf_level,
                "priorityScore": scores["total"],
                "whyThis": [
                    {"kind": "pattern", "label": template["whyTemplate"]}
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
            candidates.append({
                "id": str(uuid.uuid4()),
                "templateId": template["id"],
                "recommendationType": template["recommendationType"],
                "title": template["titleTemplate"],
                "action": template["actionTemplate"],
                "whyThis": template["whyTemplate"],
                "linkedPatternIds": [],
                "scores": {
                    "impact": 0.3,
                    "feasibility": 1.0,
                    "confidence": 0.5,
                    "mlScore": 0.5,
                    "total": 0.62
                },
                "createdAt": datetime.now().isoformat()
            })

    ranked = rank_recommendations(candidates)
    
    # Add rank field
    for i, rec in enumerate(ranked):
        rec["rank"] = i + 1
        
    return ranked

def get_confidence_value(c: str) -> int:
    if c == "high": return 3
    if c == "medium": return 2
    return 1
