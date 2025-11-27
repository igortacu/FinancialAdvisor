
import requests
import json

def test_forecast_api():
    base_url = "http://localhost:8091/forecast"
    params = {
        "user_id": "698841bd-189c-4407-b582-9d5fa2689336",
        "n": 30
    }
    
    try:
        print(f"Sending GET request to {base_url} with params: {params}")
        response = requests.get(base_url, params=params)
        
        if response.status_code == 200:
            data = response.json()
            print("\n✅ API Call Successful!")
            print("Response:")
            print(json.dumps(data, indent=2))
            
            # Basic validation
            if "values" in data and len(data["values"]) == 30:
                print("\n✅ Forecast length matches requested days (30).")
            else:
                print("\n❌ Forecast length mismatch.")
                
        else:
            print(f"\n❌ API Call Failed with status code: {response.status_code}")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print(f"\n❌ Could not connect to {base_url}. Is the server running?")

if __name__ == "__main__":
    test_forecast_api()
