# functions/weekly_patterns_service/verify_patterns_fix.py
import sys
import os

# Add current directory to path so we can import generator
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from generator import run_weekly_generator

def test_empty_user_gets_welcome():
    print("Testing Weekly Patterns with empty user data...")
    
    user_id = "test_user_123"
    empty_data = {"meals": [], "moods": [], "symptoms": []}
    empty_insights = []
    empty_experiments = []
    
    result = run_weekly_generator(user_id, empty_data, empty_insights, empty_experiments)
    
    items = result.get('items', [])
    if not items:
        print("FAIL: No items generated for empty user!")
        return False
        
    welcome_item = next((i for i in items if i['type'] == 'welcome'), None)
    if not welcome_item:
        print("FAIL: Welcome item missing for new user!")
        return False
        
    print(f"SUCCESS: Found welcome item: '{welcome_item['title']}'")
    print(f"Summary: {welcome_item['summary']}")
    
    generation = result.get('generation', {})
    if generation.get('status') != 'completed':
        print("FAIL: Generation status not completed!")
        return False
        
    print("Weekly Patterns Logic Verification PASSED.")
    return True

if __name__ == "__main__":
    test_empty_user_gets_welcome()
