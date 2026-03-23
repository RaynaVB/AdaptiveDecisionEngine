import sys
import os
import uuid
from datetime import datetime

# Add the service directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from recommender_engine import run_recommendation_engine

def test_fallback_structure():
    print("Testing recommendation engine fallback structure...")
    
    # Simulate a user with no data (empty lists)
    user_id = "test-user-123"
    meals = []
    moods = []
    symptoms = []
    
    recs = run_recommendation_engine(user_id, meals, moods, symptoms)
    
    if not recs:
        print("FAILED: No recommendations returned (expected fallback).")
        return False
        
    print(f"Success: Received {len(recs)} fallback recommendations.")
    
    required_fields = [
        "id", "templateId", "userId", "generationId", "type", 
        "category", "title", "summary", "confidenceScore", 
        "confidenceLevel", "priorityScore", "whyThis", "cta", 
        "action", "linkedPatternIds", "scores", "createdAt"
    ]
    
    for i, rec in enumerate(recs):
        print(f"\nChecking recommendation {i+1}: {rec.get('title')}")
        missing = [f for f in required_fields if f not in rec]
        if missing:
            print(f"FAILED: Missing fields: {missing}")
            return False
            
        # Check whyThis structure
        if not isinstance(rec["whyThis"], list) or len(rec["whyThis"]) == 0:
            print("FAILED: whyThis is not a non-empty list.")
            return False
        if not all(isinstance(w, dict) and "label" in w for w in rec["whyThis"]):
            print("FAILED: whyThis items are not correctly formatted dictionaries.")
            return False
            
        # Check confidenceLevel
        if not isinstance(rec["confidenceLevel"], str):
            print("FAILED: confidenceLevel is not a string.")
            return False
            
    print("\nALL FALLBACK CHECKS PASSED!")
    return True

if __name__ == "__main__":
    if test_fallback_structure():
        sys.exit(0)
    else:
        sys.exit(1)
