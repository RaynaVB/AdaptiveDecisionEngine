from firebase_functions import https_fn
import firebase_admin
from firebase_admin import credentials, firestore
from flask import jsonify, request
from recommender_engine import run_recommendation_engine
from pattern_engine import run_pattern_engine
from ml.bandit_model import ContextualBandit
from ml.context_builder import build_context_vector
from datetime import datetime

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
                if len(path_parts) == 4 and req.method == 'GET':
                    return handle_get_recommendations(user_id, headers)
                elif len(path_parts) == 6 and path_parts[5] == 'feedback' and req.method == 'POST':
                    recommendation_id = path_parts[4]
                    return handle_post_feedback(user_id, recommendation_id, req.get_json(), headers)

        return https_fn.Response(jsonify({"error": "Not Found"}).get_data(), status=404, headers=headers, mimetype='application/json')

    except Exception as e:
        print(f"Error handling request: {e}")
        return https_fn.Response(jsonify({"error": str(e)}).get_data(), status=500, headers=headers, mimetype='application/json')

def handle_get_recommendations(user_id, headers):
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    
    meals = [d.to_dict() for d in user_ref.collection('meals').order_by('occurredAt', direction=firestore.Query.DESCENDING).get()]
    moods = [d.to_dict() for d in user_ref.collection('moods').order_by('occurredAt', direction=firestore.Query.DESCENDING).get()]
    symptoms = [d.to_dict() for d in user_ref.collection('symptoms').order_by('occurredAt', direction=firestore.Query.DESCENDING).get()]

    patterns = run_pattern_engine(meals, moods, symptoms)

    rejection_rates = {}
    latest_rejections = {}
    
    feedback_docs = user_ref.collection('recommendation_feedback').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(100).get()
    
    type_counts = {}
    type_rejections = {}
    
    for doc in feedback_docs:
        f = doc.to_dict()
        rec_type = f.get('recommendationType')
        rec_id = f.get('recommendationId')
        outcome = f.get('outcome')
        
        if rec_type:
            type_counts[rec_type] = type_counts.get(rec_type, 0) + 1
            if outcome == 'rejected':
                type_rejections[rec_type] = type_rejections.get(rec_type, 0) + 1
        
        if rec_id and rec_id not in latest_rejections and outcome == 'rejected':
            latest_rejections[rec_id] = f.get('timestamp')

    for rec_type in type_counts:
        rejection_rates[rec_type] = type_rejections.get(rec_type, 0) / type_counts[rec_type]

    recs = run_recommendation_engine(
        db, 
        user_id, 
        patterns, 
        {"meals": meals, "moods": moods, "symptoms": symptoms},
        rejection_rates,
        latest_rejections
    )

    return https_fn.Response(jsonify(recs).get_data(), status=200, headers=headers, mimetype='application/json')

def handle_post_feedback(user_id, recommendation_id, data, headers):
    db = get_db()
    outcome = data.get('outcome')
    timestamp = data.get('timestamp', datetime.now().isoformat())
    recommendation_type = data.get('recommendationType')
    
    if not outcome:
        return https_fn.Response(jsonify({"error": "Missing outcome"}).get_data(), status=400, headers=headers, mimetype='application/json')

    user_ref = db.collection('users').document(user_id)
    feedback_ref = user_ref.collection('recommendation_feedback').document()
    feedback_data = {
        "recommendationId": recommendation_id,
        "recommendationType": recommendation_type,
        "outcome": outcome,
        "timestamp": timestamp,
        "userId": user_id,
        "createdAt": firestore.SERVER_TIMESTAMP
    }
    feedback_ref.set(feedback_data)

    bandit = ContextualBandit(db, user_id)
    
    try:
        target_time_ms = int(datetime.fromisoformat(timestamp.replace('Z', '+00:00')).timestamp() * 1000)
    except Exception:
        target_time_ms = int(datetime.now().timestamp() * 1000)

    moods = [d.to_dict() for d in user_ref.collection('moods').order_by('occurredAt', direction=firestore.Query.DESCENDING).limit(50).get()]
    context = build_context_vector(target_time_ms, moods)
    
    reward = 0.0
    if outcome == 'accepted_fully': reward = 1.0
    elif outcome == 'accepted_partially': reward = 0.5
    
    bandit.update(recommendation_id, context, reward)

    return https_fn.Response(jsonify({"ok": True}).get_data(), status=200, headers=headers, mimetype='application/json')
