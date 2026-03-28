# functions/pattern_alerts_service/detectors.py
#
# Four pure-function pattern detectors. Each accepts pre-fetched event lists
# (already sliced to the relevant lookback window by main.py) and returns
# either a partial alert dict or None.
#
# IMPORTANT — Severity direction for stress:
#   MoodLoggerScreen.tsx stores Stress with minLabel='Relaxed', maxLabel='Stressed'.
#   High stress  → severity >= 1
#   Low  stress  → severity <= -1   (actually means relaxed)
#   This is the OPPOSITE of mood/energy where high severity is positive.

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


def _parse_date(iso_str: str) -> Optional[datetime]:
    """Parse an ISO 8601 UTC string. Returns None on failure."""
    try:
        return datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    except Exception:
        return None


def _date_label(dt: datetime) -> str:
    """Return 'YYYY-MM-DD' in UTC."""
    return dt.strftime("%Y-%m-%d")


# ---------------------------------------------------------------------------
# 1. Energy Dip Streak
# ---------------------------------------------------------------------------

def detect_energy_dip_streak(moods: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Fires when the user has logged low afternoon energy on 3+ distinct calendar
    days within the last 5 days.

    Criteria:
      - symptomType == 'energy'  (case-insensitive)
      - hour(occurredAt) in [12, 18)  — 12:00 PM to 5:59 PM
      - severity <= -1
    """
    matching: List[Dict[str, Any]] = []
    for m in moods:
        if m.get("symptomType", "").lower() != "energy":
            continue
        if int(m.get("severity", 0)) > -1:
            continue
        dt = _parse_date(m.get("occurredAt", ""))
        if dt is None:
            continue
        if 12 <= dt.hour < 18:
            matching.append({"dt": dt, "severity": int(m.get("severity", 0))})

    distinct_days = sorted({_date_label(e["dt"]) for e in matching})
    if len(distinct_days) < 3:
        return None

    streak_len = len(distinct_days)
    avg_sev = sum(e["severity"] for e in matching) / len(matching)

    # Suggest 3-PM snack for ≤3 days, morning protein for stronger streaks
    suggested = "high_protein_breakfast" if streak_len >= 4 else "protein_snack_3pm"

    return {
        "type": "energy_dip_streak",
        "title": f"Afternoon Energy Slump — {streak_len} Days",
        "summary": (
            f"You logged low energy in the afternoon on {streak_len} of the last 5 days. "
            "A targeted protein experiment often helps stabilise this pattern."
        ),
        "suggestedExperimentId": suggested,
        "evidence": {
            "streakLength": streak_len,
            "metricAvg": round(avg_sev, 2),
            "days": distinct_days,
        },
    }


# ---------------------------------------------------------------------------
# 2. Symptom Streak
# ---------------------------------------------------------------------------

_DIGESTIVE_TYPES = {
    "bloating", "gas", "stomach_pain", "acid_reflux", "reflux",
    "constipation", "diarrhea", "nausea", "indigestion",
}
_NEUROLOGICAL_TYPES = {"headache", "headaches", "brain_fog", "dizziness", "migraine"}

def _experiment_for_symptom(symptom_type: str) -> str:
    st = symptom_type.lower()
    if st in _NEUROLOGICAL_TYPES:
        return "gluten_elimination"
    return "dairy_elimination"


def detect_symptom_streak(symptoms: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Fires when the same symptomType appears on 3+ distinct calendar days
    within the last 5 days.

    Returns an alert for the symptomType with the longest streak.
    """
    # Group by symptomType → set of distinct days
    by_type: Dict[str, List[Dict[str, Any]]] = {}
    for s in symptoms:
        st = s.get("symptomType", "").lower()
        if not st:
            continue
        dt = _parse_date(s.get("occurredAt", ""))
        if dt is None:
            continue
        by_type.setdefault(st, []).append({"dt": dt, "severity": int(s.get("severity", 0))})

    best_type: Optional[str] = None
    best_days: List[str] = []
    for st, events in by_type.items():
        days = sorted({_date_label(e["dt"]) for e in events})
        if len(days) >= 3 and len(days) > len(best_days):
            best_days = days
            best_type = st

    if best_type is None:
        return None

    events = by_type[best_type]
    avg_sev = sum(e["severity"] for e in events) / len(events)
    label = best_type.replace("_", " ").title()

    return {
        "type": "symptom_streak",
        "title": f"{label} — {len(best_days)} Days Running",
        "summary": (
            f"You've logged {label.lower()} on {len(best_days)} separate days this week. "
            "An elimination experiment can reveal whether a food trigger is involved."
        ),
        "suggestedExperimentId": _experiment_for_symptom(best_type),
        "evidence": {
            "streakLength": len(best_days),
            "metricAvg": round(avg_sev, 2),
            "days": best_days,
        },
    }


# ---------------------------------------------------------------------------
# 3. Mood Dip Pattern
# ---------------------------------------------------------------------------

def detect_mood_dip_pattern(moods: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Fires when the user has logged 3+ low-mood events (severity <= -1)
    within the last 4 days, regardless of time of day.

    Criteria:
      - symptomType == 'mood'  (case-insensitive)
      - severity <= -1
    """
    matching: List[Dict[str, Any]] = []
    for m in moods:
        if m.get("symptomType", "").lower() != "mood":
            continue
        if int(m.get("severity", 0)) > -1:
            continue
        dt = _parse_date(m.get("occurredAt", ""))
        if dt is None:
            continue
        matching.append({"dt": dt, "severity": int(m.get("severity", 0))})

    if len(matching) < 3:
        return None

    distinct_days = sorted({_date_label(e["dt"]) for e in matching})
    avg_sev = sum(e["severity"] for e in matching) / len(matching)

    return {
        "type": "mood_dip_pattern",
        "title": f"Low Mood — {len(matching)} Times This Week",
        "summary": (
            "Your mood has been consistently low lately. "
            "Eating at regular times each day can stabilise blood sugar and lift mood swings."
        ),
        "suggestedExperimentId": "regular_meal_timing",
        "evidence": {
            "streakLength": len(matching),
            "metricAvg": round(avg_sev, 2),
            "days": distinct_days,
        },
    }


# ---------------------------------------------------------------------------
# 4. Stress Spike
# ---------------------------------------------------------------------------

def detect_stress_spike(moods: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Fires when the user has logged 3+ high-stress events within the last 3 days.

    ⚠️  Stress severity is INVERTED vs mood/energy:
        MoodLoggerScreen stores Stress with maxLabel='Stressed',
        so HIGH stress = severity >= 1  (not <= -1).

    Criteria:
      - symptomType == 'stress'  (case-insensitive)
      - severity >= 1
    """
    matching: List[Dict[str, Any]] = []
    for m in moods:
        if m.get("symptomType", "").lower() != "stress":
            continue
        if int(m.get("severity", 0)) < 1:          # inverted threshold
            continue
        dt = _parse_date(m.get("occurredAt", ""))
        if dt is None:
            continue
        matching.append({"dt": dt, "severity": int(m.get("severity", 0))})

    if len(matching) < 3:
        return None

    distinct_days = sorted({_date_label(e["dt"]) for e in matching})
    avg_sev = sum(e["severity"] for e in matching) / len(matching)

    return {
        "type": "stress_spike",
        "title": f"Elevated Stress — {len(matching)} Times in 3 Days",
        "summary": (
            "You've logged high stress several times this week. "
            "A 60-second breathing reset during stressful moments can measurably reduce frequency."
        ),
        "suggestedExperimentId": "stress_reset_60s",
        "evidence": {
            "streakLength": len(matching),
            "metricAvg": round(avg_sev, 2),
            "days": distinct_days,
        },
    }
