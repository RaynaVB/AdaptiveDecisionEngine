# functions/health_lab_service/experiment_library.py

EXPERIMENT_TEMPLATES = [
    {
        "id": "dairy_elimination",
        "name": "Dairy Elimination",
        "category": "elimination",
        "durationDays": 5,
        "targetSymptoms": ["bloating", "gas", "stomach_pain"],
        "targetGoals": ["improve_digestion", "identify_food_triggers"],
        "targetMetric": "symptom_frequency",
        "requiredEvents": ["meal_log", "symptom_log"],
        "dietaryTags": ["dairy"],
        "instructions": [
            "Remove all milk, cheese, yogurt, and butter.",
            "Check labels for whey, casein, or milk solids.",
            "Log all meals and symptoms daily."
        ],
        "dailyRequirements": {
            "meals": True,
            "symptoms": True
        },
        "difficulty": "medium",
        "tags": ["dairy", "digestion"]
    },
    {
        "id": "gluten_elimination",
        "name": "Gluten Elimination",
        "category": "elimination",
        "durationDays": 7,
        "targetSymptoms": ["bloating", "fatigue", "brain_fog"],
        "targetGoals": ["improve_digestion", "improve_energy"],
        "targetMetric": "avg_energy",
        "requiredEvents": ["meal_log", "symptom_log", "energy_log"],
        "dietaryTags": ["gluten"],
        "instructions": [
            "Avoid wheat, barley, rye, and malt.",
            "Focus on naturally gluten-free foods like rice, quinoa, and potatoes.",
            "Log all meals and symptoms."
        ],
        "dailyRequirements": {
            "meals": True,
            "symptoms": True
        },
        "difficulty": "medium",
        "tags": ["gluten", "digestion"]
    },
    {
        "id": "high_protein_breakfast",
        "name": "High-Protein Breakfast",
        "category": "addition",
        "durationDays": 5,
        "targetSymptoms": ["fatigue", "energy_crashes"],
        "targetGoals": ["improve_energy", "stable_energy"],
        "targetMetric": "afternoon_energy",
        "requiredEvents": ["meal_log", "energy_log"],
        "instructions": [
            "Eat at least 25-30g of protein within 1 hour of waking up.",
            "Examples: Eggs, Greek yogurt, protein shake, smoked salmon.",
            "Record your energy levels at 10 AM, 2 PM, and 4 PM."
        ],
        "dailyRequirements": {
            "meals": True,
            "mood": True
        },
        "difficulty": "easy",
        "tags": ["protein", "energy"]
    },
    {
        "id": "hydration_boost",
        "name": "Hydration Boost",
        "category": "behavior",
        "durationDays": 3,
        "targetSymptoms": ["fatigue", "headaches", "brain_fog"],
        "targetGoals": ["improve_energy", "build_healthier_habits"],
        "targetMetric": "avg_energy",
        "requiredEvents": ["mood_log"],
        "instructions": [
            "Drink 500ml of water immediately upon waking.",
            "Drink 500ml of water before every major meal.",
            "Aim for a total of 2.5L - 3L per day."
        ],
        "dailyRequirements": {
            "mood": True
        },
        "difficulty": "easy",
        "tags": ["hydration", "energy"]
    },
    {
        "id": "caffeine_cutoff",
        "name": "Caffeine Cutoff",
        "category": "timing",
        "durationDays": 5,
        "targetSymptoms": ["sleep_problems", "anxiety"],
        "targetGoals": ["improve_sleep", "reduce_anxiety"],
        "targetMetric": "mood_stability",
        "requiredEvents": ["mood_log", "sleep_log"],
        "instructions": [
            "No caffeine (coffee, tea, soda, energy drinks) after 1:00 PM.",
            "Switch to herbal tea or decaf in the afternoon.",
            "Log your sleep quality and anxiety levels."
        ],
        "dailyRequirements": {
            "mood": True,
            "symptoms": True
        },
        "difficulty": "medium",
        "tags": ["caffeine", "sleep", "anxiety"]
    },
    {
        "id": "early_dinner",
        "name": "Early Dinner",
        "category": "timing",
        "durationDays": 5,
        "targetSymptoms": ["acid_reflux", "sleep_problems", "bloating"],
        "targetGoals": ["improve_digestion", "improve_sleep"],
        "targetMetric": "symptom_frequency",
        "requiredEvents": ["meal_log", "symptom_log"],
        "instructions": [
            "Finish your last meal at least 3 hours before bed (ideally by 7:00 PM).",
            "Avoid snacking after dinner.",
            "Log your digestion and sleep quality."
        ],
        "dailyRequirements": {
            "meals": True,
            "symptoms": True
        },
        "difficulty": "medium",
        "tags": ["timing", "digestion", "sleep"]
    },
    {
        "id": "regular_meal_timing",
        "name": "Regular Meal Timing",
        "category": "timing",
        "durationDays": 5,
        "targetSymptoms": ["mood_swings", "energy_crashes", "anxiety"],
        "targetGoals": ["stable_energy", "improve_mood_clarity"],
        "targetMetric": "mood_stability",
        "requiredEvents": ["meal_log", "mood_log"],
        "instructions": [
            "Eat breakfast, lunch, and dinner at consistent times each day.",
            "Do not skip meals or wait more than 5 hours between meals.",
            "Log your mood and energy throughout the day."
        ],
        "dailyRequirements": {
            "meals": True,
            "mood": True
        },
        "difficulty": "easy",
        "tags": ["timing", "mood", "energy"]
    }
]
