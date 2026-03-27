# functions/health_lab_service/analytics.py
from datetime import datetime
from typing import List, Dict, Any

# Metrics where a HIGHER experiment value is better
HIGHER_IS_BETTER = {"avg_mood", "avg_energy", "afternoon_energy", "next_day_energy", "mood_stability"}
# Metrics where a LOWER experiment value is better
LOWER_IS_BETTER  = {"symptom_frequency", "symptom_severity", "stress_frequency"}


def _filter_moods(moods: List[Dict], symptom_type: str) -> List[Dict]:
    """Return mood events matching a specific symptomType/category."""
    return [
        m for m in moods
        if m.get("symptomType") == symptom_type or m.get("category") == symptom_type
    ]


def _hour_of(event: Dict) -> int | None:
    """Parse the hour from an event's occurredAt ISO string. Returns None on failure."""
    try:
        dt = datetime.fromisoformat(event["occurredAt"].replace("Z", "+00:00"))
        return dt.hour
    except Exception:
        return None


def get_metric_value(data: Dict[str, List[Dict[str, Any]]], metric_type: str) -> float:
    """
    Calculates a single numeric value for a metric from fetched user data.
    data: {"meals": [...], "moods": [...], "symptoms": [...]}

    Severity in mood/symptom docs uses the range [-1, 0, 1]:
        -1 = negative (low energy / bad mood / stress present)
         0 = neutral
        +1 = positive (high energy / good mood / calm)
    """
    symptoms = data.get("symptoms", [])
    moods    = data.get("moods", [])

    # --- Energy metrics ---

    if metric_type == "avg_energy":
        energy_logs = _filter_moods(moods, "energy")
        if not energy_logs:
            return 0.0
        return sum(m.get("severity", 0) for m in energy_logs) / len(energy_logs)

    if metric_type == "afternoon_energy":
        # Energy logs recorded between 12:00 PM and 6:00 PM
        energy_logs = _filter_moods(moods, "energy")
        afternoon = [m for m in energy_logs if (h := _hour_of(m)) is not None and 12 <= h < 18]
        if not afternoon:
            return 0.0
        return sum(m.get("severity", 0) for m in afternoon) / len(afternoon)

    if metric_type == "next_day_energy":
        # Energy logs recorded between 6:00 AM and 10:00 AM (next-morning feel)
        energy_logs = _filter_moods(moods, "energy")
        morning = [m for m in energy_logs if (h := _hour_of(m)) is not None and 6 <= h < 10]
        if not morning:
            return 0.0
        return sum(m.get("severity", 0) for m in morning) / len(morning)

    # --- Mood metrics ---

    if metric_type == "avg_mood":
        mood_logs = _filter_moods(moods, "mood")
        if not mood_logs:
            return 0.0
        return sum(m.get("severity", 0) for m in mood_logs) / len(mood_logs)

    if metric_type == "mood_stability":
        # Stability = how consistent mood/energy readings are.
        # Score: 1.0 = all neutral (very stable), 0.0 = always extreme.
        # stability = 1 - mean(|severity|)
        mood_logs = _filter_moods(moods, "mood") + _filter_moods(moods, "energy")
        if not mood_logs:
            return 0.0
        mean_abs_severity = sum(abs(m.get("severity", 0)) for m in mood_logs) / len(mood_logs)
        return 1.0 - mean_abs_severity

    # --- Stress metric ---

    if metric_type == "stress_frequency":
        # Count of stress events where severity < 0 (stress is present / high)
        stress_logs = _filter_moods(moods, "stress")
        high_stress = [m for m in stress_logs if m.get("severity", 0) < 0]
        return float(len(high_stress))

    # --- Symptom metrics ---

    if metric_type == "symptom_frequency":
        return float(len(symptoms))

    if metric_type == "symptom_severity":
        if not symptoms:
            return 0.0
        return sum(s.get("severity", 5) for s in symptoms) / len(symptoms)

    return 0.0


def evaluate_real_time_result(baseline_data, experiment_data, metric_type):
    """
    Compares baseline vs experiment metrics and returns (outcome, confidence_delta, summary).
    """
    baseline_val   = get_metric_value(baseline_data, metric_type)
    experiment_val = get_metric_value(experiment_data, metric_type)

    metric_label = metric_type.replace("_", " ")

    if baseline_val == 0 and experiment_val == 0:
        return "inconclusive", 0, "No data recorded for this metric. Log more data during the experiment for accurate results."

    if baseline_val == 0:
        return "inconclusive", 0, "No baseline data recorded before the experiment. Cannot calculate improvement."

    higher_is_better = metric_type in HIGHER_IS_BETTER

    if higher_is_better:
        improvement = (experiment_val - baseline_val) / abs(baseline_val)
    else:
        # For symptom/stress metrics, a decrease is an improvement
        improvement = (baseline_val - experiment_val) / abs(baseline_val)

    summary = f"Baseline: {round(baseline_val, 2)}, Experiment: {round(experiment_val, 2)}. "

    if improvement >= 0.20:
        outcome           = "positive"
        confidence_delta  = 0.2
        summary += f"Great results! You saw a {int(improvement * 100)}% improvement in {metric_label}."
    elif improvement <= -0.10:
        outcome           = "negative"
        confidence_delta  = -0.1
        summary += f"The experiment did not help — {metric_label} worsened by {int(abs(improvement) * 100)}%."
    else:
        outcome           = "inconclusive"
        confidence_delta  = 0
        summary += f"Results were inconclusive with a {int(improvement * 100)}% change in {metric_label}."

    return outcome, confidence_delta, summary
