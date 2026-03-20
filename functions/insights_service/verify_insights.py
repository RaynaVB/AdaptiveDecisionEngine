import sys
import os
import uuid
from datetime import datetime, timezone, timedelta

# Add the service path to sys.path
sys.path.append(os.path.abspath('.'))

from pattern_engine import run_pattern_engine

def test_pattern_engine():
    now = datetime.now(timezone.utc)
    # Mock data
    meals = [
        {"id": "m1", "occurredAt": (now - timedelta(hours=2)).isoformat(), "mealSlot": "snack", "mealTypeTags": ["high_sugar"]},
        {"id": "m2", "occurredAt": (now - timedelta(days=1, hours=2)).isoformat(), "mealSlot": "snack", "mealTypeTags": ["high_sugar"]},
        {"id": "m3", "occurredAt": (now - timedelta(days=2, hours=2)).isoformat(), "mealSlot": "snack", "mealTypeTags": ["high_sugar"]},
    ]
    moods = [
        {"id": "mo1", "valence": "negative", "stress": "high", "occurredAt": (now - timedelta(hours=3)).isoformat()},
        {"id": "mo2", "valence": "negative", "stress": "high", "occurredAt": (now - timedelta(days=1, hours=3)).isoformat()},
    ]
    symptoms = [
        {"id": "s1", "symptomType": "bloating", "severity": 4, "occurredAt": (now + timedelta(hours=2)).isoformat()}
    ]
    
    # Add some late night meals for timing_pattern (now is a bit random, but let's force 10 PM)
    late_now = now.replace(hour=22, minute=0)
    meals.extend([
        {"id": "m4", "occurredAt": (late_now - timedelta(days=1)).isoformat(), "mealSlot": "snack", "mealTypeTags": ["sweet"]},
        {"id": "m5", "occurredAt": (late_now - timedelta(days=2)).isoformat(), "mealSlot": "snack", "mealTypeTags": ["sweet"]},
        {"id": "m6", "occurredAt": (late_now - timedelta(days=3)).isoformat(), "mealSlot": "snack", "mealTypeTags": ["sweet"]},
    ])

    print("Running pattern engine...")
    insights = run_pattern_engine(meals, moods, symptoms)
    
    print(f"Generated {len(insights)} insights:")
    for i in insights:
        print(f"- {i['title']} ({i['type']}): {i['summary']}")
        print(f"  Confidence: {i['confidenceLevel']} ({i['confidenceScore']})")

    # Assert basic expectations
    assert len(insights) >= 1
    assert any(i['type'] == 'mood_trigger' for i in insights)
    assert any(i['type'] == 'timing_pattern' for i in insights)

if __name__ == "__main__":
    try:
        test_pattern_engine()
        print("\nVerification SUCCESS")
    except Exception as e:
        print(f"\nVerification FAILED: {e}")
        sys.exit(1)
