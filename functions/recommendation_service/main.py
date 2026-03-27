from firebase_functions import https_fn
import firebase_admin
from firebase_admin import credentials, firestore
from flask import jsonify, request
from recommender_engine import run_recommendation_engine
from pattern_engine import run_pattern_engine
from ml.bandit_model import ContextualBandit
from ml.context_builder import build_context_vector
from datetime import datetime, timedelta, timezone
from typing import Dict, List

# Initialize Firebase Admin
try:
    firebase_admin.initialize_app()
except ValueError:
    pass # App already initialized

def get_db():
    return firestore.client()

@https_fn.on_request()
def recommendation_service(req: https_fn.Request) -> https_fn.Response:
    # Use Flask context for the request handling if desired, 
    # but Firebase HTTP functions provide a request-like object.
    # To keep the logic compatible with the previous implementation:
    
    if req.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '3600'
        }
        return https_fn.Response('', status=204, headers=headers)

    headers = {'Access-Control-Allow-Origin': '*'}

    try:
        path_parts = req.path.strip('/').split('/')
        # Expected paths:
        # GET /v1/users/{userId}/recommendations
        # POST /v1/users/{userId}/recommendations/{recommendationId}/feedback

        if len(path_parts) >= 4 and path_parts[0] == 'v1' and path_parts[1] == 'users':
            user_id = path_parts[2]
            
            if path_parts[3] == 'recommendations':
                # GET /v1/users/{userId}/recommendations
                if len(path_parts) == 4 and req.method == 'GET':
                    return handle_get_recommendations(user_id, headers)
                
                # POST /v1/users/{userId}/recommendations/recompute
                elif len(path_parts) == 5 and path_parts[4] == 'recompute' and req.method == 'POST':
                    return handle_recompute(user_id, req.get_json(), headers)
                
                # POST /v1/users/{userId}/recommendations/{generationId}/{recommendationId}/action
                elif len(path_parts) == 7 and path_parts[6] == 'action' and req.method == 'POST':
                    generation_id = path_parts[4]
                    recommendation_id = path_parts[5]
                    return handle_post_action(user_id, generation_id, recommendation_id, req.get_json(), headers)

        return https_fn.Response(jsonify({"error": "Not Found"}).get_data(), status=404, headers=headers, mimetype='application/json')

    except Exception as e:
        print(f"Error handling request: {e}")
        return https_fn.Response(jsonify({"error": str(e)}).get_data(), status=500, headers=headers, mimetype='application/json')

def is_generation_valid(user_id, generation_data):
    if not generation_data:
        return False
    
    # 1. TTL Check (6 hours)
    generated_at_str = generation_data.get('generatedAt')
    if not generated_at_str:
        return False
    
    try:
        generated_at = datetime.fromisoformat(generated_at_str.replace('Z', '+00:00'))
        age = datetime.now(timezone.utc) - generated_at

        if age > timedelta(hours=6):
            return False

        # Fix 5: 5-minute debounce — don't recompute on rapid successive logs
        if age < timedelta(minutes=5):
            return True
    except Exception:
        return False

    # 2. Fresh Data Check
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    
    # Check if any new relevant data exists after generated_at
    collections_to_check = ['meals', 'moods', 'symptoms']
    for coll_name in collections_to_check:
        latest = user_ref.collection(coll_name).order_by('occurredAt', direction=firestore.Query.DESCENDING).limit(1).get()
        if latest:
            latest_data = latest[0].to_dict()
            occurred_at_str = latest_data.get('occurredAt')
            if occurred_at_str:
                try:
                    occurred_at = datetime.fromisoformat(occurred_at_str.replace('Z', '+00:00'))
                    if occurred_at > generated_at:
                        return False
                except Exception:
                    pass
    
    return True

def get_feedback_history(user_id):
    """
    Reads persisted feedback from Firestore and returns two dicts used by the engine:

    latest_rejections  → {templateId: iso_timestamp}
        The most recent 'rejected' or 'dismissed' timestamp per template.
        The engine uses this to hard-suppress any template rejected < 24 h ago.

    rejection_rates    → {recommendationType: float}
        Fraction of total feedback events that were rejections/dismissals, per type.
        The engine uses this to penalise scores for types the user dislikes.
    """
    db = get_db()
    try:
        docs = db.collection('users').document(user_id) \
                 .collection('feedback_history') \
                 .order_by('actedAt', direction=firestore.Query.DESCENDING) \
                 .limit(50).get()
        history = [d.to_dict() for d in docs]
    except Exception as e:
        print(f"Warning: failed to load feedback history: {e}")
        return {}, {}

    latest_rejections = {}          # templateId → latest rejection timestamp
    type_counts: Dict[str, List[int]] = {}  # type → [total, rejected_count]

    for record in history:
        template_id = record.get('templateId')
        rec_type    = record.get('recommendationType', '')
        outcome     = record.get('outcome', '')
        acted_at    = record.get('actedAt', '')

        # Aggregate per recommendation type
        if rec_type:
            if rec_type not in type_counts:
                type_counts[rec_type] = [0, 0]
            type_counts[rec_type][0] += 1
            if outcome in ('rejected', 'dismissed'):
                type_counts[rec_type][1] += 1

        # Track the most recent rejection timestamp per template
        if outcome in ('rejected', 'dismissed') and template_id:
            existing = latest_rejections.get(template_id)
            if not existing or acted_at > existing:
                latest_rejections[template_id] = acted_at

    rejection_rates = {
        t: counts[1] / counts[0]
        for t, counts in type_counts.items()
        if counts[0] > 0
    }

    return latest_rejections, rejection_rates


