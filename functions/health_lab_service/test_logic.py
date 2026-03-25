# functions/health_lab_service/test_logic.py
from logic import calculate_experiment_scores, evaluate_experiment_result

def test_ranking():
    user_profile = {
        "symptoms": ["bloating", "fatigue"],
        "goals": ["improve_digestion", "improve_energy"],
        "restrictions": ["vegan"]
    }
    
    insights = [
        {"title": "Possible Trigger: Dairy", "confidenceScore": 0.5},
        {"title": "Mood Booster: Protein", "confidenceScore": 0.2}
    ]
    
    active = []
    completed = []
    
    results = calculate_experiment_scores(user_profile, insights, active, completed)
    
    print("Ranking Results:")
    for r in results:
        print(f" - {r['template']['name']}: Score {r['score']}, Reason: {r['reason']}")
    
    # Verify Vegan exclusion
    dairy_exp = [r for r in results if r['template']['id'] == 'dairy_elimination']
    assert len(dairy_exp) == 0, "Dairy elimination should be excluded for vegan users"
    
    # Verify High Protein score
    protein_exp = [r for r in results if r['template']['id'] == 'high_protein_breakfast']
    assert len(protein_exp) > 0
    assert protein_exp[0]['score'] > 0.4 # 0.15 (conf < 0.4) + 0.25 (symptoms) + 0.2 (goals)

def test_evaluation():
    # Outcome: positive
    outcome, delta, summary = evaluate_experiment_result({}, 5.0, 3.0)
    assert outcome == 'positive'
    assert delta == 0.2
    
    # Outcome: negative
    outcome, delta, summary = evaluate_experiment_result({}, 5.0, 5.0)
    assert outcome == 'negative'
    assert delta == -0.1

if __name__ == "__main__":
    test_ranking()
    test_evaluation()
    print("\nAll tests passed!")
