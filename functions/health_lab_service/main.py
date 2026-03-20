# functions/health_lab_service/main.py
from firebase_functions import https_fn
import firebase_admin
from firebase_admin import credentials, firestore
from flask import jsonify, request
from datetime import datetime, timezone, timedelta
from experiment_library import EXPERIMENT_TEMPLATES
from logic import calculate_experiment_scores
from analytics import evaluate_real_time_result

# Initialize Firebase Admin
try:
    firebase_admin.initialize_app()
except ValueError:
    pass # App already initialized

def get_db():
    return firestore.client()

def fetch_user_data(user_id: str, start_date: datetime, end_date: datetime):
    """Fetches user meals, moods, and symptoms for a specific time range."""
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    
    start_iso = start_date.isoformat().replace('+00:00', 'Z')
    end_iso = end_date.isoformat().replace('+00:00', 'Z')
    
    data = {"meals": [], "moods": [], "symptoms": []}
    for coll in data.keys():
        docs = user_ref.collection(coll)\
            .where('occurredAt', '>=', start_iso)\
            .where('occurredAt', '<=', end_iso)\
            .get()
        data[coll] = [doc.to_dict() for doc in docs]
    
    return data

@https_fn.on_request(invoker="public")
def health_lab_service(req: https_fn.Request) -> https_fn.Response:
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
        # GET  /v1/users/{userId}/experiments/recommended
        # GET  /v1/users/{userId}/experiments/active
        # POST /v1/users/{userId}/experiments/start
        # POST /v1/users/{userId}/experiments/{experimentId}/complete

        if len(path_parts) >= 4 and path_parts[0] == 'v1' and path_parts[1] == 'users':
            user_id = path_parts[2]
            
            if path_parts[3] == 'experiments':
                if len(path_parts) == 5:
                    if path_parts[4] == 'recommended' and req.method == 'GET':
                        return handle_get_recommended(user_id, headers)
                    elif path_parts[4] == 'active' and req.method == 'GET':
                        return handle_get_active(user_id, headers)
                    elif path_parts[4] == 'start' and req.method == 'POST':
                        return handle_start_experiment(user_id, req.get_json(), headers)
                elif len(path_parts) == 6 and path_parts[5] == 'complete' and req.method == 'POST':
                    experiment_id = path_parts[4]
                    return handle_complete_experiment(user_id, experiment_id, headers)
                elif len(path_parts) == 6 and path_parts[5] == 'abandon' and req.method == 'POST':
                    experiment_id = path_parts[4]
                    return handle_abandon_experiment(user_id, experiment_id, headers)

        return https_fn.Response(jsonify({"error": "Not Found"}).get_data(), status=404, headers=headers, mimetype='application/json')

    except Exception as e:
        print(f"Error handling request: {e}")
        return https_fn.Response(jsonify({"error": str(e)}).get_data(), status=500, headers=headers, mimetype='application/json')

def handle_get_recommended(user_id, headers):
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    
    # 1. Fetch User Profile
    profile_doc = user_ref.get()
    user_profile = profile_doc.to_dict() if profile_doc.exists else {}

    # 2. Fetch Latest Insights
    insights = []
    gen_query = user_ref.collection('insight_generations').order_by('generatedAt', direction=firestore.Query.DESCENDING).limit(1).get()
    if gen_query:
        insights_docs = gen_query[0].reference.collection('insights').get()
        insights = [doc.to_dict() for doc in insights_docs]

    # 3. Fetch Active / Completed Experiments
    experiments_ref = user_ref.collection('experiments')
    active_docs = experiments_ref.where('status', '==', 'active').get()
    active_ids = [doc.to_dict().get('id') for doc in active_docs]
    
    completed_docs = experiments_ref.where('status', '==', 'completed').get()
    completed_ids = [doc.to_dict().get('id') for doc in completed_docs]

    # 4. Calculate Scores
    scored_experiments = calculate_experiment_scores(user_profile, insights, active_ids, completed_ids)

    return https_fn.Response(jsonify({
        "recommended": scored_experiments[:5]
    }).get_data(), status=200, headers=headers, mimetype='application/json')

def handle_get_active(user_id, headers):
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    
    active_docs = user_ref.collection('experiments').where('status', '==', 'active').get()
    active_experiments = []
    for doc in active_docs:
        exp = doc.to_dict()
        exp['runId'] = doc.id  # Keep firestore doc id separate
        # The template ID is already in exp['id']
        template_id = exp.get('id')
        template = next((t for t in EXPERIMENT_TEMPLATES if t['id'] == template_id), None)
        if template:
            exp['template'] = template
        active_experiments.append(exp)

    return https_fn.Response(jsonify({
        "active": active_experiments
    }).get_data(), status=200, headers=headers, mimetype='application/json')

