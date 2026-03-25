import sys
import os
import uuid
from datetime import datetime, timedelta

# Add the service directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pattern_engine import run_pattern_engine
from recommender_engine import run_recommendation_engine

def test_new_patterns():
    print("Testing new pattern detection and recommendation generation...")
    
    now = datetime.now()
    
    # Mock data - Set all to 12:00 PM to avoid late night cluster
    meals = [
        {"id": f"meal-{i}", "occurredAt": (now.replace(hour=12) - timedelta(hours=100-i)).isoformat(), "confirmedIngredients": []}
        for i in range(10)
    ]
    # Add specific meals for patterns
    meals.append({
        "id": "meal-k1",
        "occurredAt": (now.replace(hour=12) - timedelta(hours=48)).isoformat(),
        "confirmedIngredients": [{"canonicalName": "Kombucha", "confirmedStatus": "active"}]
    })
    meals.append({
        "id": "meal-k2",
        "occurredAt": (now.replace(hour=12) - timedelta(hours=44)).isoformat(),
        "confirmedIngredients": [{"canonicalName": "Kombucha", "confirmedStatus": "active"}]
    })
    meals.append({
        "id": "meal-g1",
        "occurredAt": (now.replace(hour=12) - timedelta(hours=24)).isoformat(),
        "confirmedIngredients": [{"canonicalName": "Gluten", "confirmedStatus": "active"}]
    })
    meals.append({
        "id": "meal-g2",
        "occurredAt": (now.replace(hour=12) - timedelta(hours=20)).isoformat(),
        "confirmedIngredients": [{"canonicalName": "Gluten", "confirmedStatus": "active"}]
    })
    
    moods = [
        {"id": f"mood-{i}", "symptomType": "mood", "severity": 0, "occurredAt": (now.replace(hour=12) - timedelta(hours=100-i)).isoformat()}
        for i in range(10)
    ]
    # Add specific moods for boost
    moods.append({
        "id": "mood-b1",
        "symptomType": "mood",
        "severity": 1,
        "occurredAt": (now.replace(hour=12) - timedelta(hours=47)).isoformat()
    })
    moods.append({
        "id": "mood-b2",
        "symptomType": "mood",
        "severity": 2,
        "occurredAt": (now.replace(hour=12) - timedelta(hours=43)).isoformat()
    })
    
    symptoms = [
        {
            "id": "sym-1",
            "symptomType": "bloating",
            "severity": 2, # Significant
            "occurredAt": (now.replace(hour=12) - timedelta(hours=12)).isoformat()
        },
        {
            "id": "sym-2",
            "symptomType": "bloating",
            "severity": 3, # Significant
            "occurredAt": (now.replace(hour=12) - timedelta(hours=8)).isoformat()
        }
    ]
    
    print("\n1. Testing Pattern Engine...")
    patterns = run_pattern_engine(meals, moods, symptoms)
    
    detected_types = [p["patternType"] for p in patterns]
    print(f"Detected patterns: {detected_types}")
    
    if "mood_boost" not in detected_types:
        print("FAILED: mood_boost pattern not detected.")
        return False
    if "delayed_trigger" not in detected_types:
        print("FAILED: delayed_trigger pattern not detected.")
        return False
    
    print("SUCCESS: Pattern detection looks correct.")
    
    print("\n2. Testing Recommender Engine...")
    # Mock DB and other params
    class MockDB:
        def __init__(self):
            self.exists = True
        def collection(self, *args): return self
        def document(self, *args): return self
        def get(self): return self
        def to_dict(self): return {}
    
    db = MockDB()
    user_id = "test-user"
    context = {"meals": meals, "moods": moods, "symptoms": symptoms}
    
    recs = run_recommendation_engine(db, user_id, patterns, context)
    
    rec_titles = [r["title"] for r in recs]
    print(f"Generated recommendations: {rec_titles}")
    
    if not recs:
        # Check raw patterns for confidence
        for p in patterns:
            print(f"Pattern {p['patternType']} confidence: {p.get('confidence')}")

    # Check for specific titles from action_library.py (now with interpolation)
    found_boost = any("Make Kombucha a habit" in r["title"] for r in recs) or any("Found a mood booster!" in r["title"] for r in recs)
    found_trigger = any("Potential trigger identified" in r["title"] for r in recs) or any("Try a Gluten swap" in r["title"] for r in recs)
    
    if found_boost:
        print("SUCCESS: Mood boost recommendation found.")
    else:
        print("FAILED: Mood boost recommendation NOT found.")
        
    if found_trigger:
        print("SUCCESS: Trigger recommendation found.")
    else:
        print("FAILED: Trigger recommendation NOT found.")

    return found_boost and found_trigger

if __name__ == "__main__":
    if test_new_patterns():
        print("\nALL TESTS PASSED!")
        sys.exit(0)
    else:
        print("\nTESTS FAILED!")
        sys.exit(1)
