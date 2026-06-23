import requests, json, sys
url = 'http://localhost:8000/api/screen2/items/categories/'
payload = {"name": "TestCategory", "description": "A test category"}
try:
    r = requests.post(url, json=payload)
    print('Status:', r.status_code)
    print('Response:', r.text)
except Exception as e:
    print('Error:', e)
    sys.exit(1)
