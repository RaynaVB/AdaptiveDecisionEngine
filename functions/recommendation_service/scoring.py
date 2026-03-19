from typing import Dict, Optional, Any
from action_library import ActionTemplate

def calculate_scores(
    template: ActionTemplate, 
    pattern: Any, 
    rejection_rate: float = 0.0, 
    ml_score: float = 0.5
) -> Dict[str, float]:
    impact = 0.5
    if template["intensity"] == "high":
        impact = 0.9
    elif template["intensity"] == "medium":
        impact = 0.7
    elif template["intensity"] == "low":
        impact = 0.4

    feasibility = 0.5
    if template["intensity"] == "low":
        feasibility = 0.9
    elif template["intensity"] == "medium":
        feasibility = 0.7
    elif template["intensity"] == "high":
        feasibility = 0.4

    if template["id"].startswith("safe_"):
        feasibility = 1.0
        impact = 0.3

    confidence = 0.5
    pattern_confidence = pattern.get("confidence", "low")
    if pattern_confidence == "high":
        confidence = 0.9
    elif pattern_confidence == "medium":
        confidence = 0.7
    elif pattern_confidence == "low":
        confidence = 0.4

    impact_weight = 0.3
    feasibility_weight = 0.3
    ml_weight = 0.2
    confidence_weight = 0.2

    if rejection_rate > 0:
        impact_weight = 0.2
        feasibility_weight = 0.5
        ml_weight = 0.1
        confidence_weight = 0.2

    total = (
        impact_weight * impact + 
        feasibility_weight * feasibility + 
        ml_weight * ml_score + 
        confidence_weight * confidence
    )

    if rejection_rate > 0:
        penalty = rejection_rate * 0.4
        total = max(0.0, total - penalty)

    return {
        "impact": impact,
        "feasibility": feasibility,
        "confidence": confidence,
        "mlScore": ml_score,
        "total": total
    }
