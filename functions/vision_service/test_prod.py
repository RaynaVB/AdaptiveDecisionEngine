import requests
import base64
import json
import os

PROD_URL = "https://vision-service-n5p5ozwbwa-uc.a.run.app/v1/analyze-food"

def test_prod_analysis(image_path):
    print(f"\n--- Testing Production URL for: {image_path} ---")
    if not os.path.exists(image_path):
        print(f"Error: File {image_path} not found.")
        return

    with open(image_path, "rb") as image_file:
        base64_image = base64.b64encode(image_file.read()).decode('utf-8')

    payload = {
        "base64Image": base64_image,
        "mimeType": "image/png" if image_path.endswith('.png') else "image/jpeg"
    }

    try:
        response = requests.post(PROD_URL, json=payload)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Success! Response JSON:")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Error Response: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    # Ensure we are in the right directory or provide full paths
    test_prod_analysis("burger.png")
    test_prod_analysis("pizza.png")