def get_latest_insights(user_id):
    """Fetch the latest generated insights for a user."""
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    
    # Load latest insight generation
    gen_query = user_ref.collection('insight_generations')\
        .order_by('generatedAt', direction=firestore.Query.DESCENDING)\
        .limit(1).get()
    
    if not gen_query:
        return []
        
    latest_gen_doc = gen_query[0]
    
    # Fetch insights from subcollection
    insights_docs = latest_gen_doc.reference.collection('insights')\
        .order_by('confidenceScore', direction=firestore.Query.DESCENDING).get()
    
    return [doc.to_dict() for doc in insights_docs]

def handle_get_recommendations(user_id, headers):
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    
    # Load latest generation
    gen_query = user_ref.collection('recommendation_generations').order_by('generatedAt', direction=firestore.Query.DESCENDING).limit(1).get()
    
    if gen_query:
        latest_gen_doc = gen_query[0]
        latest_gen_data = latest_gen_doc.to_dict()
        latest_gen_data['id'] = latest_gen_doc.id
        
        if is_generation_valid(user_id, latest_gen_data):
            # Fetch recommendations from subcollection
            recs_docs = latest_gen_doc.reference.collection('recommendations').order_by('rank', direction=firestore.Query.ASCENDING).limit(5).get()
            recommendations = []
            for doc in recs_docs:
                r = doc.to_dict()
                r['id'] = doc.id
                recommendations.append(r)
            
            return https_fn.Response(jsonify({
                "generation": latest_gen_data,
                "recommendations": recommendations
            }).get_data(), status=200, headers=headers, mimetype='application/json')

    # Recompute if invalid or missing
    return handle_recompute(user_id, {"trigger": "manual_refresh"}, headers)

def handle_recompute(user_id, data, headers):
    trigger = data.get('trigger', 'manual_refresh')
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    
    # Fetch latest data for context
    user_profile = (user_ref.get().to_dict() or {})
    meals = [d.to_dict() for d in user_ref.collection('meals').order_by('occurredAt', direction=firestore.Query.DESCENDING).get()]
    moods = [d.to_dict() for d in user_ref.collection('moods').order_by('occurredAt', direction=firestore.Query.DESCENDING).get()]
    symptoms = [d.to_dict() for d in user_ref.collection('symptoms').order_by('occurredAt', direction=firestore.Query.DESCENDING).get()]

    patterns = run_pattern_engine(meals, moods, symptoms, user_profile=user_profile)

    # Fetch latest stable insights to inform recommendations
    latest_insights = get_latest_insights(user_id)

    # Load persisted feedback so the engine can suppress recently-rejected
    # templates and penalise types the user consistently dismisses.
    latest_rejections, rejection_rates = get_feedback_history(user_id)

    # Generate new recommendations
    new_recs = run_recommendation_engine(
        db,
        user_id,
        patterns,
        {"meals": meals, "moods": moods, "symptoms": symptoms},
        rejection_rates,
        latest_rejections,
        latest_insights,  # Pass stable insights to decision layer
        user_profile=user_profile,
    )

    # Create new generation doc
    generated_at = datetime.now(timezone.utc)
    gen_ref = user_ref.collection('recommendation_generations').document()
    
    input_summary = {
        "lastMealAt": meals[0].get('occurredAt') if meals else None,
        "lastMoodAt": moods[0].get('occurredAt') if moods else None,
        "lastSymptomAt": symptoms[0].get('occurredAt') if symptoms else None
    }
    
    gen_data = {
        "userId": user_id,
        "generatedAt": generated_at.isoformat().replace('+00:00', 'Z'),
        "trigger": trigger,
        "engineVersion": "2.0.0",
        "status": "completed",
        "recommendationCount": len(new_recs),
        "topRecommendationId": new_recs[0]['id'] if new_recs else None,
        "inputSummary": input_summary
    }
    
    batch = db.batch()
    batch.set(gen_ref, gen_data)
    
    # Store top 10 recommendations in subcollection
    for rec in new_recs[:10]:
        rec_id = rec['id']
        rec_ref = gen_ref.collection('recommendations').document(rec_id)
        # Add generation metadata to rec
        rec['generationId'] = gen_ref.id
        rec['userId'] = user_id
        batch.set(rec_ref, rec)
        
    batch.commit()
    
    gen_data['id'] = gen_ref.id
    return https_fn.Response(jsonify({
        "generation": gen_data,
        "recommendations": new_recs[:5] # Return top 5
    }).get_data(), status=200, headers=headers, mimetype='application/json')

def handle_post_action(user_id, generation_id, recommendation_id, data, headers):
    db = get_db()
    state = data.get('state')
    if not state:
        return https_fn.Response(jsonify({"error": "Missing state"}).get_data(), status=400, headers=headers, mimetype='application/json')

    user_ref = db.collection('users').document(user_id)
    rec_ref = user_ref.collection('recommendation_generations').document(generation_id).collection('recommendations').document(recommendation_id)
    
    action_data = {
        "state": state,
        "actedAt": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        "reasonCode": data.get('reasonCode'),
        "freeText": data.get('freeText')
    }
    
    rec_ref.update({"action": action_data})

    # Persist to feedback_history so future recomputes honour user preferences.
    # We look up the recommendation to get its templateId and type.
    try:
        rec_doc = rec_ref.get()
        if rec_doc.exists:
            rec_data = rec_doc.to_dict() or {}
            template_id = rec_data.get('templateId')
            rec_type    = rec_data.get('type')
            if template_id:
                user_ref.collection('feedback_history').add({
                    "templateId":         template_id,
                    "recommendationType": rec_type,
                    "outcome":            state,
                    "actedAt":            action_data["actedAt"],
                })
    except Exception as e:
        print(f"Warning: failed to persist feedback history: {e}")

    return https_fn.Response(jsonify({"ok": True}).get_data(), status=200, headers=headers, mimetype='application/json')
