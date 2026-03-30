import requests
import json

PROD_URL = "https://vision-service-n5p5ozwbwa-uc.a.run.app/v1/analyze-text"

def test_text_analysis(dish_name):
    print(f"\n--- Testing Transcription Analysis for: {dish_name} ---")
    
    payload = {
        "dishName": dish_name
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
    test_text_analysis("Chicken Tikka Masala")
    test_text_analysis("Avocado Toast")
