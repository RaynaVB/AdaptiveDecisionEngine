# functions/pattern_alerts_service/main.py
from firebase_functions import https_fn
import firebase_admin
from firebase_admin import firestore
from flask import jsonify
from datetime import datetime, timedelta, timezone
import uuid

from detectors import (
    detect_energy_dip_streak,
    detect_mood_dip_pattern,
    detect_stress_spike,
    detect_symptom_streak,
)

# Initialize Firebase Admin
try:
    firebase_admin.initialize_app()
except ValueError:
    pass  # Already initialized


def get_db():
    return firestore.client()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _fetch_recent_events(user_ref, collection_name: str, days: int) -> list:
    """Fetch events from a user subcollection within the last `days` days."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat().replace("+00:00", "Z")
    docs = (
        user_ref.collection(collection_name)
        .where("occurredAt", ">=", cutoff)
        .order_by("occurredAt", direction=firestore.Query.DESCENDING)
        .get()
    )
    return [d.to_dict() for d in docs]


# ---------------------------------------------------------------------------
# HTTP entry point
# ---------------------------------------------------------------------------

@https_fn.on_request(invoker="public")
def pattern_alerts_service(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        cors_headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
        return https_fn.Response("", status=204, headers=cors_headers)

    headers = {"Access-Control-Allow-Origin": "*"}

    try:
        path_parts = req.path.strip("/").split("/")
        # Expected paths:
        # POST /v1/users/{userId}/pattern-alerts/scan
        # GET  /v1/users/{userId}/pattern-alerts

        if (
            len(path_parts) >= 4
            and path_parts[0] == "v1"
            and path_parts[1] == "users"
        ):
            user_id = path_parts[2]

            if path_parts[3] == "pattern-alerts":
                if len(path_parts) == 4 and req.method == "GET":
                    return handle_get_alerts(user_id, headers)
                if len(path_parts) == 5 and path_parts[4] == "scan" and req.method == "POST":
                    return handle_scan(user_id, headers)

        return https_fn.Response(
            jsonify({"error": "Not Found"}).get_data(),
            status=404, headers=headers, mimetype="application/json",
        )

    except Exception as e:
        print(f"[PatternAlerts] Unhandled error: {e}")
        return https_fn.Response(
            jsonify({"error": str(e)}).get_data(),
            status=500, headers=headers, mimetype="application/json",
        )


# ---------------------------------------------------------------------------
# Handle GET — return current active alerts
# ---------------------------------------------------------------------------

def handle_get_alerts(user_id: str, headers: dict) -> https_fn.Response:
    db = get_db()
    user_ref = db.collection("users").document(user_id)
    now_iso = _now_iso()

    docs = (
        user_ref.collection("pattern_alerts")
        .where("status", "==", "active")
        .where("expiresAt", ">", now_iso)
        .order_by("expiresAt", direction=firestore.Query.ASCENDING)
        .order_by("createdAt", direction=firestore.Query.DESCENDING)
        .get()
    )
    alerts = []
    for d in docs:
        data = d.to_dict()
        data["alertId"] = d.id
        alerts.append(data)

    return https_fn.Response(
        jsonify({"alerts": alerts}).get_data(),
        status=200, headers=headers, mimetype="application/json",
    )


# ---------------------------------------------------------------------------
# Handle POST /scan — run detectors and write new alerts
# ---------------------------------------------------------------------------

def handle_scan(user_id: str, headers: dict) -> https_fn.Response:
    db = get_db()
    user_ref = db.collection("users").document(user_id)

    # Fetch recent events (5-day window covers all detectors)
    moods    = _fetch_recent_events(user_ref, "moods",    days=5)
    symptoms = _fetch_recent_events(user_ref, "symptoms", days=5)

    # Run all 4 detectors — isolate failures so one broken detector
    # cannot prevent others from running.
    detector_results = []
    for detector_fn, data in [
        (detect_energy_dip_streak, moods),
        (detect_mood_dip_pattern,  moods),
        (detect_stress_spike,      moods),
        (detect_symptom_streak,    symptoms),
    ]:
        try:
            result = detector_fn(data)
            if result:
                detector_results.append(result)
        except Exception as exc:
            print(f"[PatternAlerts] detector {detector_fn.__name__} failed: {exc}")

    now_iso    = _now_iso()
    now_dt     = datetime.now(timezone.utc)
    expires_at = (now_dt + timedelta(hours=72)).isoformat().replace("+00:00", "Z")

    created = 0
    skipped = 0

    for result in detector_results:
        alert_type = result["type"]

        # Deduplication — skip if an active non-expired alert of the same type exists
        existing = (
            user_ref.collection("pattern_alerts")
            .where("type",     "==", alert_type)
            .where("status",   "==", "active")
            .where("expiresAt", ">", now_iso)
            .limit(1)
            .get()
        )
        if existing:
            skipped += 1
            continue

        alert_id = str(uuid.uuid4())
        doc_data = {
            "alertId":               alert_id,
            "userId":                user_id,
            "type":                  alert_type,
            "title":                 result["title"],
            "summary":               result["summary"],
            "suggestedExperimentId": result["suggestedExperimentId"],
            "evidence":              result["evidence"],
            "status":                "active",
            "createdAt":             now_iso,
            "expiresAt":             expires_at,
        }
        user_ref.collection("pattern_alerts").document(alert_id).set(doc_data)
        created += 1

    return https_fn.Response(
        jsonify({"created": created, "skipped": skipped}).get_data(),
        status=200, headers=headers, mimetype="application/json",
    )
