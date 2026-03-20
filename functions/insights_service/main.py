from firebase_functions import https_fn
import firebase_admin
from firebase_admin import credentials, firestore
from flask import jsonify, request
from pattern_engine import run_pattern_engine
from datetime import datetime, timedelta, timezone

# Initialize Firebase Admin
try:
    firebase_admin.initialize_app()
except ValueError:
    pass # App already initialized

def get_db():
    return firestore.client()

@https_fn.on_request(invoker="public")
def insights_service(req: https_fn.Request) -> https_fn.Response:
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
        # GET /v1/users/{userId}/insights
        # POST /v1/users/{userId}/insights/recompute

        if len(path_parts) >= 4 and path_parts[0] == 'v1' and path_parts[1] == 'users':
            user_id = path_parts[2]
            
            if path_parts[3] == 'insights':
                # GET /v1/users/{userId}/insights
                if len(path_parts) == 4 and req.method == 'GET':
                    return handle_get_insights(user_id, headers)
                
                # POST /v1/users/{userId}/insights/recompute
                elif len(path_parts) == 5 and path_parts[4] == 'recompute' and req.method == 'POST':
                    return handle_recompute(user_id, req.get_json(), headers)

        return https_fn.Response(jsonify({"error": "Not Found"}).get_data(), status=404, headers=headers, mimetype='application/json')

    except Exception as e:
        print(f"Error handling request: {e}")
        return https_fn.Response(jsonify({"error": str(e)}).get_data(), status=500, headers=headers, mimetype='application/json')

def is_generation_valid(user_id, generation_data):
    if not generation_data:
        return False
    
    # 1. TTL Check (12 hours for insights, slightly longer than recommendations)
    generated_at_str = generation_data.get('generatedAt')
    if not generated_at_str:
        return False
    
    try:
        generated_at = datetime.fromisoformat(generated_at_str.replace('Z', '+00:00'))
        if datetime.now(timezone.utc) - generated_at > timedelta(hours=12):
            return False
    except Exception:
        return False
    
    return True

def handle_get_insights(user_id, headers):
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    
    # Load latest generation
    gen_query = user_ref.collection('insight_generations').order_by('generatedAt', direction=firestore.Query.DESCENDING).limit(1).get()
    
    if gen_query:
        latest_gen_doc = gen_query[0]
        latest_gen_data = latest_gen_doc.to_dict()
        latest_gen_data['id'] = latest_gen_doc.id
        
        if is_generation_valid(user_id, latest_gen_data):
            # Fetch insights from subcollection
            insights_docs = latest_gen_doc.reference.collection('insights').order_by('confidenceScore', direction=firestore.Query.DESCENDING).get()
            insights = []
            for doc in insights_docs:
                i = doc.to_dict()
                i['id'] = doc.id
                insights.append(i)
            
            return https_fn.Response(jsonify({
                "generation": latest_gen_data,
                "insights": insights
            }).get_data(), status=200, headers=headers, mimetype='application/json')

    # Recompute if invalid or missing
    return handle_recompute(user_id, {"trigger": "manual_refresh"}, headers)

def handle_recompute(user_id, data, headers):
    trigger = data.get('trigger', 'manual_refresh')
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    
    # Fetch latest data for context
    meals = [d.to_dict() for d in user_ref.collection('meals').order_by('occurredAt', direction=firestore.Query.DESCENDING).get()]
    moods = [d.to_dict() for d in user_ref.collection('moods').order_by('occurredAt', direction=firestore.Query.DESCENDING).get()]
    symptoms = [d.to_dict() for d in user_ref.collection('symptoms').order_by('occurredAt', direction=firestore.Query.DESCENDING).get()]

    new_insights = run_pattern_engine(meals, moods, symptoms)

    # Create new generation doc
    generated_at = datetime.now(timezone.utc)
    gen_ref = user_ref.collection('insight_generations').document()
    
    gen_data = {
        "userId": user_id,
        "generatedAt": generated_at.isoformat().replace('+00:00', 'Z'),
        "trigger": trigger,
        "engineVersion": "1.0.0",
        "status": "completed",
        "insightCount": len(new_insights)
    }
    
    batch = db.batch()
    batch.set(gen_ref, gen_data)
    
    for insight in new_insights:
        insight_id = insight['insightId']
        insight_ref = gen_ref.collection('insights').document(insight_id)
        insight['generationId'] = gen_ref.id
        insight['userId'] = user_id
        batch.set(insight_ref, insight)
        
    batch.commit()
    
    gen_data['id'] = gen_ref.id
    return https_fn.Response(jsonify({
        "generation": gen_data,
        "insights": new_insights
    }).get_data(), status=200, headers=headers, mimetype='application/json')
