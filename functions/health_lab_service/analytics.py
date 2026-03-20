# functions/health_lab_service/analytics.py
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

def get_metric_value(data: Dict[str, List[Dict[str, Any]]], metric_type: str) -> float:
    """
    Calculates a single numeric value for a metric from fetched user data.
    data: {"meals": [...], "moods": [...], "symptoms": [...]}
    """
    symptoms = data.get("symptoms", [])
    moods = data.get("moods", [])
    meals = data.get("meals", [])

    if metric_type == "symptom_frequency":
        return float(len(symptoms))
    
    if metric_type == "symptom_severity":
        if not symptoms: return 0.0
        # Assume severity is a field in symptom doc, 1-10
        total_severity = sum(s.get("severity", 5) for s in symptoms)
        return total_severity / len(symptoms)

    if metric_type == "avg_mood":
        if not moods: return 0.0
        # Map valence to numbers if needed, or use numeric field if exists
        # Assuming mood has a 'score' or similar
        total_mood = sum(m.get("score", 5) for m in moods)
        return total_mood / len(moods)

    if metric_type == "afternoon_energy":
        # Energy logs between 12 PM - 6 PM
        afternoon_moods = []
        for m in moods:
            try:
                dt = datetime.fromisoformat(m["occurredAt"].replace('Z', '+00:00'))
                if 12 <= dt.hour < 18:
                    afternoon_moods.append(m)
            except: continue
        if not afternoon_moods: return 0.0
        return sum(m.get("energy", 5) for m in afternoon_moods) / len(afternoon_moods)

    # Add more metric calculations as needed
    return 0.0

def evaluate_real_time_result(baseline_data, experiment_data, metric_type):
    """
    Compares baseline vs experiment metrics and returns (outcome, confidence_delta, summary).
    """
    baseline_val = get_metric_value(baseline_data, metric_type)
    experiment_val = get_metric_value(experiment_data, metric_type)

    if baseline_val == 0 and experiment_val == 0:
        return 'inconclusive', 0, "No data recorded for this metric during the period."

    # Improvement calculation depends on the metric
    # For symptoms/stress: lower is better
    # For mood/energy: higher is better
    higher_is_better = metric_type in ["avg_mood", "afternoon_energy", "next_day_energy", "mood_stability"]
    
    if baseline_val == 0:
        # Avoid division by zero, but maybe can't calculate improvement
        return 'inconclusive', 0, "Baseline data was zero, cannot calculate improvement."

    if higher_is_better:
        improvement = (experiment_val - baseline_val) / baseline_val
    else:
        improvement = (baseline_val - experiment_val) / baseline_val

    outcome = 'inconclusive'
    confidence_delta = 0
    summary = f"Baseline: {round(baseline_val, 2)}, Experiment: {round(experiment_val, 2)}. "

    if improvement >= 0.20: # 20% improvement
        outcome = 'positive'
        confidence_delta = 0.2
        summary += f"Positive results! You saw a {int(improvement*100)}% improvement in {metric_type.replace('_', ' ')}."
    elif improvement <= -0.10: # 10% worsening
        outcome = 'negative'
        confidence_delta = -0.1
        summary += f"The experiment didn't seem to help. {metric_type.replace('_', ' ')} worsened by {int(abs(improvement)*100)}%."
    else:
        outcome = 'inconclusive'
        confidence_delta = 0
        summary += f"The results were inconclusive with a minor change of {int(improvement*100)}%."

    return outcome, confidence_delta, summary
