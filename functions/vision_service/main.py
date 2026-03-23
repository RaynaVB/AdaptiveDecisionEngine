from firebase_functions import https_fn, options
import firebase_admin
from firebase_admin import credentials, firestore
from flask import jsonify
import json
import base64
import requests

# Initialize Firebase Admin
try:
    firebase_admin.initialize_app()
except ValueError:
    pass 

VALID_TAGS = [
    'light', 'regular', 'heavy',
    'sweet', 'savory', 'homemade', 'restaurant', 'packaged',
    'high_sugar', 'fried_greasy', 'high_protein', 'high_fiber', 'caffeinated'
]

API_KEY = "AIzaSyA6savTju84iknVG1tTkR9VsT_0Y7DzNaY"
MODEL = "gemini-2.5-flash-lite"
PROJECT = "adaptivehealthengine"
FIREBASE_ML_URL = f"https://firebaseml.googleapis.com/v2beta/projects/{PROJECT}/locations/us-central1/publishers/google/models/{MODEL}:generateContent?key={API_KEY}"

def handle_analyze_food(data, headers):
    base64_image = data.get('base64Image')
    mime_type = data.get('mimeType', 'image/jpeg')

    if not base64_image:
        return https_fn.Response(jsonify({"error": "Missing base64Image"}).get_data(), status=400, headers=headers, mimetype='application/json')

    try:
        prompt = f"""
            Analyze this food image for a medical-grade symptom tracking app. It is critical to identify ALL possible ingredients that could trigger symptoms (e.g., dairy, gluten, specific spices, oils, legumes).
            
            Provide the following structured data:
            1. isFood: boolean, true if the image is primarily of food.
            2. description: A brief summary of the meal.
            3. dishName: The specific name of the dish.
            4. visibleComponents: A comprehensive list of individual ingredients clearly seen in the image. Be specific.
            5. suggestedIngredients: A list of ingredients that are almost certainly present in this dish but not explicitly visible. Be exhaustive.
            6. tags: Select relevant tags from this exact list: [{', '.join(VALID_TAGS)}].
            7. potentialQuestions: 2-3 smart follow-up questions to clarify unknown ingredients or hidden components. 
               Format each question as an object: {{"id": "unique_id", "text": "Question text?"}}.
               IMPORTANT: Each question MUST be a Yes/No question. Use specific ingredient checks like "Was there any butter?" or "Does this contain dairy?" NOT "Was this A or B?".

            Return ONLY a strict JSON object. If isFood is false, the other fields can be empty/null, but still return the object.
        """

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": base64_image
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }

        # Need to include the bundle identifier header because of API key restrictions
        api_headers = {
            "Content-Type": "application/json",
            "x-ios-bundle-identifier": "com.raynab.Veyra"
        }

        resp = requests.post(FIREBASE_ML_URL, headers=api_headers, json=payload)
        
        if resp.status_code != 200:
            return https_fn.Response(jsonify({"error": f"Firebase ML API error: {resp.status_code}", "details": resp.text}).get_data(), status=500, headers=headers, mimetype='application/json')
            
        result_json = resp.json()
        
        # Parse content
        try:
            text_response = result_json['candidates'][0]['content']['parts'][0]['text']
            result_data = json.loads(text_response)
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            return https_fn.Response(jsonify({"error": "Failed to parse Gemini response", "raw": result_json}).get_data(), status=500, headers=headers, mimetype='application/json')
        
        # Filter tags
        safe_tags = [t for t in result_data.get('tags', []) if t in VALID_TAGS]
        result_data['tags'] = safe_tags

        return https_fn.Response(jsonify(result_data).get_data(), status=200, headers=headers, mimetype='application/json')

    except Exception as e:
        return https_fn.Response(jsonify({"error": str(e)}).get_data(), status=500, headers=headers, mimetype='application/json')

@https_fn.on_request(memory=options.MemoryOption.MB_512, invoker="public")
def vision_service(req: https_fn.Request) -> https_fn.Response:
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
        path = req.path.strip('/')
        if 'analyze-food' in path and req.method == 'POST':
            data = req.get_json()
            return handle_analyze_food(data, headers)

        return https_fn.Response(jsonify({"error": "Not Found"}).get_data(), status=404, headers=headers, mimetype='application/json')

    except Exception as e:
        return https_fn.Response(jsonify({"error": str(e)}).get_data(), status=500, headers=headers, mimetype='application/json')
