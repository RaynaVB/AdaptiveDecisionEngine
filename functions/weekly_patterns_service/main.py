from firebase_functions import https_fn
import firebase_admin
from firebase_admin import credentials, firestore
from flask import jsonify, request
from datetime import datetime, timedelta, timezone
from generator import run_weekly_generator

# Initialize Firebase Admin
try:
    firebase_admin.initialize_app()
except ValueError:
    pass # App already initialized

def get_db():
    return firestore.client()

@https_fn.on_request(invoker="public")
def weekly_patterns_service(req: https_fn.Request) -> https_fn.Response:
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
        # GET /v1/users/{userId}/weekly
        # POST /v1/users/{userId}/weekly/recompute

        if len(path_parts) >= 4 and path_parts[0] == 'v1' and path_parts[1] == 'users':
            user_id = path_parts[2]
            
            if path_parts[3] == 'weekly':
                # GET /v1/users/{userId}/weekly
                if len(path_parts) == 4 and req.method == 'GET':
                    return handle_get_weekly(user_id, headers)
                
                # POST /v1/users/{userId}/weekly/recompute
                elif len(path_parts) == 5 and path_parts[4] == 'recompute' and req.method == 'POST':
                    return handle_recompute(user_id, req.get_json(), headers)

        return https_fn.Response(jsonify({"error": "Not Found"}).get_data(), status=404, headers=headers, mimetype='application/json')

    except Exception as e:
        print(f"Error handling request: {e}")
        return https_fn.Response(jsonify({"error": str(e)}).get_data(), status=500, headers=headers, mimetype='application/json')

def handle_get_weekly(user_id, headers):
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    
    # Load latest generation
    gen_query = user_ref.collection('weekly_generations').order_by('generatedAt', direction=firestore.Query.DESCENDING).limit(1).get()
    
    if gen_query:
        latest_gen_doc = gen_query[0]
        latest_gen_data = latest_gen_doc.to_dict()
        latest_gen_data['id'] = latest_gen_doc.id
        
        # Check if generation is still "fresh" (e.g., 24 hours)
        generated_at = datetime.fromisoformat(latest_gen_data['generatedAt'].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) - generated_at < timedelta(hours=24):
            # Fetch items from subcollection
            items_docs = latest_gen_doc.reference.collection('items').order_by('rank', direction=firestore.Query.ASCENDING).get()
            items = []
            for doc in items_docs:
                item = doc.to_dict()
                item['id'] = doc.id
                items.append(item)
            
            return https_fn.Response(jsonify({
                "generation": latest_gen_data,
                "items": items
            }).get_data(), status=200, headers=headers, mimetype='application/json')

    # Recompute if invalid or missing
    return handle_recompute(user_id, {"trigger": "manual_refresh"}, headers)

def handle_recompute(user_id, data, headers):
    trigger = data.get('trigger', 'manual_refresh')
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    
    # Fetch data for last 7 days
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=7)
    week_start_iso = week_start.isoformat().replace('+00:00', 'Z')
    
    meals = [d.to_dict() for d in user_ref.collection('meals').where('occurredAt', '>', week_start_iso).get()]
    moods = [d.to_dict() for d in user_ref.collection('moods').where('occurredAt', '>', week_start_iso).get()]
    symptoms = [d.to_dict() for d in user_ref.collection('symptoms').where('occurredAt', '>', week_start_iso).get()]

    # Fetch latest insights
    insights = []
    insight_gen_query = user_ref.collection('insight_generations').order_by('generatedAt', direction=firestore.Query.DESCENDING).limit(1).get()
    if insight_gen_query:
        insights_docs = insight_gen_query[0].reference.collection('insights').order_by('confidenceScore', direction=firestore.Query.DESCENDING).get()
        insights = [d.to_dict() for d in insights_docs]

    # Fetch active experiments
    experiments = [d.to_dict() for d in user_ref.collection('experiments').where('status', '==', 'active').get()]

    # Run Generator
    context_data = {"meals": meals, "moods": moods, "symptoms": symptoms}
    result = run_weekly_generator(user_id, context_data, insights, experiments)
    
    gen_data = result['generation']
    items = result['items']
    gen_data['trigger'] = trigger

    # Create new generation doc
    gen_ref = user_ref.collection('weekly_generations').document()
    
    batch = db.batch()
    batch.set(gen_ref, gen_data)
    
    for item in items:
        item_ref = gen_ref.collection('items').document()
        batch.set(item_ref, item)
        
    batch.commit()
    
    gen_data['id'] = gen_ref.id
    return https_fn.Response(jsonify({
        "generation": gen_data,
        "items": items
    }).get_data(), status=200, headers=headers, mimetype='application/json')