def handle_start_experiment(user_id, data, headers):
    template_id = data.get('id') or data.get('templateId') # Support both for transition
    linked_insight_ids = data.get('linkedInsightIds', [])
    
    template = next((t for t in EXPERIMENT_TEMPLATES if t['id'] == template_id), None)
    if not template:
        return https_fn.Response(jsonify({"error": f"Template {template_id} not found"}).get_data(), status=404, headers=headers, mimetype='application/json')

    db = get_db()
    user_ref = db.collection('users').document(user_id)
    
    # Check if already active
    existing = user_ref.collection('experiments').where('id', '==', template_id).where('status', '==', 'active').limit(1).get()
    if existing:
        return https_fn.Response(jsonify({"error": "Experiment already active"}).get_data(), status=400, headers=headers, mimetype='application/json')

    now = datetime.now(timezone.utc)
    duration = template.get('durationDays', 5)
    ends_at = now + timedelta(days=duration)
    
    experiment_data = {
        "id": template_id,
        "status": "active",
        "startedAt": now.isoformat().replace('+00:00', 'Z'),
        "endsAt": ends_at.isoformat().replace('+00:00', 'Z'),
        "linkedInsightIds": linked_insight_ids,
        "progress": {
            "daysCompleted": 0,
            "adherenceScore": 1.0
        },
        "createdAt": now.isoformat().replace('+00:00', 'Z'),
        "updatedAt": now.isoformat().replace('+00:00', 'Z')
    }

    doc_ref = user_ref.collection('experiments').document()
    doc_ref.set(experiment_data)
    
    experiment_data['id'] = doc_ref.id
    return https_fn.Response(jsonify(experiment_data).get_data(), status=201, headers=headers, mimetype='application/json')

def handle_complete_experiment(user_id, experiment_id, headers):
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    exp_ref = user_ref.collection('experiments').document(experiment_id)
    
    exp_doc = exp_ref.get()
    if not exp_doc.exists:
        return https_fn.Response(jsonify({"error": "Experiment not found"}).get_data(), status=404, headers=headers, mimetype='application/json')

    exp_data = exp_doc.to_dict()
    if exp_data.get('status') != 'active':
        return https_fn.Response(jsonify({"error": "Experiment not active"}).get_data(), status=400, headers=headers, mimetype='application/json')

    # 1. Get Template
    template_id = exp_data.get('id')
    template = next((t for t in EXPERIMENT_TEMPLATES if t['id'] == template_id), None)
    if not template:
        return https_fn.Response(jsonify({"error": "Template not found"}).get_data(), status=404, headers=headers, mimetype='application/json')

    # 2. Define Windows
    now = datetime.now(timezone.utc)
    started_at = datetime.fromisoformat(exp_data['startedAt'].replace('Z', '+00:00'))
    
    baseline_window = template.get('baselineWindowDays', 7)
    baseline_start = started_at - timedelta(days=baseline_window)
    
    # 3. Fetch Data
    baseline_data = fetch_user_data(user_id, baseline_start, started_at)
    experiment_data = fetch_user_data(user_id, started_at, now)
    
    # 4. Evaluate Result
    metric_type = template.get('targetMetric', 'symptom_frequency')
    outcome, confidence_delta, summary = evaluate_real_time_result(baseline_data, experiment_data, metric_type)

    result_data = {
        "outcome": outcome,
        "confidenceDelta": confidence_delta,
        "summary": summary,
        "completedAt": now.isoformat().replace('+00:00', 'Z'),
        "metrics": {
            "baseline": get_metric_representative_value(baseline_data, metric_type),
            "experiment": get_metric_representative_value(experiment_data, metric_type)
        }
    }

    exp_ref.update({
        "status": "completed",
        "result": result_data,
        "updatedAt": now.isoformat().replace('+00:00', 'Z')
    })

    # Update insight confidence if linked
    linked_ids = exp_data.get('linkedInsightIds', [])
    if linked_ids and confidence_delta != 0:
        update_insights_confidence(user_id, linked_ids, confidence_delta)

    return https_fn.Response(jsonify({"ok": True, "result": result_data}).get_data(), status=200, headers=headers, mimetype='application/json')

def handle_abandon_experiment(user_id, experiment_id, headers):
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    exp_ref = user_ref.collection('experiments').document(experiment_id)
    
    exp_doc = exp_ref.get()
    if not exp_doc.exists:
        return https_fn.Response(jsonify({"error": "Experiment not found"}).get_data(), status=404, headers=headers, mimetype='application/json')

    now = datetime.now(timezone.utc)
    exp_ref.update({
        "status": "abandoned",
        "abandonedAt": now.isoformat().replace('+00:00', 'Z'),
        "updatedAt": now.isoformat().replace('+00:00', 'Z')
    })

    return https_fn.Response(jsonify({"ok": True}).get_data(), status=200, headers=headers, mimetype='application/json')

def get_metric_representative_value(data, metric_type):
    # Helper to just return the count or average for display in results
    if metric_type == "symptom_frequency":
        return len(data.get("symptoms", []))
    if metric_type == "symptom_severity":
        syms = data.get("symptoms", [])
        return sum(s.get("severity", 5) for s in syms) / len(syms) if syms else 0
    return 0

def update_insights_confidence(user_id, insight_ids, delta):
    db = get_db()
    user_ref = db.collection('users').document(user_id)
    
    # Find the latest generation and update the specific insights within it
    gen_query = user_ref.collection('insight_generations').order_by('generatedAt', direction=firestore.Query.DESCENDING).limit(1).get()
    if not gen_query:
        return
    
    gen_ref = gen_query[0].reference
    for iid in insight_ids:
        # Note: iid might be the document ID in the insights subcollection
        # In insights_service, we use insightId as the ID.
        insight_ref = gen_ref.collection('insights').document(iid)
        doc = insight_ref.get()
        if doc.exists:
            current_conf = doc.to_dict().get('confidenceScore', 0.5)
            new_conf = max(0.0, min(1.0, current_conf + delta))
            insight_ref.update({"confidenceScore": new_conf})
