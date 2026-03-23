import base64
import json
import os
from main import handle_analyze_food
from flask import Flask

# Mock request class to simulate Firebase https_fn.Request
class MockRequest:
    def __init__(self, json_data):
        self.json_data = json_data
    def get_json(self):
        return self.json_data

def test_image_analysis(image_path):
    print(f"\nTesting analysis for: {image_path}")
    if not os.path.exists(image_path):
        print(f"Error: File {image_path} not found.")
        return

    with open(image_path, "rb") as image_file:
        base64_image = base64.b64encode(image_file.read()).decode('utf-8')

    mock_req = MockRequest({
        "base64Image": base64_image,
        "mimeType": "image/png"
    })

    # We need a Flask app context to use jsonify if handle_analyze_food uses it via https_fn.Response
    # Actually, main.py uses flask.jsonify and returns https_fn.Response
    # Let's see if we can just call it.
    
    app = Flask(__name__)
    with app.app_context():
        try:
            response = handle_analyze_food(mock_req.get_json(), {})
            print(f"Status: {response.status}")
            print(f"Body: {response.get_data(as_text=True)}")
        except Exception as e:
            print(f"Exception during analysis: {e}")

if __name__ == "__main__":
    test_image_analysis("burger.png")
    test_image_analysis("pizza.png")
