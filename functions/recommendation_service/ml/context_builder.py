import math
from typing import List, TypedDict, Union, Optional, Literal
from datetime import datetime

class MoodEvent(TypedDict):
    id: str
    occurredAt: str
    symptomType: str
    severity: int
    category: Optional[str]

ContextVector = List[float]  # [valence, arousal, hour, day]

WINDOW_HOURS = 4
LAMBDA_SPIKE = 2.0
LAMBDA_PERSISTENT = 0.3

def get_decay_constant(mood: MoodEvent) -> float:
    stype = mood.get('symptomType', '').lower()
    severity = mood.get('severity', 0)
    
    # High intensity states decay differently
    if stype == "stress" and severity > 0:
        return LAMBDA_SPIKE
    if stype == "energy" and severity > 0:
        return LAMBDA_SPIKE
        
    return LAMBDA_PERSISTENT

def calculate_mood_influence_weight(delta_hours: float, lambda_val: float) -> float:
    return math.exp(-lambda_val * delta_hours)

def parse_valence(mood: MoodEvent) -> float:
    stype = mood.get('symptomType', '').lower()
    severity = mood.get('severity', 0)
    
    if stype == "mood":
        return float(severity) / 2.0  # Normalize -2..2 to -1..1
        
    return 0.0

def parse_arousal(mood: MoodEvent) -> float:
    stype = mood.get('symptomType', '').lower()
    severity = mood.get('severity', 0)
    
    # Energy dimension reflects arousal in our context
    if stype == "energy":
        return float(severity) / 2.0  # Normalize -2..2 to -1..1
        
    return 0.0

def build_context_vector(target_time_ms: int, moods: List[MoodEvent]) -> ContextVector:
    target_date = datetime.fromtimestamp(target_time_ms / 1000.0)
    hour_of_day = float(target_date.hour)
    day_of_week = float(target_date.weekday())  # 0 is Monday, 6 is Sunday

    window_start_ms = target_time_ms - (WINDOW_HOURS * 60 * 60 * 1000)
    
    window_moods = []
    for m in moods:
        try:
            # Handle ISO timestamp
            ts_str = m['occurredAt'].replace('Z', '+00:00')
            mood_time_ms = datetime.fromisoformat(ts_str).timestamp() * 1000
            if window_start_ms <= mood_time_ms <= target_time_ms:
                window_moods.append((m, mood_time_ms))
        except Exception:
            continue

    if not window_moods:
        return [0.0, 0.0, hour_of_day, day_of_week]

    total_weighted_valence = 0.0
    total_weighted_arousal = 0.0
    total_weight = 0.0

    for mood, mood_time_ms in window_moods:
        delta_hours = (target_time_ms - mood_time_ms) / (1000 * 60 * 60)
        
        lambda_val = get_decay_constant(mood)
        weight = calculate_mood_influence_weight(delta_hours, lambda_val)

        valence = parse_valence(mood)
        arousal = parse_arousal(mood)

        total_weighted_valence += valence * weight
        total_weighted_arousal += arousal * weight
        total_weight += weight

    if total_weight == 0:
        return [0.0, 0.0, hour_of_day, day_of_week]

    return [
        total_weighted_valence / total_weight,
        total_weighted_arousal / total_weight,
        hour_of_day,
        day_of_week
    ]
