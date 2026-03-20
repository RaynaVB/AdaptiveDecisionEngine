# functions/health_lab_service/logic.py
from datetime import datetime, timezone, timedelta
from experiment_library import EXPERIMENT_TEMPLATES

def calculate_experiment_scores(user_profile, insights, active_experiments, completed_experiments):
    """
    Ranks experiment templates for a user.
    user_profile: {'symptoms': [], 'goals': [], 'restrictions': []}
    insights: list of insight dicts
    active_experiments: list of templateIds
    completed_experiments: list of templateIds
    """
    scored_templates = []
    
    user_symptoms = set(user_profile.get('symptoms', []))
    user_goals = set(user_profile.get('goals', []))
    user_restrictions = set(user_profile.get('restrictions', []))
    
    for template in EXPERIMENT_TEMPLATES:
        template_id = template['id']
        
        # Skip if already active or recently completed (simple v1)
        if template_id in active_experiments:
            continue
            
        # Check dietary restrictions
        if user_restrictions and template.get('dietaryTags'):
            # If template requires a tag the user is restricted from? 
            # Or if template is for an elimination the user already DOES?
            # E.g. Vegan user doesn't need "Dairy Elimination"
            if 'vegan' in user_restrictions and 'dairy' in template['dietaryTags']:
                continue
            if 'gluten_free' in user_restrictions and 'gluten' in template['dietaryTags']:
                continue

        score = 0
        reasons = []

        # 1. Insight Confidence Gap (0.30)
        # Prioritize medium-confidence insights (0.4–0.75)
        # Find insights that map to this template's tags
        matched_insights = [i for i in insights if any(tag in i.get('tags', []) for tag in template.get('tags', []))]
        max_insight_score = 0
        for insight in matched_insights:
            conf = insight.get('confidenceScore', 0)
            # 0.4 - 0.75 is the sweet spot
            if 0.4 <= conf <= 0.75:
                max_insight_score = max(max_insight_score, 0.3)
            elif conf < 0.4:
                max_insight_score = max(max_insight_score, 0.15)
            # high confidence insights don't need experiments as much
        score += max_insight_score
        if max_insight_score > 0:
            reasons.append("Matches an emerging pattern")

        # 2. Symptom Severity / Match (0.25)
        symptom_match = False
        for s in template.get('targetSymptoms', []):
            if s in user_symptoms:
                symptom_match = True
                break
        if symptom_match:
            score += 0.25
            reasons.append("Targets your symptoms")

        # 3. Goal Match (0.20)
        goal_match = False
        for g in template.get('targetGoals', []):
            if g in user_goals:
                goal_match = True
                break
        if goal_match:
            score += 0.20
            reasons.append("Aligns with your goals")

        # 4. Feasibility (0.10) - based on difficulty
        difficulty = template.get('difficulty', 'medium')
        if difficulty == 'easy':
            score += 0.10
        elif difficulty == 'medium':
            score += 0.05
        
        # 5. Novelty (0.05)
        if template_id not in completed_experiments:
            score += 0.05

        if score > 0:
            scored_templates.append({
                "template": template,
                "score": round(score, 2),
                "reason": " + ".join(reasons[:2])
            })

    # Sort by score descending
    scored_templates.sort(key=lambda x: x['score'], reverse=True)
    return scored_templates
