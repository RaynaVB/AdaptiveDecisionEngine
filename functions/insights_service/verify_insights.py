import sys
import os
import uuid
from datetime import datetime, timezone, timedelta

# Add the service path to sys.path
sys.path.append(os.path.abspath('.'))

from pattern_engine import run_pattern_engine

def test_pattern_engine():
    now = datetime.now(timezone.utc)
    
    # Mock data - Modern ranges (Ingredients + Bipolar Mood + Unipolar Symptoms)
    
    meals = [
        # Meals with "Sugar" -> Mood Association (Negative)
        {"id": "m1", "occurredAt": (now - timedelta(hours=5)).isoformat(), "confirmedIngredients": [{"canonicalName": "Sugar", "confirmedStatus": "confirmed"}]},
        {"id": "m2", "occurredAt": (now - timedelta(days=1, hours=5)).isoformat(), "confirmedIngredients": [{"canonicalName": "Sugar", "confirmedStatus": "confirmed"}]},
        {"id": "m3", "occurredAt": (now - timedelta(days=2, hours=5)).isoformat(), "confirmedIngredients": [{"canonicalName": "Sugar", "confirmedStatus": "confirmed"}]},
        
        # Meals with "Salmon" -> Mood Boost (Positive)
        {"id": "m_p1", "occurredAt": (now - timedelta(hours=30)).isoformat(), "confirmedIngredients": [{"canonicalName": "Salmon", "confirmedStatus": "confirmed"}]},
        {"id": "m_p2", "occurredAt": (now - timedelta(days=1, hours=30)).isoformat(), "confirmedIngredients": [{"canonicalName": "Salmon", "confirmedStatus": "confirmed"}]},

        # Meals with "Dairy" -> Delayed Trigger (6-24h)
        {"id": "m_d1", "occurredAt": (now - timedelta(hours=20)).isoformat(), "confirmedIngredients": [{"canonicalName": "Dairy", "confirmedStatus": "confirmed"}]},
        {"id": "m_d2", "occurredAt": (now - timedelta(days=1, hours=20)).isoformat(), "confirmedIngredients": [{"canonicalName": "Dairy", "confirmedStatus": "confirmed"}]},
        
        # 2 Meals for mood_dip_then_eat (meal AFTER mood)
        {"id": "m4", "occurredAt": (now - timedelta(hours=2)).isoformat(), "mealSlot": "dinner"},
        {"id": "m5", "occurredAt": (now - timedelta(days=1, hours=2)).isoformat(), "mealSlot": "dinner"},

        # Meals with "Wheat" -> Trigger Pattern (Immediate 0-6h)
        {"id": "m6", "occurredAt": (now - timedelta(days=2, hours=10)).isoformat(), "confirmedIngredients": [{"canonicalName": "Wheat", "confirmedStatus": "confirmed"}]},
        {"id": "m7", "occurredAt": (now - timedelta(days=3, hours=10)).isoformat(), "confirmedIngredients": [{"canonicalName": "Wheat", "confirmedStatus": "confirmed"}]},
    ]
    
    moods = [
        # Mood drops AFTER Sugar
        {"id": "mo1", "symptomType": "mood", "severity": -2, "occurredAt": (now - timedelta(hours=4)).isoformat()},
        {"id": "mo2", "symptomType": "mood", "severity": -1, "occurredAt": (now - timedelta(days=1, hours=4)).isoformat()},
        {"id": "mo3", "symptomType": "mood", "severity": -2, "occurredAt": (now - timedelta(days=2, hours=4)).isoformat()},
        
        # Mood boosts AFTER Salmon
        {"id": "mo_p1", "symptomType": "mood", "severity": 2, "occurredAt": (now - timedelta(hours=28)).isoformat()},
        {"id": "mo_p2", "symptomType": "mood", "severity": 1, "occurredAt": (now - timedelta(days=1, hours=28)).isoformat()},

        # Mood dips BEFORE meals
        {"id": "mo4", "symptomType": "mood", "severity": -1, "occurredAt": (now - timedelta(hours=2, minutes=30)).isoformat()},
        {"id": "mo5", "symptomType": "mood", "severity": -2, "occurredAt": (now - timedelta(days=1, hours=2, minutes=30)).isoformat()},
    ]
    
    symptoms = [
        # Physical Symptom (Immediate)
        {"id": "s1", "symptomType": "bloating", "severity": 3, "occurredAt": (now - timedelta(days=2, hours=8)).isoformat()},
        {"id": "s2", "symptomType": "bloating", "severity": 2, "occurredAt": (now - timedelta(days=3, hours=8)).isoformat()},

        # Physical Symptom (Delayed)
        {"id": "s_d1", "symptomType": "eczema", "severity": 2, "occurredAt": (now - timedelta(hours=2)).isoformat()},
        {"id": "s_d2", "symptomType": "eczema", "severity": 2, "occurredAt": (now - timedelta(days=1, hours=2)).isoformat()}
    ]
    
    # Add late night meals for timing_pattern
    late_now = (now - timedelta(days=1)).replace(hour=23, minute=0)
    meals.extend([
        {"id": "m8", "occurredAt": late_now.isoformat(), "mealSlot": "snack"},
        {"id": "m9", "occurredAt": (late_now - timedelta(days=1)).isoformat(), "mealSlot": "snack"},
        {"id": "m10", "occurredAt": (late_now - timedelta(days=2)).isoformat(), "mealSlot": "snack"},
    ])

    print("Running pattern engine...")
    insights = run_pattern_engine(meals, moods, symptoms)
    
    print(f"Generated {len(insights)} insights:")
    for i in insights:
        print(f"- {i['title']} ({i['type']}): {i['summary']}")
        print(f"  Confidence: {i['confidenceLevel']} ({i['confidenceScore']})")

    # Assert expectations
    assert len(insights) >= 6
    # Check mood_trigger (Mood dip then eat)
    assert any(i['type'] == 'mood_trigger' for i in insights)
    # Check trigger pattern (Immediate)
    assert any(i['type'] == 'trigger_pattern' and 'Wheat' in i['title'] for i in insights)
    # Check mood association (Negative)
    assert any(i['type'] == 'mood_association' and 'Sugar' in i['title'] for i in insights)
    # Check mood boost (Positive)
    assert any(i['type'] == 'mood_boost' and 'Salmon' in i['title'] for i in insights)
    # Check delayed trigger (6-24h)
    assert any(i['type'] == 'delayed_trigger' and 'Dairy' in i['title'] for i in insights)
    # Check timing pattern
    assert any(i['type'] == 'timing_pattern' for i in insights)

if __name__ == "__main__":
    try:
        test_pattern_engine()
        print("\nVerification SUCCESS")
    except Exception as e:
        print(f"\nVerification FAILED: {e}")
        sys.exit(1)
