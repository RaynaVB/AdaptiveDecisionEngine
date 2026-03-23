import requests
import json
import base64

API_KEY = "AIzaSyA6savTju84iknVG1tTkR9VsT_0Y7DzNaY"
MODELS = ["gemini-2.5-flash-lite"]

def test_api():
    headers = {
        "Content-Type": "application/json",
        "x-ios-bundle-identifier": "com.raynab.Veyra"
    }

    # tiny white pixel base64
    base64_img = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": "What is this image?"
                    },
                    {
                        "inline_data": {
                            "mime_type": "image/png",
                            "data": base64_img
                        }
                    }
                ]
            }
        ]
    }
        
    print("\nTesting Firebase ML API...")
    for MODEL in MODELS:
        FIREBASE_ML_URL = f"https://firebaseml.googleapis.com/v2beta/projects/adaptivehealthengine/locations/us-central1/publishers/google/models/{MODEL}:generateContent?key={API_KEY}"
        resp = requests.post(FIREBASE_ML_URL, headers=headers, json=payload)
        print(f"{MODEL} STATUS:", resp.status_code)
        if resp.status_code != 200:
            print(resp.text[:200])
        else:
            print(resp.json())

if __name__ == "__main__":
    test_api()
