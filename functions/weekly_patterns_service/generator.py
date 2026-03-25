import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

def run_weekly_generator(user_id: str, data: Dict[str, List[Dict[str, Any]]], insights: List[Dict[str, Any]], experiments: List[Dict[str, Any]]) -> Dict[str, Any]:
    # 1. Basics
    meals = data.get('meals', [])
    moods = data.get('moods', [])
    symptoms = data.get('symptoms', [])
    
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=7)
    
    # 2. Stats
    stats = {
        "mealCount": len(meals),
        "moodCount": len(moods),
        "symptomCount": len(symptoms),
        "experimentCount": len(experiments)
    }
    
    # 3. Data Sufficiency
    sufficiency = {
        "hasEnoughMeals": len(meals) >= 10,
        "hasEnoughMoods": len(moods) >= 5,
        "hasEnoughSymptoms": True, # Optional
        "isSufficientOverall": len(meals) >= 5 and len(moods) >= 3
    }
    
    # 4. Generate Items
    items = []
    
    # Trend: Mood valence
    if moods:
        # Use numeric severity (-2 to +2 scale)
        avg_severity = sum(m.get('severity', 0) for m in moods) / len(moods)
        items.append({
            "type": "trend",
            "category": "mood",
            "title": "Weekly Mood Pulse",
            "summary": "Your mood was mostly " + ("positive" if avg_severity > 0 else "neutral/negative") + " this week.",
            "confidenceScore": 0.8,
            "rank": 1,
            "metadata": {"avgSeverity": avg_severity}
        })

    # Top Patterns (from Insights)
    for i, insight in enumerate(insights[:2]):
        items.append({
            "type": "pattern",
            "category": insight.get('category', 'general'),
            "title": insight.get('title', 'Recent Pattern'),
            "summary": insight.get('summary', ''),
            "confidenceScore": insight.get('confidenceScore', 0.5),
            "rank": 2 + i,
            "metadata": {"insightId": insight.get('id')}
        })

    # Wins
    if len(meals) >= 15:
        items.append({
            "type": "win",
            "category": "consistency",
            "title": "Logging Streak",
            "summary": f"Great job! You logged {len(meals)} meals this week. This high-resolution data helps us find better patterns.",
            "confidenceScore": 1.0,
            "rank": 0 # Pin to top
        })

    # Experiment Updates
    for exp in experiments:
        items.append({
            "type": "experiment_update",
            "category": "health_lab",
            "title": f"Experiment: {exp.get('id', 'Active')}",
            "summary": f"Status: {exp.get('status')}. Ends on {exp.get('endsAt')}.",
            "confidenceScore": 1.0,
            "rank": 10
        })

    # 5. Welcome Item for New Users
    if not sufficiency["isSufficientOverall"] and not items:
        items.append({
            "type": "welcome",
            "category": "onboarding",
            "title": "Welcome to Veyra",
            "summary": "You're in the 'Discovery' phase. Log your first 5 meals to unlock your first trend analysis.",
            "confidenceScore": 1.0,
            "rank": 0
        })

    # 6. Narrative Title
    title = "Your Weekly Health Story"
    if not sufficiency["isSufficientOverall"]:
        title = "Weekly Overview (Low Data)"
        subtitle = "Log more meals and moods to unlock deeper insights."
    else:
        subtitle = f"Based on {len(meals)} meals and {len(moods)} mood updates."

    generation = {
        "userId": user_id,
        "weekStart": week_start.isoformat().replace('+00:00', 'Z'),
        "weekEnd": now.isoformat().replace('+00:00', 'Z'),
        "generatedAt": now.isoformat().replace('+00:00', 'Z'),
        "status": "completed",
        "summary": {
            "title": title,
            "subtitle": subtitle
        },
        "stats": stats,
        "dataSufficiency": sufficiency,
        "engineVersion": "1.0.0"
    }
    
    return {
        "generation": generation,
        "items": items
    }
