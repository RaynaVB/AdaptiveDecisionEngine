# functions/health_lab_service/verify_lab_fix.py
import sys
import os

# Add current directory to path so we can import logic
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from logic import calculate_experiment_scores

def test_empty_user_gets_starters():
    print("Testing Health Lab with empty user profile...")
    
    empty_profile = {'symptoms': [], 'goals': [], 'restrictions': []}
    empty_insights = []
    empty_active = []
    empty_completed = []
    
    scored = calculate_experiment_scores(empty_profile, empty_insights, empty_active, empty_completed)
    
    if not scored:
        print("FAIL: No experiments recommended for empty user!")
        return False
        
    print(f"SUCCESS: Found {len(scored)} recommendations for empty user.")
    
    # Check if easy ones are at the top
    top_items = scored[:3]
    for item in top_items:
        template = item['template']
        score = item['score']
        reason = item['reason']
        print(f" - Recommended: {template['name']} (Score: {score}, Reason: {reason})")
        
        if template['difficulty'] == 'easy':
            if score < 0.2:
                print(f"FAIL: Easy experiment {template['name']} should have starter boost!")
                return False
            if "Great starter study" not in reason:
                print(f"FAIL: Reason for {template['name']} is missing 'Great starter study'!")
                return False

    print("Health Lab Logic Verification PASSED.")
    return True

if __name__ == "__main__":
    test_empty_user_gets_starters()
