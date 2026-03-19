import math
from typing import List, TypedDict, Union, Optional, Literal
from datetime import datetime

class MoodEvent(TypedDict):
    id: str
    occurredAt: str
    valence: Optional[Union[float, Literal['positive', 'neutral', 'negative']]]
    arousal: Optional[float]
    energy: Optional[Literal['high', 'ok', 'low']]
    stress: Optional[Literal['high', 'ok', 'low']]

ContextVector = List[float]  # [valence, arousal, hour, day]

WINDOW_HOURS = 4
LAMBDA_SPIKE = 2.0
LAMBDA_PERSISTENT = 0.3

def get_decay_constant(mood: MoodEvent) -> float:
    if mood.get('energy') == 'high' or mood.get('stress') == 'high':
        return LAMBDA_SPIKE
    return LAMBDA_PERSISTENT

def calculate_mood_influence_weight(delta_hours: float, lambda_val: float) -> float:
    return math.exp(-lambda_val * delta_hours)

def parse_valence(valence: Union[float, str, None]) -> float:
    if isinstance(valence, (int, float)):
        return float(valence)
    if valence == 'positive': return 0.8
    if valence == 'negative': return -0.8
    return 0.0

def parse_arousal(arousal: Optional[float], energy: Optional[str]) -> float:
    if isinstance(arousal, (int, float)):
        return float(arousal)
    if energy == 'high': return 0.8
    if energy == 'low': return -0.8
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

        valence = parse_valence(mood.get('valence'))
        arousal = parse_arousal(mood.get('arousal'), mood.get('energy'))

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
