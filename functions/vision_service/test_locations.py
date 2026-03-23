import vertexai
from vertexai.generative_models import GenerativeModel
import requests

PROJECT = "adaptivehealthengine"
LOCATIONS = ["us-central1", "us-east4", "us-west1", "europe-west1"]
MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash-lite-001", "gemini-2.5-flash", "gemini-2.5-flash-001"]

print("Testing Vertex AI combination availability...")
for loc in LOCATIONS:
    print(f"\n--- Location: {loc} ---")
    vertexai.init(project=PROJECT, location=loc)
    
    for model_name in MODELS:
        try:
            model = GenerativeModel(model_name)
            resp = model.generate_content("Hello")
            print(f"✅ SUCCESS on Vertex AI: {model_name}. Response: {resp.text[:20]}")
            break # if one works in this location, great!
        except Exception as e:
            msg = str(e)
            if "not found" in msg or "Publisher Model" in msg or "404 POST" in msg:
                print(f"❌ NOT FOUND on Vertex AI: {model_name}")
            else:
                print(f"❌ ERROR on Vertex AI for {model_name}: {msg}")
